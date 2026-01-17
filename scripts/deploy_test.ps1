# ===============================================================
# 🚖 TAXIA CIMCO - DEPLOY AUTOMÁTICO A QA / TEST
# ===============================================================

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host " 🚖  TAXIA CIMCO - DEPLOY AUTOMÁTICO A QA / TEST " -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

# --- CONFIGURACIÓN ---
$projectId = "pelagic-chalice-467818-e1-test"
$functionsDir = "functions"
$panelSource = "C:\Users\Carlos Fuentes\ProyectosCIMCO\panel\public"
$panelTarget = "C:\Users\Carlos Fuentes\ProyectosCIMCO\taxia_cimco_backend\panel-test\public"

# --- VERIFICAR FIREBASE CLI ---
Write-Host "🔍 Verificando Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = firebase --version 2>$null
if (-not $firebaseVersion) {
    Write-Host "❌ Firebase CLI no encontrada. Instálala con: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Firebase CLI detectada (v$firebaseVersion)" -ForegroundColor Green

# --- VERIFICAR SESIÓN ---
Write-Host "🔐 Verificando inicio de sesión..." -ForegroundColor Yellow
$authStatus = firebase login:list 2>$null
if ($authStatus -match "No authorized accounts") {
    Write-Host "❌ No has iniciado sesión. Ejecuta: firebase login" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Sesión activa detectada." -ForegroundColor Green

# --- VERIFICAR O CREAR PROYECTO QA ---
Write-Host "📡 Verificando existencia del proyecto QA ($projectId)..." -ForegroundColor Yellow
$projectCheck = firebase projects:list --json | ConvertFrom-Json
if ($projectCheck.result | Where-Object { $_.projectId -eq $projectId }) {
    Write-Host "✅ Proyecto QA encontrado: $projectId" -ForegroundColor Green
} else {
    Write-Host "⚠️ Proyecto QA no encontrado. Deseas crearlo ahora? (y/N)" -ForegroundColor Yellow
    $answer = Read-Host
    if ($answer -eq "y") {
        firebase projects:create $projectId
    } else {
        Write-Host "❌ No se puede continuar sin proyecto QA." -ForegroundColor Red
        exit 1
    }
}

# --- COPIAR PANEL DE PRODUCCIÓN A TEST ---
Write-Host "🧩 Copiando panel de producción a entorno QA..." -ForegroundColor Yellow
if (Test-Path $panelTarget) { Remove-Item $panelTarget -Recurse -Force }
New-Item -ItemType Directory -Path $panelTarget | Out-Null
Copy-Item "$panelSource\*" $panelTarget -Recurse -Force
Write-Host "✅ Panel QA actualizado desde producción." -ForegroundColor Green

# --- ACTUALIZAR DEPENDENCIAS ---
Write-Host "📦 Instalando dependencias en /functions ..." -ForegroundColor Yellow
Set-Location $functionsDir
npm install | Out-Null
Set-Location ..
Write-Host "✅ Dependencias actualizadas correctamente." -ForegroundColor Green

# --- DEPLOY DE REGLAS FIRESTORE Y STORAGE ---
Write-Host "📜 Desplegando reglas de seguridad..." -ForegroundColor Yellow
firebase deploy --only firestore:rules,firestore:indexes,storage:rules --project $projectId
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al desplegar reglas." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Reglas desplegadas correctamente." -ForegroundColor Green

# --- DEPLOY DE CLOUD FUNCTIONS ---
Write-Host "⚙️ Desplegando Cloud Functions..." -ForegroundColor Yellow
firebase deploy --only functions --project $projectId
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al desplegar funciones." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Funciones desplegadas correctamente." -ForegroundColor Green

# --- DEPLOY DE HOSTING (PANEL QA) ---
Write-Host "🌍 Desplegando Hosting del panel QA..." -ForegroundColor Yellow
firebase deploy --only hosting:pelagic-chalice-467818-e1-panel-test --project $projectId
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al desplegar hosting QA." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Hosting QA desplegado correctamente." -ForegroundColor Green

# --- FINALIZACIÓN ---
Write-Host "`n🎯 DEPLOY QA COMPLETADO EXITOSAMENTE 🎯" -ForegroundColor Green
Write-Host "Panel QA URL: https://pelagic-chalice-467818-e1-test.web.app" -ForegroundColor Cyan
Write-Host "Funciones QA URL base: https://us-central1-$projectId.cloudfunctions.net/" -ForegroundColor Cyan
Write-Host "`n===============================================" -ForegroundColor Cyan
