# ============================================================
# 🧭 PROGRAMAR LIMPIEZA AUTOMÁTICA DE LOGS (Cada Lunes 9:10 a.m.)
# ============================================================
# Este script crea una tarea que limpia los logs antiguos
# 10 minutos después del test de conexión Firestore.
# ============================================================

$projectPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO\functions"
$scriptPath = "$projectPath\scripts\limpiar-logs.ps1"

$taskName = "LimpiarLogsFirestore"
$taskDescription = "Elimina logs antiguos (>30 días) de Firestore Check"

# Acción a ejecutar
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -File `"$scriptPath`""

# Programar ejecución semanal (cada lunes a las 9:10 a.m.)
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9:10am

Register-ScheduledTask -TaskName $taskName -Description $taskDescription -Action $action -Trigger $trigger -User $env:UserName -RunLevel Highest -Force

Write-Host "✅ Tarea '$taskName' programada correctamente."
Write-Host "🧹 Se ejecutará cada lunes a las 9:10 a.m. (después del Firestore Check)"
