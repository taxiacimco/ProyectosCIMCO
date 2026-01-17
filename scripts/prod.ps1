# prod.ps1 - Orquesta precheck + hosting-deploy
$Root = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
Set-Location $Root

Write-Host "Iniciando flujo PROD..." -ForegroundColor Cyan

# Precheck
& .\scripts\prod-precheck.ps1
if ($LASTEXITCODE -ne 0) { Write-Host "Precheck falló" -ForegroundColor Red; exit 1 }

# Deploy hosting
& .\scripts\hosting-deploy.ps1
if ($LASTEXITCODE -ne 0) { Write-Host "Hosting deploy falló" -ForegroundColor Red; exit 1 }

Write-Host "Flujo PROD completado." -ForegroundColor Green
exit 0
