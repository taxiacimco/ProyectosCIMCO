# -------------------------------------------------
# Script para iniciar el entorno de Firebase (Functions/Firestore/Auth)
# Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\iniciar-backend.ps1
# -------------------------------------------------

Write-Host "`n==========================================" -ForegroundColor Magenta
Write-Host "    INICIANDO BACKEND TAXIA CIMCO         " -ForegroundColor Magenta
Write-Host "==========================================`n" -ForegroundColor Magenta

# 1) Primero liberamos los puertos por seguridad
Write-Host "[1/4] Limpiando entorno previo..." -ForegroundColor Cyan
& "$PSScriptRoot\liberar-puertos.ps1"

# 2) Ir a la carpeta de funciones
$functionsPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO\functions"
Write-Host "`n[2/4] Accediendo a: $functionsPath" -ForegroundColor Cyan
Set-Location $functionsPath

# 3) Validar archivos esenciales y dependencias
if (-not (Test-Path ".\package.json")) {
    Write-Host "[ERROR] No se encontró package.json en la carpeta functions." -ForegroundColor Red
    Write-Host "Ruta actual: $(Get-Location)" -ForegroundColor Yellow
    exit
}

if (-not (Test-Path ".\node_modules")) {
    Write-Host "[3/4] node_modules no detectado. Instalando dependencias..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Falló la instalación de dependencias (npm install)." -ForegroundColor Red
        exit
    }
} else {
    Write-Host "[3/4] Dependencias encontradas. Saltando instalación." -ForegroundColor Green
}

# 4) Verificar Firebase CLI y Levantar Emuladores
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Firebase CLI no está instalado o no está en el PATH." -ForegroundColor Red
    exit
}

Write-Host "`n[4/4] Levantando emuladores de Firebase..." -ForegroundColor Cyan
Write-Host "(Functions, Firestore, Auth, Hosting)" -ForegroundColor Gray

# Se ejecuta el comando de firebase
# Nota: Si necesitas persistencia de datos puedes añadir: --import=./seed
firebase emulators:start --only "functions,firestore,auth,hosting"