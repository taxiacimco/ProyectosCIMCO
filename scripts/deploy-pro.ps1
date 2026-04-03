# ============================================================
#  DEPLOY PRO – TaxiA-CIMCO
# Sincroniza GitHub + Firebase + genera version.json
# Autor: Carlos Mario Fuentes García
# ============================================================

$root = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$frontendPath = "$root\frontend\public"
$functionsPath = "$root\functions"

# ===== 1️ Sincronización con GitHub =====
Write-Host ""
Write-Host " Sincronizando repositorio GitHub..." -ForegroundColor Cyan
Set-Location $root
git pull origin main

# ===== 2️ Limpieza y compilación =====
Write-Host ""
Write-Host "🧹 Limpiando proyecto..." -ForegroundColor Yellow
if (Test-Path "$root\limpiar-proyecto.ps1") {
    & "$root\limpiar-proyecto.ps1"
}

Write-Host ""
Write-Host " Compilando backend (TypeScript)..." -ForegroundColor Yellow
Set-Location $functionsPath
npm run build

# ===== 3️ Generar version.json =====
Write-Host ""
Write-Host " Generando archivo version.json..." -ForegroundColor Cyan
$versionFile = "$frontendPath\version.json"
$versionData = @{
    version = (Get-Date -Format "yyyy.MM.dd-HHmmss")
    author = "Carlos Mario Fuentes García"
    deployed = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
}
$versionData | ConvertTo-Json | Set-Content -Path $versionFile -Encoding UTF8
Write-Host " version.json generado en: $versionFile" -ForegroundColor Green

# ===== 4️ Commit y Push =====
Write-Host ""
Write-Host " Commit y Push a GitHub..." -ForegroundColor Yellow
Set-Location $root
git add .
$commitMessage = " Auto-deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git commit -m $commitMessage
git push origin main

# ===== 5️ Deploy a Firebase =====
Write-Host ""
Write-Host " Desplegando a Firebase..." -ForegroundColor Cyan
firebase deploy --only 'functions,hosting'

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " DEPLOY PRO COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host " Versión registrada en version.json" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
