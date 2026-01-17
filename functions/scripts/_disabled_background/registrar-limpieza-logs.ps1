# ============================================================
# 🧭 PROGRAMAR TAREA DE LIMPIEZA AUTOMÁTICA DE LOGS
# ============================================================
# Este script registra una tarea programada en Windows (Scheduler)
# para ejecutar semanalmente el script 'limpiar-logs.ps1'.
# REQUIERE EJECUTARSE COMO ADMINISTRADOR.
# ============================================================

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------------
# 1. Definición de Rutas (Hacemos el projectPath dinámico)
# ------------------------------------------------------------------
# $PSScriptRoot es la ruta del directorio donde se encuentra este script (scripts/)
$projectPath = Join-Path $PSScriptRoot ".." # Sube a la carpeta 'functions/'
$scriptPath = Join-Path $PSScriptRoot "limpiar-logs.ps1" # Ruta completa al script de limpieza

$taskName = "TaxiaCIMCO_LimpiezaLogs"
$taskDescription = "Elimina logs antiguos de los checks de Firestore y procesos locales."

# ------------------------------------------------------------------
# 2. Creación de Acción
# ------------------------------------------------------------------
# La acción es ejecutar powershell.exe, pasando el path del script de limpieza
# como argumento. Es crucial usar comillas de escape (`) para el path.
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -File `"$scriptPath`""

# ------------------------------------------------------------------
# 3. Creación de Trigger (Disparador)
# ------------------------------------------------------------------
# Programar ejecución semanal (cada lunes a las 9:10 a.m.)
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9:10am

# ------------------------------------------------------------------
# 4. Registro de la Tarea
# ------------------------------------------------------------------
Write-Host "⚙️ Intentando registrar la tarea programada '$taskName'..."

# Verificar si el script de limpieza existe antes de registrar
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ ERROR: No se encontró el script de limpieza en: $scriptPath" -ForegroundColor Red
    Write-Host "   Asegúrese de que el archivo 'limpiar-logs.ps1' exista."
    exit 1
}

# Registrar la tarea. Usamos -User $env:UserName y -RunLevel Highest para asegurar permisos.
# -Force sobrescribe si ya existe.
try {
    Register-ScheduledTask -TaskName $taskName -Description $taskDescription -Action $action -Trigger $trigger -User $env:UserName -RunLevel Highest -Force
    Write-Host "✅ Tarea '$taskName' programada correctamente." -ForegroundColor Green
    Write-Host "   Script de Limpieza: $scriptPath"
    Write-Host "   Programación: Cada lunes a las 9:10 a.m."
    Write-Host "   El usuario que ejecuta es: $($env:UserName)"
} catch {
    Write-Host "❌ ERROR: No se pudo registrar la tarea programada. Asegúrese de ejecutar PowerShell como Administrador." -ForegroundColor Red
    Write-Host "Detalle: $($_.Exception.Message)"
}