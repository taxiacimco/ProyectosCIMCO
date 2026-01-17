# ============================================================
# Script: limpiar-proyecto.ps1
# Descripción: Limpia artefactos de compilación, logs y temporales
# Proyecto: TAXIA-CIMCO Backend
# Autor: Carlos Mario Fuentes García
# ============================================================

Write-Host "🧹 Iniciando limpieza del proyecto..." -ForegroundColor Cyan

# 1️⃣ Eliminar carpeta dist
$distPath = "dist"
if (Test-Path $distPath) {
    Remove-Item -Recurse -Force $distPath
    Write-Host "Carpeta 'dist' eliminada correctamente." -ForegroundColor Green
} else {
    Write-Host "No existe la carpeta 'dist'." -ForegroundColor Yellow
}

# 2️⃣ Eliminar carpeta build (si existe)
$buildPath = "build"
if (Test-Path $buildPath) {
    Remove-Item -Recurse -Force $buildPath
    Write-Host "Carpeta 'build' eliminada correctamente." -ForegroundColor Green
}

# 3️⃣ Eliminar logs generados
$logPaths = @(
    "logs",
    ".logs",
    "debug.log",
    "error.log",
    "npm-debug.log"
)
foreach ($path in $logPaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "Eliminado: $path" -ForegroundColor Green
    }
}

# 4️⃣ Eliminar carpeta temporal
$tempPath = "temp"
if (Test-Path $tempPath) {
    Remove-Item -Recurse -Force $tempPath
    Write-Host "Carpeta temporal eliminada correctamente." -ForegroundColor Green
}

# 5️⃣ Mensaje final
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Limpieza completada correctamente." -ForegroundColor Yellow
Write-Host "Ejecuta ahora: npm run build" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
