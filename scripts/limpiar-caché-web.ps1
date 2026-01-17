# ============================================================
# Script: limpiar-caché-web.ps1
# Descripción: Limpia caché de Chrome, elimina Service Workers
#              y abre navegador limpio apuntando a TAXIA-CIMCO
# Autor: Carlos Mario Fuentes García
# ============================================================

$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  🧹 LIMPIEZA DE CACHÉ Y SERVICE WORKERS - TAXIA-CIMCO" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

# ------------------------------------------------------------
# 🔹 1. Cerrar Chrome si está abierto
# ------------------------------------------------------------
Write-Host "`n🧩 Cerrando procesos activos de Chrome..." -ForegroundColor Gray
Get-Process "chrome" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# ------------------------------------------------------------
# 🔹 2. Limpiar caché de Chrome
# ------------------------------------------------------------
$chromePaths = @(
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache",
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache",
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Service Worker"
)

Write-Host "🗑️  Eliminando caché de Chrome..." -ForegroundColor Gray

foreach ($p in $chromePaths) {
    if (Test-Path $p) {
        Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue
        Write-Host "   ✔️ Limpieza: $p" -ForegroundColor DarkGray
    }
}

# ------------------------------------------------------------
# 🔹 3. Limpiar caché del proyecto local
# ------------------------------------------------------------
$appCachePath = ".\frontend\public\cache"

if (Test-Path $appCachePath) {
    Remove-Item -Recurse -Force $appCachePath -ErrorAction SilentlyContinue
    Write-Host "   ✔️ Caché local del proyecto eliminada." -ForegroundColor DarkGray
}

# ------------------------------------------------------------
# 🔹 4. Eliminar Service Workers
# ------------------------------------------------------------
Write-Host "`n🧼 Eliminando Service Workers..." -ForegroundColor Gray
$serviceWorkerDirs = @(
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Service Worker",
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Storage\ext"
)

foreach ($dir in $serviceWorkerDirs) {
    if (Test-Path $dir) {
        Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
        Write-Host "   🧽 Eliminado: $dir" -ForegroundColor DarkGray
    }
}

# ------------------------------------------------------------
# 🔹 5. Abrir Chrome limpio en localhost
# ------------------------------------------------------------
Write-Host "`n🌐 Abriendo navegador limpio en localhost..." -ForegroundColor Green

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$localUrl = "http://127.0.0.1:5000"

if (Test-Path $chromePath) {
    Start-Process $chromePath "--new-window --incognito --disable-extensions --user-data-dir=""$env:TEMP\chrometemp"" $localUrl"
    Write-Host "✅ Chrome iniciado limpio e incógnito." -ForegroundColor Green
} else {
    Write-Host "❌ Chrome no encontrado en: $chromePath" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ Limpieza completada con éxito." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
