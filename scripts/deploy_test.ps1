# ===============================================================
# 🚖 TAXIA CIMCO - DEPLOY AUTOMÁTICO A QA / TEST (CORREGIDO)
# ===============================================================

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host " 🚖   TAXIA CIMCO - DEPLOY AUTOMÁTICO A QA / TEST " -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

# --- CONFIGURACIÓN DE RUTAS DINÁMICAS ---
$projectId = "pelagic-chalice-467818-e1" # Tu ID de proyecto principal
$baseDir = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$functionsDir = "$baseDir\functions"
$frontendDist = "$baseDir\frontend\dist" # Donde Vite guarda el build

# --- VERIFICAR FIREBASE CLI ---
Write-Host "🔍 Verificando Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = firebase --version 2>$null
if (-not $firebaseVersion) {
    Write-Host "❌ Firebase CLI no encontrada." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Firebase CLI detectada (v$firebaseVersion)" -ForegroundColor Green

# --- PREPARACIÓN DEL FRONTEND (BUILD) ---
Write-Host "🏗️  Generando build del Frontend..." -ForegroundColor Yellow
Set-Location "$baseDir\frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al compilar el Frontend." -ForegroundColor Red
    exit 1
}
Set-Location $baseDir

# --- ACTUALIZAR DEPENDENCIAS FUNCTIONS ---
Write-Host "📦 Verificando dependencias en /functions ..." -ForegroundColor Yellow
Set-Location $functionsDir
npm install --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en npm install de funciones." -ForegroundColor Red
    exit 1
}
Set-Location $baseDir

# --- SELECCIONAR PROYECTO FIREBASE ---
Write-Host "📡 Cambiando a proyecto: $projectId..." -ForegroundColor Yellow
firebase use $projectId

# --- DEPLOY TOTAL A TEST ---
# Nota: Usamos --only para no afectar la base de datos de producción si no es necesario
Write-Host "🚀 Iniciando despliegue de componentes..." -ForegroundColor Cyan

# 1. Reglas
Write-Host "📜 Desplegando reglas..." -ForegroundColor Yellow
firebase deploy --only firestore:rules,storage:rules --project $projectId

# 2. Functions
Write-Host "⚙️  Desplegando Cloud Functions..." -ForegroundColor Yellow
firebase deploy --only functions --project $projectId

# 3. Hosting (QA)
Write-Host "🌍 Desplegando Hosting (Entorno de Pruebas)..." -ForegroundColor Yellow
# Ajustado para usar el target de hosting correcto
firebase deploy --only hosting --project $projectId

# --- FINALIZACIÓN ---
Write-Host "`n🎯 DEPLOY QA COMPLETADO EXITOSAMENTE 🎯" -ForegroundColor Green
Write-Host "URL: https://$projectId.web.app" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan