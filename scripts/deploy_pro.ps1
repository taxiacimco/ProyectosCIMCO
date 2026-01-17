# 🚀 TAXIA CIMCO Backend - Deploy Automático a Producción
# Autor: Carlos Mario Fuentes García
# Fecha: Noviembre 2025
# Descripción: Este script automatiza el despliegue del backend (Functions + Hosting + Rules)
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host " 🚖  TAXIA CIMCO - DEPLOY AUTOMÁTICO A PRODUCCIÓN" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""

# 1️⃣ Verificar entorno
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $projectPath
Write-Host "📂 Directorio actual: $projectPath" -ForegroundColor Cyan

# 2️⃣ Verificar Firebase CLI
Write-Host "🔍 Verificando Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = firebase --version
if (-not $firebaseVersion) {
    Write-Host "❌ Firebase CLI no encontrada. Instálala con: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Firebase CLI detectada (v$firebaseVersion)" -ForegroundColor Green

# 3️⃣ Verificar sesión
Write-Host "🔐 Verificando inicio de sesión..." -ForegroundColor Yellow
$loginStatus = firebase login:list
if ($loginStatus -match "No authorized accounts") {
    Write-Host "⚠️ No has iniciado sesión. Ejecutando firebase login..." -ForegroundColor Yellow
    firebase login
} else {
    Write-Host "✅ Sesión activa detectada." -ForegroundColor Green
}

# 4️⃣ Verificar proyecto activo
Write-Host "📡 Verificando proyecto seleccionado..." -ForegroundColor Yellow
$project = firebase use
if ($project -notmatch "pelagic-chalice-467818-e1") {
    Write-Host "⚠️ Seleccionando proyecto correcto (pelagic-chalice-467818-e1)..." -ForegroundColor Yellow
    firebase use pelagic-chalice-467818-e1
} else {
    Write-Host "✅ Proyecto activo: pelagic-chalice-467818-e1" -ForegroundColor Green
}

# 5️⃣ Instalar dependencias de Functions
Write-Host "📦 Instalando dependencias en /functions ..." -ForegroundColor Yellow
cd functions
npm install --silent
Write-Host "✅ Dependencias actualizadas correctamente." -ForegroundColor Green
cd ..

# 6️⃣ Desplegar Reglas (Firestore + Storage)
Write-Host "📜 Desplegando reglas de seguridad..." -ForegroundColor Yellow
firebase deploy --only firestore:rules,storage:rules
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al desplegar reglas. Revisa firestore.rules o storage.rules." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Reglas desplegadas correctamente." -ForegroundColor Green

# 7️⃣ Desplegar Functions (Cloud Backend)
Write-Host "⚙️ Desplegando Cloud Functions..." -ForegroundColor Yellow
firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al desplegar funciones. Revisa index.mjs o dependencias." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Funciones desplegadas correctamente." -ForegroundColor Green

# 8️⃣ Desplegar Hosting (sitios web)
Write-Host "🌍 Desplegando Hosting multirol..." -ForegroundColor Yellow
firebase deploy --only hosting
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al desplegar hosting. Verifica firebase.json y rutas." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Hosting desplegado correctamente." -ForegroundColor Green

# 9️⃣ Mostrar URLs y funciones activas
Write-Host ""
Write-Host "🔗 URLs activas:" -ForegroundColor Cyan
firebase hosting:sites:list
Write-Host ""
Write-Host "⚙️ Funciones desplegadas:" -ForegroundColor Cyan
firebase functions:list
Write-Host ""

# 🔟 Finalización
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host " ✅ DEPLOY COMPLETADO EXITOSAMENTE 🚀 " -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Visita tu panel en: https://pelagic-chalice-467818-e1.web.app"
Write-Host "📡 Ver funciones: https://console.firebase.google.com/project/pelagic-chalice-467818-e1/functions"
Write-Host ""
