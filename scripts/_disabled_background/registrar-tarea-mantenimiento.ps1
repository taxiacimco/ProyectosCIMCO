# =============================================================
# REGISTRA TAREA AUTOMÁTICA SEMANAL - TAXI A CIMCO
# =============================================================

$taskName = "Verificación Firestore - Taxi A CIMCO"
$scriptPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\mantenimiento-semanal.ps1"

# Eliminar si ya existe
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Crear acción
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""

# Crear disparador (cada lunes a las 8:00 a.m.)
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 8:00am

# Configurar con privilegios elevados
$principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest

# Registrar tarea
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Description "Ejecuta la verificación automática semanal de Firestore para Taxi A CIMCO."

Write-Host "✅ Tarea programada correctamente: $taskName"
