# -------------------------------------------------
# Script para iniciar el entorno de Frontend (Vite + React)
# Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\iniciar-frontend.ps1
# -------------------------------------------------

Clear-Host
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "     INICIANDO FRONTEND (VITE + REACT)       " -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan

$root = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$frontendPath = "$root\frontend"

# 1. Verificación de carpeta
if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Error: No se encontró la carpeta frontend en $frontendPath" -ForegroundColor Red
    exit
}

Set-Location $frontendPath

# 2. Verificación de .env (Vital para la conexión con el Backend)
if (-not (Test-Path ".\.env")) {
    Write-Host "⚠️ Advertencia: No se encontró archivo .env en el frontend." -ForegroundColor Yellow
    Write-Host "Asegúrate de que las variables VITE_FIREBASE_... estén configuradas." -ForegroundColor Gray
}

# 3. Instalación de dependencias automática
if (-not (Test-Path ".\node_modules")) {
    Write-Host "[1/2] node_modules no detectado. Instalando dependencias de React..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error crítico al instalar dependencias." -ForegroundColor Red
        exit
    }
} else {
    Write-Host "[1/2] Dependencias de frontend verificadas." -ForegroundColor Green
}

# 4. Iniciar servidor de desarrollo
Write-Host "[2/2] Iniciando servidor Vite..." -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Gray

# Ejecutamos npm run dev. 
# Vite por defecto usa el puerto 5173 o buscará el siguiente disponible.
npm run dev

Write-Host "`n=============================================" -ForegroundColor Cyan