# prod-precheck.ps1
# Validaciones básicas antes de build/deploy

$Root = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$Frontend = Join-Path $Root "frontend"
$Public = Join-Path $Root "public"
$Logs = Join-Path $Root "logs"
$ServiceAccount = Join-Path $Root "serviceAccountKey.json"

Write-Host "=== PRECHECK DE PRODUCCIÓN ===" -ForegroundColor Cyan

# 1. Paths
Write-Host "Root: $Root"
Write-Host "Frontend: $Frontend"
Write-Host "Public: $Public"
Write-Host "Logs: $Logs"

# 2. Comprueba frontend
if (-not (Test-Path $Frontend)) {
    Write-Host "❌ Falta carpeta Frontend: $Frontend" -ForegroundColor Red
    exit 1
} else { Write-Host "✔ Frontend OK" -ForegroundColor Green }

# 3. Comprueba public (no fatal)
if (-not (Test-Path $Public)) {
    Write-Host "⚠️ Advertencia: No existe carpeta public (se creará). Ruta: $Public" -ForegroundColor Yellow
} else { Write-Host "✔ Public OK" -ForegroundColor Green }

# 4. Service account
if (-not (Test-Path $ServiceAccount)) {
    Write-Host "❌ Falta serviceAccountKey.json en root." -ForegroundColor Red
    exit 1
} else { Write-Host "✔ serviceAccountKey.json OK" -ForegroundColor Green }

# 5. Logs folder
if (-not (Test-Path $Logs)) {
    Write-Host "Creando carpeta logs en: $Logs" -ForegroundColor Yellow
    New-Item -Path $Logs -ItemType Directory | Out-Null
} else { Write-Host "✔ Logs OK" -ForegroundColor Green }

Write-Host "`nPRECHECK COMPLETADO." -ForegroundColor Cyan
exit 0
