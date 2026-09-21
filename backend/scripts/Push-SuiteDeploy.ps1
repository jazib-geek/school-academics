# Push backend and/or frontend subtrees to Suite API/UI repos (triggers Plesk CD).
# See backend/DEPLOY.md — always verify Actions after push.

param(
    [switch] $Api,
    [switch] $Ui
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Push-Location $repoRoot

if (-not $Api -and -not $Ui) {
    Write-Host "Specify -Api and/or -Ui. Example: .\backend\scripts\Push-SuiteDeploy.ps1 -Api"
    exit 1
}

try {
    if ($Api) {
        Write-Host "Splitting backend subtree..."
        git subtree split --prefix=backend -b api-release-push | Out-Null
        git push suite-api api-release-push:master
        Write-Host "API push done. Verify: https://github.com/jazib-geek/SoftelligentSchoolSuitePro-API/actions"
    }
    if ($Ui) {
        Write-Host "Splitting frontend subtree..."
        git subtree split --prefix=frontend -b frontend-ui-release | Out-Null
        git push suite-ui frontend-ui-release:master
        Write-Host "UI push done. Verify: https://github.com/jazib-geek/SoftelligentSchoolSuitePro-UI/actions"
    }
}
finally {
    Pop-Location
}
