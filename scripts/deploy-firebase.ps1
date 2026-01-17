# ============================================================
# Script: deploy-firebase.ps1
# Proyecto: TAXIA-CIMCO
# Función: Despliegue automático del backend y hosting
# Autor: Carlos Mario Fuentes García
# ============================================================

Clear-Host
Write-Host ""
Write-Host "============================================================"
Write-Host " INICIANDO DESPLIEGUE AUTOMÁTICO TAXIA-CIMCO "
Write-Host "============================================================"

# Rutas base
$root = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$scriptsPath = "$root\scripts"
$functions = "$root\functions"
$frontend = "$root\frontend"

# 1. Limpieza
Write-Host "`nLimpieza del proyecto..."
if (Test-Path "$root\limpiar-proyecto.ps1") {
    & "$root\limpiar-proyecto.ps1"
} else {
    Write-Host "No se encontró limpiar-proyecto.ps1. Continuando..."
}

# 2. Compilar backend
if (Test-Path "$functions\package.json") {
    Write-Host "`nCompilando backend (TypeScript -> JS)..."
    Set-Location $functions
    npm run build
    Write-Host "Backend compilado correctamente."
}

# 3. Verificar sesión Firebase
Write-Host "`nVerificando sesión Firebase..."
firebase login:list | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "No hay sesión activa. Usa: firebase login"
    exit
}

# 4. Generar versión
if (Test-Path "$root\generar-version.ps1") {
    & "$root\generar-version.ps1"
}

# 5. Desplegar
Set-Location $root
Write-Host "`nDesplegando hosting y functions..."
firebase deploy --only functions,hosting

# 6. Generar reporte post-despliegue
if (Test-Path "$scriptsPath\post-deploy-report.ps1") {
    Write-Host "`nGenerando reporte post-despliegue..."
    & "$scriptsPath\post-deploy-report.ps1"
} else {
    Write-Host "No se encontró post-deploy-report.ps1, omitiendo reporte..."
}

Write-Host "`n============================================================"
Write-Host " DESPLIEGUE COMPLETADO EXITOSAMENTE "
Write-Host "============================================================"
