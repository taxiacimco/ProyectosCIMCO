<#
============================================================
 🚀 TAXIA CIMCO - ACTUALIZADOR DE PANEL MONITOR QA AUTOMÁTICO
============================================================
Autor: Carlos Mario Fuentes García
Proyecto: TAXIA CIMCO Backend
Infraestructura: Firebase (Functions + Hosting)
Fecha: Noviembre 2025
------------------------------------------------------------
Este script automatiza:
1️⃣ Ejecutar verify_environments.ps1
2️⃣ Generar environment_status.html
3️⃣ Guardar copia con fecha/hora (historial)
4️⃣ Copiar al panel QA (monitor/)
5️⃣ Publicar en Firebase Hosting
6️⃣ Registrar resultado en CSV histórico (logs\history.csv)
#>

# ========== CONFIGURACIÓN ==========
$backendPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO\taxia_cimco_backend"
$scriptsPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts"
$monitorPath = "$backendPath\monitor"
$panelTestMonitor = "C:\Users\Carlos Fuentes\ProyectosCIMCO\panel-test\public\monitor"
$reportFile = "$backendPath\environment_status.html"
$historyPath = "$backendPath\monitor\logs"

# Crear carpeta de historial si no existe
if (-not (Test-Path $historyPath)) {
    New-Item -ItemType Directory -Force -Path $historyPath | Out-Null
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " 🚦 TAXIA CIMCO - ACTUALIZADOR DE MONITOR QA" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# ========== PASO 1: Verificar entornos ==========
if (Test-Path "$scriptsPath\verify_environments.ps1") {
    Write-Host "🔍 Ejecutando verificación de entornos..." -ForegroundColor Yellow
    & "$scriptsPath\verify_environments.ps1"
} elseif (Test-Path "$backendPath\verify_environments.ps1") {
    Write-Host "🔍 Ejecutando verificación de entornos..." -ForegroundColor Yellow
    & "$backendPath\verify_environments.ps1"
} else {
    Write-Host "⚠️ No se encontró verify_environments.ps1" -ForegroundColor Red
}

# ========== PASO 2: Generar reporte ==========
if (Test-Path "$scriptsPath\generate_env_report.ps1") {
    Write-Host ""
    Write-Host "📊 Generando reporte environment_status.html..." -ForegroundColor Yellow
    & "$scriptsPath\generate_env_report.ps1"
} elseif (Test-Path "$backendPath\generate_env_report.ps1") {
    Write-Host ""
    Write-Host "📊 Generando reporte environment_status.html..." -ForegroundColor Yellow
    & "$backendPath\generate_env_report.ps1"
} else {
    Write-Host "⚠️ No se encontró generate_env_report.ps1" -ForegroundColor Red
}

# ========== PASO 3: Guardar historial HTML ==========
if (Test-Path $reportFile) {
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupName = "environment_status_$timestamp.html"
    Copy-Item $reportFile "$historyPath\$backupName" -Force
    Write-Host ""
    Write-Host "🗂️ Copia guardada en historial: $backupName" -ForegroundColor Green
}

# ========== PASO 4: Copiar al panel QA ==========
if (Test-Path $reportFile) {
    Write-Host ""
    Write-Host "📂 Copiando reporte al panel QA (monitor/)..." -ForegroundColor Yellow
    Copy-Item -Path $reportFile -Destination "$panelTestMonitor\environment_status.html" -Force
    Write-Host "✅ Reporte copiado correctamente al panel QA." -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró el archivo environment_status.html para copiar." -ForegroundColor Red
}

# ========== PASO 5: Publicar monitor ==========
if (Test-Path "$scriptsPath\publish_monitor.ps1") {
    Write-Host ""
    Write-Host "🌐 Publicando monitor QA en Firebase Hosting..." -ForegroundColor Yellow
    & "$scriptsPath\publish_monitor.ps1"
} elseif (Test-Path "$backendPath\publish_monitor.ps1") {
    Write-Host ""
    Write-Host "🌐 Publicando monitor QA en Firebase Hosting..." -ForegroundColor Yellow
    & "$backendPath\publish_monitor.ps1"
} else {
    Write-Host "⚠️ No se encontró publish_monitor.ps1" -ForegroundColor Red
}

# ========== PASO 6: Registrar en CSV histórico ==========
$csvFile = "$historyPath\history.csv"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$htmlPath = "$backendPath\environment_status.html"
$csvEntry = "$timestamp"

if (Test-Path $htmlPath) {
    $html = Get-Content $htmlPath -Raw
    $envPro = if ($html -match "\.env \(PRO\).*✅") {"OK"} else {"FALTANTE"}
    $envTest = if ($html -match "\.env\.test \(QA\).*✅") {"OK"} else {"FALTANTE"}
    $saPro = if ($html -match "serviceAccount\.json \(PRO\).*✅") {"OK"} else {"FALTANTE"}
    $saTest = if ($html -match "serviceAccount-test\.json \(QA\).*✅") {"OK"} else {"FALTANTE"}
    $firebase = if ($html -match "Firebase CLI.*✅") {"OK"} else {"FALTANTE"}

    $csvEntry += ",$envPro,$envTest,$saPro,$saTest,$firebase"
}

if (-not (Test-Path $csvFile)) {
    "FechaHora,.env(PRO),.env.test(QA),serviceAccount(PRO),serviceAccount(QA),FirebaseCLI" | Out-File -FilePath $csvFile -Encoding UTF8
}

$csvEntry | Out-File -FilePath $csvFile -Append -Encoding UTF8
Write-Host ""
Write-Host "🧾 Registro añadido al historial CSV: $csvFile" -ForegroundColor Green

# ========== FINAL ==========
Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " ✅ PROCESO COMPLETO: MONITOR QA ACTUALIZADO" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Puedes ver el panel QA en:" -ForegroundColor Yellow
Write-Host "👉 https://pelagic-chalice-467818-e1-test.web.app/monitor" -ForegroundColor Cyan
Write-Host ""
