<#
===================================================================
 🚀 TAXIA CIMCO - DESPLIEGUE CORPORATIVO TOTAL (QA + PRODUCCIÓN)
===================================================================
Autor: Carlos Mario Fuentes García
Proyecto: TAXIA CIMCO Backend
Infraestructura: Firebase (Functions + Hosting)
Fecha: Enero 2026 (Actualizado)
-------------------------------------------------------------------
#>

# ========== CONFIGURACIÓN ==========
$rootPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$scriptsPath = "$rootPath\scripts"
$backendPath = "$rootPath\taxia_cimco_backend"
$logsPath = "$backendPath\monitor\logs"

# Asegurar que la carpeta de logs exista
if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Force -Path $logsPath | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = "$logsPath\deploy_all_$timestamp.log"

# ========== ENCABEZADO ==========
Clear-Host
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host " 🚦 TAXIA CIMCO - DESPLIEGUE CORPORATIVO TOTAL (QA + PRODUCCION)" -ForegroundColor Yellow
Write-Host "===================================================================" -ForegroundColor Cyan

$startTime = Get-Date

# ========== 1. DESPLIEGUE QA (Usando deploy_test.ps1) ==========
try {
    Write-Host "`n🧩 [1/2] Iniciando despliegue QA..." -ForegroundColor Cyan
    # Ejecutamos el script real que tienes: deploy_test.ps1
    & "$scriptsPath\deploy_test.ps1" 2>&1 | Tee-Object -FilePath $logFile
    Write-Host "✅ Despliegue QA finalizado correctamente." -ForegroundColor Green
} catch {
    Write-Host "❌ Error durante el despliegue QA: $($_.Exception.Message)" -ForegroundColor Red
}

# ========== PAUSA DE ESTABILIZACIÓN ==========
Write-Host "`n⌛ Esperando 10 segundos antes de continuar con Producción..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# ========== 2. DESPLIEGUE PRODUCCIÓN (Usando deploy_pro.ps1) ==========
try {
    Write-Host "🚀 [2/2] Iniciando despliegue PRODUCCIÓN..." -ForegroundColor Cyan
    # Ejecutamos el script real que tienes: deploy_pro.ps1
    & "$scriptsPath\deploy_pro.ps1" 2>&1 | Tee-Object -FilePath $logFile -Append
    Write-Host "✅ Despliegue PRODUCCIÓN finalizado correctamente." -ForegroundColor Green
} catch {
    Write-Host "❌ Error durante el despliegue PRODUCCIÓN: $($_.Exception.Message)" -ForegroundColor Red
}

# ========== RESUMEN FINAL ==========
$endTime = Get-Date
$duration = ($endTime - $startTime).ToString("hh\:mm\:ss")

Write-Host "`n===================================================================" -ForegroundColor Cyan
Write-Host " ✅ PROCESO DE DESPLIEGUE FINALIZADO" -ForegroundColor Green
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "🕒 Duración total: $duration" -ForegroundColor Yellow
Write-Host "🗂️ Log guardado en: $logFile" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 QA:  https://pelagic-chalice-467818-e1-test.web.app/monitor" -ForegroundColor Cyan
Write-Host "🌐 PRO: https://pelagic-chalice-467818-e1-panel.web.app" -ForegroundColor Cyan

# 🔔 Notificación sonora + Alerta Visual
try {
    [console]::beep(800,300)
    [console]::beep(1000,300)
    [console]::beep(1200,300)
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show("✅ Despliegue TAXIA CIMCO completado.`n`nRevisa los logs para confirmar que Firebase no devolvió errores internos.","TAXIA CIMCO",0,"Information")
} catch {
    Write-Host "⚠️ Notificación visual completada." -ForegroundColor DarkYellow
}