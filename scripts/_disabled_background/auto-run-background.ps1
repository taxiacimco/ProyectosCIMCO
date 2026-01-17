# ============================================================
# 🤖 AUTO-RUN TAXIA CIMCO (MODO BACKGROUND)
# Ejecuta actualizaciones automáticas del panel en segundo plano.
# ============================================================

$ScriptDir = "C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts"
$LogFile = "$ScriptDir\auto-run-background.log"
$IntervalMinutes = 60

Add-Content -Path $LogFile -Value "==== Iniciado TAXIA CIMCO Background - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===="

while ($true) {
    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Add-Content -Path $LogFile -Value "[$timestamp] Ejecutando actualización..."
        
        # Ejecutar actualización y despliegue
        node "$ScriptDir\auto-update-status.mjs"
        firebase deploy --only hosting:pelagic-chalice-467818-e1-panel
        
        Add-Content -Path $LogFile -Value "[$timestamp] ✅ Sincronización correcta"
    }
    catch {
        Add-Content -Path $LogFile -Value "[$timestamp] ❌ Error: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds ($IntervalMinutes * 60)
}
