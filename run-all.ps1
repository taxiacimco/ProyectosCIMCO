# =============================================================================
# script: run-all.ps1 (VERSIÓN MULTI-LANZADOR)
# =============================================================================

Clear-Host
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   SISTEMA INTEGRADO TAXIA CIMCO - FINAL" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# --- 0. LIMPIEZA DE PUERTOS ---
Write-Host "[0/4] Limpiando procesos previos..." -ForegroundColor Yellow
$ports = @(4000, 5001, 8080, 9099, 5000, 4400, 4500, 5173)
foreach ($port in $ports) {
    $procId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
    if ($procId) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

# --- 1. CONFIGURACIÓN DE WEBHOOK ---
$BASE_DIR = Get-Location
$WEBHOOK_URL = "http://localhost:5001/pelagic-chalice-467818-e1/us-central1/api/webhook"
$dotenvPath = Join-Path $BASE_DIR "functions/.env"

if (Test-Path (Join-Path $BASE_DIR "functions")) {
    "WEBHOOK_URL=$WEBHOOK_URL" | Out-File -FilePath $dotenvPath -Encoding utf8
    Write-Host "[1/4] ✓ Webhook configurado para el nuevo ID de proyecto." -ForegroundColor Green
}

# --- 2. INICIAR EMULADORES ---
Write-Host "[2/4] Iniciando Emuladores de Firebase..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "firebase emulators:start"
Start-Sleep -Seconds 8

# --- 3. INICIAR API (BACKEND) ---
Write-Host "[3/4] Iniciando API Backend (Puerto 8080)..." -ForegroundColor Yellow
$apiDir = Join-Path $BASE_DIR "api"
if (Test-Path $apiDir) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$apiDir'; npm run dev"
}

# --- 4. INICIAR FRONTEND (INTERFAZ) ---
Write-Host "[4/4] Buscando e Iniciando Frontend..." -ForegroundColor Yellow
$frontDir = Join-Path $BASE_DIR "frontend"
if (Test-Path $frontDir) {
    # Intentamos lanzar el frontend. Si usa Vite suele ser puerto 5173
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontDir'; npm run dev"
    Write-Host "🚀 ¡TODO EN MARCHA!" -ForegroundColor Cyan
    Write-Host "   1. Emuladores: http://127.0.0.1:4000" -ForegroundColor Gray
    Write-Host "   2. Frontend:   Ver nueva ventana de terminal" -ForegroundColor Gray
} else {
    Write-Host "   X No se encontró la carpeta 'frontend'. Verifica el nombre." -ForegroundColor Red
}