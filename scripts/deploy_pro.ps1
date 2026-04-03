# =============================================================================
# 🚀 TAXIA CIMCO - DEPLOY AUTOMÁTICO A PRODUCCIÓN (VERSIÓN FINAL)
# Autor: Carlos Mario Fuentes García
# Fecha: Enero 2026
# =============================================================================

$ErrorActionPreference = "Stop" # Detener el proceso si ocurre un error crítico

Write-Host "`n===============================================" -ForegroundColor Yellow
Write-Host " 🚀  TAXIA CIMCO - DEPLOY AUTOMÁTICO A PRODUCCIÓN" -ForegroundColor Green
Write-Host "===============================================`n" -ForegroundColor Yellow

# --- 1. RUTAS Y CONFIGURACIÓN ---
$baseDir = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$projectId = "pelagic-chalice-467818-e1"
$frontendDir = "$baseDir\frontend"
$functionsDir = "$baseDir\functions"

# --- 2. VERIFICACIÓN DE HERRAMIENTAS ---
Write-Host "🔍 Verificando entorno..." -ForegroundColor Yellow
$firebaseVersion = firebase --version 2>$null
if (-not $firebaseVersion) {
    Write-Host "❌ Firebase CLI no encontrada. Instálala primero." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Firebase CLI v$firebaseVersion detectada." -ForegroundColor Green

# --- 3. SELECCIÓN DE PROYECTO ---
Write-Host "📡 Sincronizando con proyecto: $projectId..." -ForegroundColor Yellow
firebase use $projectId --add 2>$null
firebase use $projectId
Write-Host "✅ Proyecto activo confirmado." -ForegroundColor Green

# --- 4. PREPARACIÓN DEL FRONTEND (BUILD) ---
Write-Host "`n🏗️  [1/4] Compilando Frontend (Vite)..." -ForegroundColor Cyan
Set-Location $frontendDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en el Build del Frontend. Despliegue cancelado." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completado exitosamente." -ForegroundColor Green

# --- 5. ACTUALIZAR FUNCTIONS ---
Write-Host "`n📦 [2/4] Verificando dependencias del Backend..." -ForegroundColor Cyan
Set-Location $functionsDir
npm install --quiet
Set-Location $baseDir
Write-Host "✅ Backend listo para despliegue." -ForegroundColor Green

# --- 6. DESPLIEGUE A FIREBASE ---
Write-Host "`n🚀 [3/4] Iniciando transferencia de archivos a la nube..." -ForegroundColor Cyan

# Desplegamos todo en un solo bloque para optimizar la conexión
# (Reglas de base de datos, funciones de la API y el sitio web)
firebase deploy --only firestore:rules,storage:rules,functions,hosting --project $projectId

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error durante el comando de despliegue de Firebase." -ForegroundColor Red
    exit 1
}

# --- 7. FINALIZACIÓN Y REPORTE ---
Write-Host "`n===============================================" -ForegroundColor Yellow
Write-Host " ✅ DEPLOY PRODUCCIÓN COMPLETADO EXITOSAMENTE 🚀 " -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Yellow

$duration = (Get-Date) - $startTime
Write-Host "`n🔗 Enlaces de Producción:" -ForegroundColor Cyan
Write-Host "🌐 Panel Web: https://$projectId.web.app" -ForegroundColor White
Write-Host "📡 Consola:    https://console.firebase.google.com/project/$projectId" -ForegroundColor White
Write-Host ""