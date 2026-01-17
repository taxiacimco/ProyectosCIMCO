# 🚀 Script visual para iniciar entorno PRODUCCIÓN de CIMCO
Clear-Host
$Host.UI.RawUI.WindowTitle = "🚀 CIMCO — Entorno PRODUCCIÓN"

Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "     🌎  Desplegando entorno PRODUCCIÓN" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Yellow
Start-Sleep -Seconds 1

# Cambiar al directorio actual del script
Set-Location -Path $PSScriptRoot

# Cargar variables de producción
if (Test-Path ".env.production") {
    Copy-Item ".env.production" ".env" -Force
    Write-Host "✅ Archivo .env.production cargado correctamente." -ForegroundColor Yellow
} else {
    Write-Host "❌ No se encontró el archivo .env.production" -ForegroundColor Red
    exit
}

# Instalar dependencias si es necesario
if (Test-Path "package.json") {
    Write-Host "`n📦 Verificando dependencias..." -ForegroundColor Blue
    npm install | Out-Null
}

Write-Host "`n🚀 Desplegando funciones en Firebase PRODUCCIÓN..." -ForegroundColor Green
Start-Sleep -Seconds 1
firebase deploy --only functions
