# --- INICIO: modo invisible ---
if (-not ([Environment]::GetCommandLineArgs() -match '-hiddenExec')) {
    Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$PSCommandPath`"",' -hiddenExec' -WindowStyle Hidden
    exit
}
# --- FIN: modo invisible ---

# ================================================================
# 🧹 LIMPIAR LOGS ANTIGUOS - TAXI A CIMCO
# Elimina archivos de log con más de 30 días de antigüedad
# y registra la limpieza en un archivo de auditoría.
# ================================================================

$basePath = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$logsPath = Join-Path $basePath "taxia_cimco_backend\monitor\logs"
$auditFile = Join-Path $logsPath "limpieza-historial.log"

if (-not (Test-Path $logsPath)) { New-Item -ItemType Directory -Path $logsPath | Out-Null }

Add-Content -Path $auditFile -Value "`n[$(Get-Date -Format u)] Iniciando limpieza de logs..."
$limitDate = (Get-Date).AddDays(-30)
$deleted = @()

Get-ChildItem -Path $logsPath -File -Recurse | ForEach-Object {
    if ($_.LastWriteTime -lt $limitDate) {
        $deleted += $_.FullName
        Remove-Item $_.FullName -Force
    }
}

if ($deleted.Count -gt 0) {
    Add-Content -Path $auditFile -Value "Se eliminaron $($deleted.Count) logs antiguos:`n$($deleted -join "`n")"
} else {
    Add-Content -Path $auditFile -Value "No se encontraron logs antiguos para eliminar."
}

Add-Content -Path $auditFile -Value "Limpieza completada a las $(Get-Date -Format 'HH:mm:ss')"
