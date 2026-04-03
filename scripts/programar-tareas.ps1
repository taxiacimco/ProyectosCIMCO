# 📅 PROGRAMADOR DE TAREAS CIMCO - SEGURO
Write-Host "🧹 Eliminando tareas programadas antiguas para evitar 'locura'..." -ForegroundColor Yellow

# Eliminar tareas si existen para evitar duplicados
Unregister-ScheduledTask -TaskName "CIMCO_Monitor" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "CIMCO_Cleanup" -Confirm:$false -ErrorAction SilentlyContinue

$Action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument "-ExecutionPolicy Bypass -File 'C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\auto-update-status.mjs'"
# El trigger debe ser CADA 5 MINUTOS, no menos.
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)

Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName "CIMCO_Monitor" -Description "Actualiza el status de TAXIA CIMCO" -User "SYSTEM" -RunLevel Highest

Write-Host "✅ Tarea programada cada 5 min. Ya no debería saturar tu teclado." -ForegroundColor Green