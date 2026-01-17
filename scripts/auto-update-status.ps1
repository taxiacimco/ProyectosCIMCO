# --- INICIO: modo invisible ---
if (-not ([Environment]::GetCommandLineArgs() -match '-hiddenExec')) {
    Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$PSCommandPath`"",' -hiddenExec' -WindowStyle Hidden
    exit
}
# --- FIN: modo invisible ---

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "== TAXIA CIMCO - INICIO DE ACTUALIZACIÓN AUTOMÁTICA ==" -ForegroundColor Cyan
Write-Host "=========================================================="

$projectRoot = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
Set-Location "$projectRoot\panel"

Write-Host "[1/2] Ejecutando auto-update-status.mjs..."
node "$projectRoot\panel\scripts\auto-update-status.mjs"

Write-Host "[2/2] Desplegando archivos actualizados a Firebase Hosting..."
firebase deploy --only hosting

Write-Host "✅ Actualización automática completada."
