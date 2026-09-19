# Applies pending EF Core migrations to AcademicContext + every CampusSettings:Campuses entry.
#
# Usage (from repo root):
#   powershell -File backend/scripts/Update-AllCampusDatabases.ps1
#
# Single campus:
#   powershell -File backend/scripts/Update-AllCampusDatabases.ps1 -Campus local
#
# Academic DB only:
#   powershell -File backend/scripts/Update-AllCampusDatabases.ps1 -AcademicOnly

param(
    [string[]] $Campus = @(),
    [switch] $AcademicOnly,
    [switch] $CampusOnly
)

$ErrorActionPreference = 'Stop'
$migratorProject = Join-Path $PSScriptRoot '..\School.Migrator\School.Migrator.csproj' | Resolve-Path

$argsList = @()

if ($AcademicOnly) {
    $argsList += '--academic-only'
}

if ($CampusOnly) {
    $argsList += '--campus-only'
}

foreach ($campusKey in $Campus) {
    if (-not [string]::IsNullOrWhiteSpace($campusKey)) {
        $argsList += '--campus'
        $argsList += $campusKey
    }
}

Write-Host 'Running School.Migrator...' -ForegroundColor Cyan
if ($argsList.Count -gt 0) {
    Write-Host ("Args: " + ($argsList -join ' ')) -ForegroundColor DarkGray
}

dotnet run --project $migratorProject -- @argsList
if ($LASTEXITCODE -ne 0) {
    throw 'Database migration failed.'
}

Write-Host 'All selected databases updated.' -ForegroundColor Green
