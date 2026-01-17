# ============================================================
# 🧹 LIMPIEZA AUTOMÁTICA DE LOGS ANTIGUOS
# ============================================================
# Este script borra cualquier archivo .log de la carpeta /logs
# que tenga más de 30 días de antigüedad.
# ============================================================

$logsPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO\functions\logs"
$daysToKeep = 30

Write-Host "🧾 Revisando archivos en $logsPath ..."
if (Test-Path $logsPath) {
    $oldLogs = Get-ChildItem -Path $logsPath -Filter "*.log" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$daysToKeep) }

    if ($oldLogs.Count -gt 0) {
        Write-Host "🗑️  Eliminando $($oldLogs.Count) logs con más de $daysToKeep días..."
        $oldLogs | ForEach-Object {
            Remove-Item $_.FullName -Force
            Write-Host "   - Eliminado: $($_.Name)"
        }
    } else {
        Write-Host "✅ No hay logs antiguos para eliminar."
    }
} else {
    Write-Host "⚠️ No se encontró la carpeta de logs: $logsPath"
}

Write-Host "✨ Limpieza completa."
