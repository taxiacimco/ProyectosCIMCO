<#
===================================================================
 🚀 TAXIA CIMCO - DESPLIEGUE CORPORATIVO TOTAL (QA + PRODUCCIÓN)
===================================================================
Autor: Carlos Mario Fuentes García
Proyecto: TAXIA CIMCO Backend
Infraestructura: Firebase (Functions + Hosting)
Fecha: Noviembre 2025
-------------------------------------------------------------------
Ejecuta en secuencia:
 1️⃣ Despliegue QA
 2️⃣ Despliegue Producción
 3️⃣ Notificación sonora + visual final
-------------------------------------------------------------------
#>

# ========== CONFIGURACIÓN ==========
$rootPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$scriptsPath = "$rootPath\scripts"
$backendPath = "$rootPath\taxia_cimco_backend"
$logsPath = "$backendPath\monitor\logs"

if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Force -Path $logsPath | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = "$logsPath\deploy_all_$timestamp.log"

# ========== ENCABEZADO ==========
Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host " 🚦 TAXIA CIMCO - DESPLIEGUE CORPORATIVO TOTAL (QA + PRODUCCION)" -ForegroundColor Yellow
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date

# ========== DESPLIEGUE QA ==========
try {
    Write-Host "🧩 Iniciando despliegue QA..." -ForegroundColor Cyan
    & "$scriptsPath\deploy_total_qa.ps1" 2>&1 | Tee-Object -FilePath $logFile
    Write-Host "✅ Despliegue QA finalizado correctamente." -ForegroundColor Green
} catch {
    Write-Host "❌ Error durante el despliegue QA: $($_.Exception.Message)" -ForegroundColor Red
}

# ========== PAUSA ENTRE QA Y PRODUCCIÓN ==========
Write-Host ""
Write-Host "⌛ Esperando 10 segundos antes de continuar con Producción..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# ========== DESPLIEGUE PRODUCCIÓN ==========
try {
    Write-Host ""
    Write-Host "🧩 Iniciando despliegue PRODUCCIÓN..." -ForegroundColor Cyan
    & "$scriptsPath\deploy_total_pro.ps1" 2>&1 | Tee-Object -FilePath $logFile -Append
    Write-Host "✅ Despliegue PRODUCCIÓN finalizado correctamente." -ForegroundColor Green
} catch {
    Write-Host "❌ Error durante el despliegue PRODUCCIÓN: $($_.Exception.Message)" -ForegroundColor Red
}

# ========== RESUMEN FINAL ==========
$endTime = Get-Date
$duration = ($endTime - $startTime).ToString("hh\:mm\:ss")

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host " ✅ DESPLIEGUE CORPORATIVO COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🕒 Duración total del proceso: $duration" -ForegroundColor Yellow
Write-Host "🗂️  Log completo guardado en:" -ForegroundColor Cyan
Write-Host "    $logFile" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 QA:  https://pelagic-chalice-467818-e1-test.web.app/monitor" -ForegroundColor Cyan
Write-Host "🌐 PRO: https://pelagic-chalice-467818-e1-panel.web.app" -ForegroundColor Cyan
Write-Host ""

# 🔔 Notificación sonora + visual
try {
    [console]::beep(800,300)
    [console]::beep(1000,300)
    [console]::beep(1200,300)
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show("✅ Despliegue TAXIA CIMCO completado con éxito.","TAXIA CIMCO",0,"Info")
} catch {
    Write-Host "⚠️ No se pudo reproducir sonido o mostrar alerta visual." -ForegroundColor DarkYellow
}
