# ===============================================================
# 🚀 TAXIA CIMCO — GENERADOR AUTOMÁTICO DE QR (modo invisible + deploy)
# ===============================================================

# --- INICIO: ejecución invisible ---
if (-not ([Environment]::GetCommandLineArgs() -match '-hiddenExec')) {
    Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$PSCommandPath`"","-hiddenExec" -WindowStyle Hidden
    exit
}
# --- FIN: ejecución invisible ---

$root = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$script = "$root\panel\scripts\generate-role-qr.mjs"
$logDir = "$root\logs"
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = "$logDir\generate_qr_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log"

Start-Transcript -Path $logFile -Append

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🧩 GENERADOR AUTOMÁTICO DE QR — TAXIA CIMCO" -ForegroundColor Cyan
Write-Host "=========================================================="
Write-Host "Inicio: $(Get-Date)" -ForegroundColor Gray

try {
    Set-Location $root
    Write-Host "📦 Ejecutando generador de QR..."
    node $script
    Write-Host "✅ Generación de QR completada correctamente."

    Write-Host "🚀 Desplegando QR a Firebase Hosting..."
    firebase deploy --only hosting:pelagic-chalice-467818-e1-panel
    Write-Host "✅ Despliegue de QR completado correctamente."
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=========================================================="
Write-Host "Finalizado: $(Get-Date)"
Write-Host "Log guardado en: $logFile"
Write-Host "=========================================================="

Stop-Transcript
