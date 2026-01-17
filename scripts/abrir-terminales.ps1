# =========================================================
# Script: abrir-terminales.ps1
# Autor: Carlos Mario Fuentes García
# Descripción: Abre dos terminales automáticas: 
# 1️⃣ Emulador Firebase 
# 2️⃣ Consola libre para desarrollo o pruebas
# =========================================================

# Ruta base del proyecto
$projectPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO"

# Mostrar título visual
Write-Host ""
Write-Host "🚀 Iniciando entorno de desarrollo CIMCO..." -ForegroundColor Cyan
Write-Host "Abrirá dos terminales automáticas:" -ForegroundColor Yellow
Write-Host "  [1] Emulador Firebase" -ForegroundColor Green
Write-Host "  [2] Consola de desarrollo (libre)" -ForegroundColor Magenta
Write-Host ""

# Primera terminal → Emulador Firebase
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath\functions'; npm run serve"

# Pequeña pausa para asegurar el arranque del emulador
Start-Sleep -Seconds 3

# Segunda terminal → Libre para comandos de desarrollo
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host '🧩 Terminal lista para comandos de desarrollo (VSCode, Git, etc.)' -ForegroundColor Cyan"
