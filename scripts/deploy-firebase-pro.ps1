# ============================================================
# 🚀 Deploy Pro v2 – TaxiA-CIMCO
# Autor: Carlos Mario Fuentes García
# Descripción: Despliegue completo con generación de versión,
# limpieza, compilación, push a GitHub y deploy a Firebase.
# ============================================================

Write-Host ""
Write-Host "============================================================"
Write-Host "🚀 INICIANDO DEPLOY PROFESIONAL DE TAXIA-CIMCO"
Write-Host "============================================================"
Write-Host ""

# --- 1️⃣ Generar archivo de versión ---
Write-Host "🕒 Generando versión actual..." -ForegroundColor Cyan
& "C:\Users\Carlos Fuentes\ProyectosCIMCO\generar-version.ps1"

# --- 2️⃣ Limpieza del proyecto ---
Write-Host ""
Write-Host "🧹 Limpiando compilaciones viejas..." -ForegroundColor Cyan
$paths = @(
    "frontend\dist",
    "frontend\build",
    "frontend\.cache",
    "functions\lib",
    "functions\dist",
    "functions\.cache",
    "functions\node_modules"
)
foreach ($p in $paths) {
    $full = Join-Path "C:\Users\Carlos Fuentes\ProyectosCIMCO" $p
    if (Test-Path $full) {
        Remove-Item -Recurse -Force $full
        Write-Host "🗑 Eliminado: $full" -ForegroundColor Yellow
    } else {
        Write-Host "✅ No existe: $full (ok)" -ForegroundColor DarkGray
    }
}

# --- 3️⃣ Reinstalar dependencias y compilar ---
Write-Host ""
Write-Host "📦 Reinstalando dependencias del backend..." -ForegroundColor Cyan
npm install --prefix functions
npm run build --prefix functions

Write-Host ""
Write-Host "🎨 Verificando frontend..." -ForegroundColor Cyan
npm install --prefix frontend

# --- 4️⃣ GitHub Sync ---
Write-Host ""
Write-Host "🔄 Sincronizando con GitHub..." -ForegroundColor Cyan
git add .
git commit -m "🚀 Deploy automático - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push origin main

# --- 5️⃣ Deploy Firebase ---
Write-Host ""
Write-Host "🔥 Desplegando a Firebase (hosting + functions)..." -ForegroundColor Cyan
firebase deploy --only "functions,hosting"

# --- 6️⃣ Finalización ---
Write-Host ""
Write-Host "============================================================"
Write-Host "✅ DEPLOY COMPLETADO EXITOSAMENTE"
Write-Host "📅 Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "============================================================"
