<#
============================================================
 🚀 TAXIA CIMCO - PUBLICADOR DE PANEL MONITOR QA
============================================================
Autor: Carlos Mario Fuentes García
Proyecto: TAXIA CIMCO Backend
Infraestructura: Firebase (Hosting QA)
Fecha: Noviembre 2025
------------------------------------------------------------
Este script publica automáticamente el panel web de monitoreo QA
desde la carpeta del backend hacia Firebase Hosting.
#>

# ========== CONFIGURACIÓN ==========
$backendPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO\taxia_cimco_backend"
$monitorPath = "$backendPath\monitor"
$projectId = "pelagic-chalice-467818-e1-test"
$logFile = "$backendPath\monitor\logs\deploy_monitor_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " 🚀 TAXIA CIMCO - PUBLICADOR DEL MONITOR WEB (QA)" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# ========== PASO 1: Verificar Firebase CLI ==========
Write-Host "🔍 Verificando Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = firebase --version 2>$null
if (-not $firebaseVersion) {
    Write-Host "❌ Firebase CLI no detectada. Instálala con:" -ForegroundColor Red
    Write-Host "   npm install -g firebase-tools" -ForegroundColor White
    exit 1
}
Write-Host "✅ Firebase CLI detectada (v$firebaseVersion)" -ForegroundColor Green

# ========== PASO 2: Verificar sesión ==========
Write-Host "🔐 Verificando sesión activa..." -ForegroundColor Yellow
$loginCheck = firebase login:list 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ No hay sesión activa. Ejecutando firebase login..." -ForegroundColor Yellow
    firebase login
} else {
    Write-Host "✅ Sesión activa detectada." -ForegroundColor Green
}

# ========== PASO 3: Verificar carpeta monitor ==========
Write-Host ""
Write-Host "📂 Preparando archivos del panel de monitoreo..." -ForegroundColor Yellow
if (-not (Test-Path $monitorPath)) {
    Write-Host "❌ Carpeta monitor no encontrada en el backend ($monitorPath)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Carpeta monitor detectada." -ForegroundColor Green

# ========== PASO 4: Publicar en Firebase Hosting ==========
Write-Host ""
Write-Host "🚀 Desplegando panel QA en Firebase Hosting..." -ForegroundColor Yellow
Write-Host "   Proyecto: $projectId" -ForegroundColor Cyan

try {
    firebase deploy --only hosting:$projectId-panel-test --project $projectId --message "🚀 Auto-Deploy Panel Monitor QA" 2>&1 | Tee-Object -FilePath $logFile
    Write-Host "✅ Despliegue completado correctamente." -ForegroundColor Green
    Write-Host "🗂️ Log del despliegue guardado en:" -ForegroundColor Cyan
    Write-Host "   $logFile" -ForegroundColor White
} catch {
    Write-Host "❌ Error durante el despliegue: $($_.Exception.Message)" -ForegroundColor Red
}

# ========== PASO 5: Confirmación ==========
Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " ✅ PANEL MONITOR QA PUBLICADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 URL de verificación:" -ForegroundColor Yellow
Write-Host "👉 https://pelagic-chalice-467818-e1-test.web.app/monitor" -ForegroundColor Cyan
Write-Host ""
