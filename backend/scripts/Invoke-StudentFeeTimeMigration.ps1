# Applies only the reviewed fee-time migration, with validation before the outer transaction commits.
# Default is read-only preflight. Example: -Apply -Campus local, or -Apply for all configured campuses.
param(
    [string[]] $Campus = @(),
    [switch] $Apply,
    [string] $MigrationSql = (Join-Path $PSScriptRoot '../../docs/fee-time-migration.sql')
)
$ErrorActionPreference = 'Stop'
$migrationId = '20261120081703_AddStudentFeeTime'
$baselineId = '20261111105529_AddCleanSheetBonus'
$campuses = @{}
foreach ($name in @('appsettings.json', 'appsettings.Development.json')) {
    $path = Join-Path $PSScriptRoot "../School.API/$name"
    if (Test-Path -LiteralPath $path) {
        $config = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
        if ($config.CampusSettings.Campuses) {
            foreach ($property in $config.CampusSettings.Campuses.PSObject.Properties) {
                $campuses[$property.Name] = [string]$property.Value
            }
        }
    }
}
Get-ChildItem Env: | Where-Object Name -match '^CampusSettings(:|__)Campuses(:|__)' | ForEach-Object {
    $key = ($_.Name -split ':|__')[-1]
    $campuses[$key] = $_.Value
}
foreach ($key in $Campus) { if (-not $campuses.ContainsKey($key)) { throw "Unknown campus: $key" } }
$keys = @($campuses.Keys | Where-Object { $Campus.Count -eq 0 -or $_ -in $Campus } | Sort-Object)
if ($keys.Count -eq 0) { throw 'No campuses selected.' }
$sql = Get-Content -LiteralPath $MigrationSql -Raw
if (-not $sql.Contains($migrationId)) { throw 'The SQL file does not contain the expected migration.' }
$batches = @([regex]::Split($sql, '(?im)^\s*GO\s*\r?$') | Where-Object { $_.Trim() })

function New-Command($connection, [string] $text, $transaction = $null) {
    $command = $connection.CreateCommand()
    $command.CommandText = $text
    $command.CommandTimeout = 120
    $command.Transaction = $transaction
    return $command
}
function Execute-Sql($connection, [string] $text, $transaction) {
    $command = New-Command $connection $text $transaction
    try { $null = $command.ExecuteNonQuery() } finally { $command.Dispose() }
}

# Preflight every selected target before making any change.
foreach ($key in $keys) {
    $connection = New-Object System.Data.SqlClient.SqlConnection $campuses[$key]
    try {
        $connection.Open()
        $command = New-Command $connection @"
IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId=N'$migrationId')
BEGIN
 IF (SELECT MAX(MigrationId) FROM dbo.__EFMigrationsHistory) <> N'$baselineId'
    THROW 51001, 'Unexpected migration baseline. Review pending migrations before continuing.', 1;
 IF COL_LENGTH('dbo.tblStudent','FeeTime') IS NOT NULL OR COL_LENGTH('dbo.tblStudent','FeeTimeUpdatedAtPkt') IS NOT NULL
    THROW 51001, 'Fee-time columns exist without migration history. Review partial schema first.', 1;
END
ELSE IF ISNULL(COL_LENGTH('dbo.tblStudent','FeeTime'),-1) <> 1000 OR COL_LENGTH('dbo.tblStudent','FeeTimeUpdatedAtPkt') IS NULL
    THROW 51001, 'Applied migration has an unexpected schema.', 1;
IF EXISTS (SELECT 1 FROM dbo.tblStudent s CROSS APPLY (
 SELECT TOP(1) l.[Description] FROM dbo.tblStudentLog l
 WHERE l.StudentID=s.Reg_Id AND l.[Type]=N'fee_time' ORDER BY l.[Date] DESC,l.ID DESC
) l WHERE DATALENGTH(l.[Description]) > 1000 AND NULLIF(LTRIM(RTRIM(l.[Description])),N'') IS NOT NULL)
 THROW 51001, 'Overlong legacy text requires review.', 1;
SELECT DB_NAME();
"@
        try { $database = $command.ExecuteScalar() } finally { $command.Dispose() }
        Write-Output "PREFLIGHT OK: $key / $database"
    }
    finally { $connection.Dispose() }
}
if (-not $Apply) { Write-Output 'Read-only preflight complete. Use -Apply to execute.'; return }

foreach ($key in $keys) {
    $connection = New-Object System.Data.SqlClient.SqlConnection $campuses[$key]
    try {
        $connection.Open()
        $command = New-Command $connection "SELECT COUNT(*) FROM dbo.__EFMigrationsHistory WHERE MigrationId=N'$migrationId'"
        try { $alreadyApplied = [int]$command.ExecuteScalar() -eq 1 } finally { $command.Dispose() }
        if ($alreadyApplied) { Write-Output "ALREADY APPLIED: $key"; continue }
        $transaction = $connection.BeginTransaction([System.Data.IsolationLevel]::Serializable)
        try {
            Execute-Sql $connection @"
SET LOCK_TIMEOUT 15000;
SET XACT_ABORT ON;
IF (SELECT MAX(MigrationId) FROM dbo.__EFMigrationsHistory) <> N'$baselineId'
 THROW 51001, 'Migration history changed since preflight.', 1;
SELECT s.Reg_Id,s.Fee,s.TutionFee,s.FeeConcession,
 CASE WHEN NULLIF(LTRIM(RTRIM(l.[Description])),N'') IS NULL THEN NULL ELSE l.[Description] END AS FeeTime,
 CONVERT(datetime2(3),l.[Date]) AS UpdatedAt
INTO #ExpectedFeeTimes
FROM dbo.tblStudent s
OUTER APPLY (SELECT TOP(1) sl.[Description],sl.[Date] FROM dbo.tblStudentLog sl
 WHERE sl.StudentID=s.Reg_Id AND sl.[Type]=N'fee_time' ORDER BY sl.[Date] DESC,sl.ID DESC) l;
SELECT ID,[Date],StudentID,[Type],[Description] INTO #LegacyFeeTimes
FROM dbo.tblStudentLog WHERE [Type]=N'fee_time';
"@ $transaction
            foreach ($batch in $batches) { Execute-Sql $connection $batch $transaction }
            Execute-Sql $connection @"
IF (SELECT COUNT(*) FROM dbo.tblStudent) <> (SELECT COUNT(*) FROM #ExpectedFeeTimes)
 THROW 51001, 'Student count changed.', 1;
IF EXISTS (SELECT 1 FROM dbo.tblStudent s JOIN #ExpectedFeeTimes e ON e.Reg_Id=s.Reg_Id
 WHERE ISNULL(HASHBYTES('SHA2_256',s.FeeTime),0x) <> ISNULL(HASHBYTES('SHA2_256',e.FeeTime),0x)
 OR s.FeeTimeUpdatedAtPkt <> e.UpdatedAt
 OR (s.FeeTimeUpdatedAtPkt IS NULL AND e.UpdatedAt IS NOT NULL)
 OR (s.FeeTimeUpdatedAtPkt IS NOT NULL AND e.UpdatedAt IS NULL))
 THROW 51001, 'Fee-time backfill verification failed.', 1;
IF EXISTS (SELECT Reg_Id,Fee,TutionFee,FeeConcession FROM dbo.tblStudent EXCEPT
 SELECT Reg_Id,Fee,TutionFee,FeeConcession FROM #ExpectedFeeTimes)
 THROW 51001, 'Student fees changed.', 1;
IF EXISTS (SELECT * FROM #LegacyFeeTimes EXCEPT
 SELECT ID,[Date],StudentID,[Type],[Description] FROM dbo.tblStudentLog WHERE [Type]=N'fee_time') OR
 EXISTS (SELECT ID,[Date],StudentID,[Type],[Description] FROM dbo.tblStudentLog WHERE [Type]=N'fee_time' EXCEPT
 SELECT * FROM #LegacyFeeTimes)
 THROW 51001, 'Legacy fee-time logs changed.', 1;
IF (SELECT COUNT(*) FROM dbo.__EFMigrationsHistory WHERE MigrationId=N'$migrationId') <> 1
 THROW 51001, 'Migration history verification failed.', 1;
"@ $transaction
            $command = New-Command $connection "SELECT COUNT(*) FROM dbo.tblStudent WHERE FeeTime IS NOT NULL" $transaction
            try { $copied = $command.ExecuteScalar() } finally { $command.Dispose() }
            $transaction.Commit()
            Write-Output "APPLIED AND VERIFIED: $key / $($connection.Database) / $copied defined fee times"
        }
        catch {
            try { $transaction.Rollback() } catch { }
            throw
        }
        finally { $transaction.Dispose() }
    }
    finally { $connection.Dispose() }
}
