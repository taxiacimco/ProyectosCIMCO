# ============================================
# Script: pre-deploy-check.ps1
# Descripción: Verifica entorno antes del despliegue
# Autor: Carlos Mario Fuentes García
# Proyecto: CIMCO
# ============================================

Write-Host "============================================================"
Write-Host "       INICIO DE VERIFICACIÓN PREVIA AL DESPLIEGUE          "
Write-Host "============================================================"

# Ruta del script de verificación
$verificarScript = ".\scripts\verificar-entorno-pro.ps1"
$deployScript = ".\scripts\deploy-firebase.ps1"

# Verificar que los scripts existen
if (-not (Test-Path $verificarScript)) {
    Write-Host "[ERROR] No se encontró el script de verificación: $verificarScript" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $deployScript)) {
    Write-Host "[ERROR] No se encontró el script de despliegue: $deployScript" -ForegroundColor Red
    exit 1
}

# Ejecutar verificación
Write-Host ""
Write-Host "Ejecutando verificación del entorno..."
Write-Host "------------------------------------------------------------"
& $verificarScript
$verificarStatus = $LASTEXITCODE

if ($verificarStatus -ne 0) {
    Write-Host "[FALLO] La verificación del entorno no fue exitosa. Corrige los errores antes de continuar." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================================"
Write-Host "      PRE-DEPLOY CHECK COMPLETADO CORRECTAMENTE ✅"
Write-Host "============================================================"

# Ejecutar despliegue
Write-Host ""
Write-Host "Iniciando despliegue en Firebase..."
Write-Host "------------------------------------------------------------"
& $deployScript
