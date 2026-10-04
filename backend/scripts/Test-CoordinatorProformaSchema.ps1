# Checks the real SQL constraints inside a rolled-back transaction. Never targets a remote server.
$ErrorActionPreference = 'Stop'
$backendPath = Split-Path -Parent $PSScriptRoot
$connectionString = $null
foreach ($name in @('appsettings.json', 'appsettings.Development.json')) {
    $path = Join-Path $backendPath "School.API/$name"
    if (Test-Path -LiteralPath $path) {
        $config = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
        if ($config.CampusSettings.Campuses.local) {
            $connectionString = $config.CampusSettings.Campuses.local
        }
    }
}
$overrides = @(Get-ChildItem Env: | Where-Object Name -match '^CampusSettings(:|__)Campuses(:|__)local$')
if ($overrides.Count -gt 1) { throw 'Ambiguous local connection overrides.' }
if ($overrides.Count -eq 1) { $connectionString = $overrides[0].Value }
if (-not $connectionString) { throw 'No local campus connection is configured.' }

$builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder $connectionString
$server = $builder.DataSource
$localServer = $server -match ('^(\.|localhost|127\.0\.0\.1|' + [regex]::Escape($env:COMPUTERNAME) + ')(\\[^\\,]+)?$')
if (-not $localServer -or -not $builder.InitialCatalog) {
    throw 'Schema checks require a named database on a verified local SQL Server.'
}
Write-Output "Testing local schema: $server / $($builder.InitialCatalog)"
$connection = New-Object System.Data.SqlClient.SqlConnection $connectionString
try {
    $connection.Open()
    $command = $connection.CreateCommand()
    $command.CommandTimeout = 60
    $command.CommandText = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'Test-CoordinatorProformaSchema.sql') -Raw -Encoding UTF8
    Write-Output $command.ExecuteScalar()
    $command.Dispose()
}
finally {
    $connection.Dispose()
}
