# ============================================================
# Script: organizar-proyecto.ps1
# Objetivo: Limpiar la raíz y organizar la carpeta scripts
# ============================================================

$root = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$scriptsDir = "$root\scripts"
$archiveDir = "$root\archive_old_scripts"

# 1. Crear carpetas de soporte si no existen
if (!(Test-Path $archiveDir)) { New-Item -ItemType Directory -Path $archiveDir }
if (!(Test-Path "$scriptsDir\logs")) { New-Item -ItemType Directory -Path "$scriptsDir\logs" }

Write-Host "--- Iniciando Limpieza Estándar ---" -ForegroundColor Cyan

# 2. MOVER SCRIPTS EXTRAVIADOS DE LA RAÍZ A /SCRIPTS
# Solo movemos los que sabemos que son útiles
$scriptsToMove = @(
    "iniciar-backend.ps1",
    "iniciar-frontend.ps1",
    "alternar-entorno.ps1",
    "verificar-env.ps1",
    "fix-local-cors.ps1",
    "generar-version.ps1"
)

foreach ($file in $scriptsToMove) {
    if (Test-Path "$root\$file") {
        Move-Item -Path "$root\$file" -Destination "$scriptsDir\$file" -Force
        Write-Host "Movido a /scripts: $file" -ForegroundColor Gray
    }
}

# 3. ARCHIVAR BASURA Y REPORTES (Limpieza de la raíz)
$junkInRoot = @(
    "*.log", "*.txt", "*.html", "*.csv", "*.patch",
    "analisis_js.csv", "firebase-status-report.txt", "estructura.txt",
    "verificacion_env_report.html", "panel-mantenimiento.html"
)

foreach ($pattern in $junkInRoot) {
    Get-ChildItem -Path "$root\$pattern" -ErrorAction SilentlyContinue | Move-Item -Destination $archiveDir -Force
}

# 4. LIMPIEZA DE SCRIPTS DUPLICADOS O DE PRUEBA
# Vamos a mover scripts que parecen ser de pruebas únicas o versiones viejas
$scriptsToArchive = @(
    "probar-*.ps1", "test-*.ps1", "simular-*.ps1",
    "deploy_all_silent.*", "deploy_total_*.ps1", "deploy_test.ps1",
    "create-prod-scripts.ps1", "generate-prod-scripts.ps1",
    "super-start-*.ps1", "auto-update-status.*"
)

foreach ($pattern in $scriptsToArchive) {
    Get-ChildItem -Path "$scriptsDir\$pattern" -ErrorAction SilentlyContinue | Move-Item -Destination $archiveDir -Force
}

# 5. ELIMINAR ARCHIVOS TEMPORALES REALMENTE INÚTILES
$filesToDelete = @(
    "$root\True", # Ese archivo llamado "True" que aparece en tu lista
    "$root\actualizar-version-total.ps1", # Probablemente redundante
    "$scriptsDir\auto-run.log"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) { Remove-Item $file -Force; Write-Host "Eliminado: $file" -ForegroundColor Red }
}

Write-Host "--- Limpieza Completada ---" -ForegroundColor Green
Write-Host "Los archivos antiguos se movieron a: $archiveDir" -ForegroundColor Yellow
