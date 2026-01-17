# ============================================================
# Script: fix-local-cors.ps1
# Descripción: Limpia caché, alterna entorno y abre entorno local (Emulator o Live Server)
# Autor: Carlos Mario Fuentes García
# ============================================================

param(
    [string]$modo = "dev"
)

# Configurar UTF8 para evitar problemas de caracteres especiales en PowerShell
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  🚀 FIX LOCAL CORS & CACHE - TAXIA-CIMCO" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

# 🔹 1. LIMPIEZA PREVIA
Write-Host ""
Write-Host "🧹 Limpiando caché y service workers..." -ForegroundColor Yellow
if (Test-Path "./limpiar-caché-web.ps1") {
    # El operador & es necesario para ejecutar scripts locales
    & "./limpiar-caché-web.ps1"
} else {
    Write-Host "⚠️ No se encontró limpiar-caché-web.ps1, omitiendo limpieza." -ForegroundColor DarkYellow
}

# 🔹 2. ALTERNAR ENTORNO
Write-Host ""
Write-Host "🔧 Activando entorno: $modo ..." -ForegroundColor Yellow
if (Test-Path "./alternar-entorno.ps1") {
    # Pasa el modo al script alternar-entorno.ps1
    & "./alternar-entorno.ps1" $modo
} else {
    Write-Host "⚠️ No se encontró alternar-entorno.ps1, se omitirá el cambio de entorno." -ForegroundColor DarkYellow
}

# 🔹 3. ARRANQUE DEL ENTORNO LOCAL
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
if ($modo -eq "dev") {
    Write-Host "🧩 Iniciando entorno de desarrollo..." -ForegroundColor Green

    # Verificar si Firebase CLI está disponible
    $firebase = Get-Command "firebase" -ErrorAction SilentlyContinue
    if ($firebase) {
        Write-Host "🔥 Firebase CLI detectado. Iniciando emuladores..." -ForegroundColor Cyan
        # Iniciar emuladores en un nuevo proceso de PowerShell
        Start-Process powershell -ArgumentList "firebase emulators:start"
        # Esperar un poco para que el emulador inicie el host de funciones
        Start-Sleep -Seconds 4
        # Abrir navegador en la URL del host local, asumiendo que el hosting estÃ¡ en 5000
        Start-Process "chrome.exe" "http://127.0.0.1:5000"
    } else {
        Write-Host "⚠️ Firebase CLI no detectado. Probando Live Server desde VS Code..." -ForegroundColor DarkYellow

        # Buscar instalación de VS Code
        $vscode = Get-Command "code" -ErrorAction SilentlyContinue
        if ($vscode) {
            Write-Host "💡 Ejecutando Live Server en VS Code..." -ForegroundColor Cyan
            # Abrir VS Code en el archivo que quieres previsualizar
            Start-Process "code" -ArgumentList "--reuse-window", "--goto", "frontend/public/conductor/mototaxi.html"
            # **AQUÍ ESTABA EL ERROR DE SINTAXIS:** Se corrigieron las comillas.
            Write-Host "🌐 Luego haz clic en 'Go Live' (abajo a la derecha en VS Code)." -ForegroundColor Gray
        } else {
            Write-Host "❌ VS Code no detectado. No se puede iniciar Live Server." -ForegroundColor Red
        }
    }
} else {
    Write-Host "🌍 Entorno de producción activado. Puedes ejecutar:" -ForegroundColor Yellow
    Write-Host "   ./deploy-firebase-pro.ps1" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ Proceso completado. Entorno: $modo" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan