# ============================================================
# Script: deploy-firebase.ps1
# Proyecto: TAXIA CIMCO
# Descripción: Automatiza el despliegue de Firebase Functions y Hosting
# ============================================================

Clear-Host
Write-Host "============================================="
Write-Host "       DEPLOY AUTOMATIZADO - TAXIA CIMCO     "
Write-Host "============================================="
Write-Host ""

# Verificar si Node.js está instalado
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js no está instalado. Instálalo antes de continuar."
    exit 1
}

# Verificar si Firebase CLI está instalada
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Firebase CLI no está instalada. Ejecuta:"
    Write-Host "npm install -g firebase-tools"
    exit 1
}

# Confirmar entorno
$envFile = ".env"
if (!(Test-Path $envFile)) {
    Write-Host "Error: No se encontró el archivo .env activo."
    Write-Host "Ejecuta 'alternar-entorno.ps1' para seleccionar el entorno."
    exit 1
}

# Confirmar acción
Write-Host "Selecciona una opción:"
Write-Host "1) Desplegar a producción"
Write-Host "2) Cancelar"
$choice = Read-Host "Ingresa tu opción (1 o 2)"

if ($choice -ne "1") {
    Write-Host "Despliegue cancelado por el usuario."
    exit 0
}

# Crear carpeta de logs si no existe
$logDir = "logs"
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

# Crear nombre de log con fecha y hora
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "$logDir\deploy_$timestamp.log"

Write-Host ""
Write-Host "============================================="
Write-Host "  Iniciando proceso de despliegue en Firebase"
Write-Host "============================================="
Write-Host ""

# Limpiar compilaciones previas
Write-Host "Eliminando archivos antiguos..."
npm run clean | Out-File -FilePath $logFile -Append

# Compilar código TypeScript
Write-Host "Compilando código..."
npm run build | Out-File -FilePath $logFile -Append

# Autenticación opcional en Firebase
Write-Host "Verificando autenticación en Firebase..."
firebase login:list | Out-File -FilePath $logFile -Append

# Despliegue de funciones y hosting
Write-Host "Desplegando funciones y hosting..."
firebase deploy --only functions,hosting | Tee-Object -FilePath $logFile -Append

# Verificar estado final
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================="
    Write-Host "  DESPLIEGUE COMPLETADO CORRECTAMENTE        "
    Write-Host "============================================="
    Write-Host "Log guardado en: $logFile"
} else {
    Write-Host ""
    Write-Host "============================================="
    Write-Host "  ERROR DURANTE EL DESPLIEGUE                "
    Write-Host "============================================="
    Write-Host "Revisa el archivo de log en: $logFile"
}

Write-Host ""
Write-Host "Presiona Enter para cerrar..."
Read-Host
