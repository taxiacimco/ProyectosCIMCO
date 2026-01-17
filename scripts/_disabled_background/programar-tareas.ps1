<#
==========================================================
🕒 TAXIA CIMCO — Programador de tareas automáticas (invisible)
Autor: Carlos Mario Fuentes García
==========================================================
#>

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🕒 CONFIGURANDO TAREAS AUTOMÁTICAS - TAXIA CIMCO" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$base = "C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts"
$schtasks = "C:\Windows\System32\schtasks.exe"

$deploy = "$base\deploy_all_silent.ps1"
$clean  = "$base\limpiar-logs.ps1"
$update = "$base\auto-update-status.ps1"

Start-Process -FilePath $schtasks -ArgumentList "/Create /TN `"Despliegue silencioso TAXIA CIMCO`" /TR `"powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File '$deploy'`" /SC DAILY /ST 03:00 /RL HIGHEST /F" -Wait -WindowStyle Hidden
Start-Process -FilePath $schtasks -ArgumentList "/Create /TN `"Limpieza de respaldo TAXIA CIMCO`" /TR `"powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File '$clean'`" /SC DAILY /ST 03:10 /RL HIGHEST /F" -Wait -WindowStyle Hidden
Start-Process -FilePath $schtasks -ArgumentList "/Create /TN `"Actualización automática de status TAXIA CIMCO`" /TR `"powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File '$update'`" /SC DAILY /ST 03:20 /RL HIGHEST /F" -Wait -WindowStyle Hidden

Write-Host "✅ Tareas programadas correctamente a las 03:00, 03:10 y 03:20 AM." -ForegroundColor Green
