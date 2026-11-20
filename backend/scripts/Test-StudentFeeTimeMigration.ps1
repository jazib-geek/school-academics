# Runs the exact generated migration SQL on local SQL Server inside rolled-back transactions.
param([string] $MigrationSql = (Join-Path $PSScriptRoot '../../docs/fee-time-migration.sql'))
$ErrorActionPreference = 'Stop'
$connectionString = $null
foreach ($name in @('appsettings.json', 'appsettings.Development.json')) {
    $path = Join-Path $PSScriptRoot "../School.API/$name"
    if (Test-Path -LiteralPath $path) {
        $config = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
        if ($config.CampusSettings.Campuses.local) { $connectionString = $config.CampusSettings.Campuses.local }
    }
}
$overrides = @(Get-ChildItem Env: | Where-Object Name -match '^CampusSettings(:|__)Campuses(:|__)local$')
if ($overrides.Count -gt 1) { throw 'Ambiguous local connection overrides.' }
if ($overrides.Count -eq 1) { $connectionString = $overrides[0].Value }
$builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder $connectionString
if ($builder.DataSource -notmatch ('^(\.|localhost|127\.0\.0\.1|' + [regex]::Escape($env:COMPUTERNAME) + ')(\\[^\\,]+)?$')) {
    throw 'Migration tests require verified local SQL Server.'
}
$sql = Get-Content -LiteralPath $MigrationSql -Raw
$batches = [regex]::Split($sql, '(?im)^\s*GO\s*\r?$') | Where-Object { $_.Trim() }
$connection = New-Object System.Data.SqlClient.SqlConnection $connectionString
function Execute-Sql([string] $text, $transaction) {
    $command = $connection.CreateCommand()
    $command.CommandTimeout = 90
    $command.Transaction = $transaction
    $command.CommandText = $text
    try { $null = $command.ExecuteNonQuery() } finally { $command.Dispose() }
}
try {
    $connection.Open()
    Execute-Sql @'
IF COL_LENGTH('dbo.tblStudent','FeeTime') IS NOT NULL
    THROW 51001, 'Run this rehearsal before applying the fee-time migration locally.', 1;
IF EXISTS (SELECT 1 FROM dbo.tblStudent WHERE Reg_Id BETWEEN 2147483001 AND 2147483005)
    THROW 51001, 'Migration fixture IDs already exist.', 1;
'@ $null
    $transaction = $connection.BeginTransaction()
    try {
        Execute-Sql @'
INSERT INTO dbo.tblStudent (Reg_Id, FullName)
VALUES (2147483001,N'Fee-time test A'),(2147483002,N'Fee-time test B'),
       (2147483003,N'Fee-time test C'),(2147483004,N'Fee-time test D');
INSERT INTO dbo.tblStudentLog (StudentID,[Type],[Description],[Date]) VALUES
 (2147483001,N'fee_time',N'old','2020-01-01'),
 (2147483001,N'fee_time',N'first tie','2025-01-01'),
 (2147483001,N'fee_time',N'last tie','2025-01-01'),
 (2147483001,N'other',N'ignore','2026-01-01'),
 (2147483002,N'fee_time',N'undated first',NULL),
 (2147483002,N'fee_time',N'undated last',NULL),
 (2147483003,N'fee_time',N'previous value','2020-01-01'),
 (2147483003,N'fee_time',N'   ','2025-01-01'),
 (2147483005,N'fee_time',N'orphan','2025-01-01');
SELECT s.Reg_Id, s.Fee, s.TutionFee, s.FeeConcession,
    CASE WHEN NULLIF(LTRIM(RTRIM(l.[Description])),N'') IS NULL THEN NULL ELSE l.[Description] END AS FeeTime,
    CONVERT(datetime2(3),l.[Date]) AS UpdatedAt
INTO #ExpectedFeeTimes
FROM dbo.tblStudent s
OUTER APPLY (SELECT TOP(1) sl.[Description],sl.[Date] FROM dbo.tblStudentLog sl
    WHERE sl.StudentID=s.Reg_Id AND sl.[Type]=N'fee_time' ORDER BY sl.[Date] DESC,sl.ID DESC) l;
SELECT COUNT(*) AS LegacyCount INTO #LegacyCount FROM dbo.tblStudentLog;
'@ $transaction
        foreach ($batch in $batches) { Execute-Sql $batch $transaction }
        Execute-Sql @'
IF EXISTS (
 SELECT Reg_Id,Fee,TutionFee,FeeConcession,FeeTime,FeeTimeUpdatedAtPkt FROM dbo.tblStudent
 EXCEPT SELECT Reg_Id,Fee,TutionFee,FeeConcession,FeeTime,UpdatedAt FROM #ExpectedFeeTimes
) OR EXISTS (
 SELECT Reg_Id,Fee,TutionFee,FeeConcession,FeeTime,UpdatedAt FROM #ExpectedFeeTimes
 EXCEPT SELECT Reg_Id,Fee,TutionFee,FeeConcession,FeeTime,FeeTimeUpdatedAtPkt FROM dbo.tblStudent
) THROW 51001, 'Backfill changed student data or did not preserve the expected values/dates.', 1;
IF (SELECT FeeTime FROM dbo.tblStudent WHERE Reg_Id=2147483001) <> N'last tie'
 THROW 51001, 'Date/ID ordering failed.', 1;
IF (SELECT FeeTime FROM dbo.tblStudent WHERE Reg_Id=2147483002) <> N'undated last'
 THROW 51001, 'Undated entry ordering failed.', 1;
IF EXISTS (SELECT 1 FROM dbo.tblStudent WHERE Reg_Id IN (2147483003,2147483004) AND FeeTime IS NOT NULL)
 THROW 51001, 'Blank or missing legacy values should remain undefined.', 1;
IF (SELECT COUNT(*) FROM dbo.tblStudentLog) <> (SELECT LegacyCount FROM #LegacyCount)
 THROW 51001, 'Legacy logs were changed.', 1;
'@ $transaction
        Write-Output 'PASS: values/dates preserved; duplicate/date ties, undated, blank, missing and orphan entries handled; fees and legacy logs unchanged.'
    }
    finally { $transaction.Rollback(); $transaction.Dispose() }

    $transaction = $connection.BeginTransaction()
    $rejected = $false
    try {
        Execute-Sql @'
INSERT INTO dbo.tblStudent (Reg_Id,FullName) VALUES (2147483001,N'Fee-time length test');
INSERT INTO dbo.tblStudentLog (StudentID,[Type],[Description],[Date])
VALUES (2147483001,N'fee_time',REPLICATE(N'x',501),'2025-01-01');
'@ $transaction
        try { foreach ($batch in $batches) { Execute-Sql $batch $transaction } }
        catch {
            if ($_.Exception.InnerException.Number -ne 51000) { throw }
            $rejected = $true
        }
        if (-not $rejected) { throw 'Overlong legacy text was not rejected.' }
        Write-Output 'PASS: overlong legacy text rejects the migration rather than truncating data.'
    }
    finally {
        try { $transaction.Rollback() } catch { if (-not $rejected) { throw } }
        $transaction.Dispose()
    }
    Execute-Sql @'
IF COL_LENGTH('dbo.tblStudent','FeeTime') IS NOT NULL OR
   EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId=N'20261120081703_AddStudentFeeTime') OR
   EXISTS (SELECT 1 FROM dbo.tblStudent WHERE Reg_Id BETWEEN 2147483001 AND 2147483005)
 THROW 51001, 'Migration rehearsal did not roll back fully.', 1;
'@ $null
    Write-Output 'PASS: schema, migration history and all fixtures rolled back.'
}
finally { $connection.Dispose() }
