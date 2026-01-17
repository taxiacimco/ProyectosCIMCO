# ============================================================
# 🚀 CIMCO Launcher — Entorno Local / Producción
# Autor: Carlos Mario Fuentes García
# Descripción: Menú visual profesional para iniciar el backend
# ============================================================

Clear-Host
$Host.UI.RawUI.WindowTitle = "🚀 CIMCO Launcher — Backend Manager"

# 🎨 Colores
$cyan = "Cyan"
$green = "Green"
$yellow = "Yellow"
$red = "Red"
$blue = "Blue"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor $cyan
Write-Host "║              🚖  TAXI A CIMCO - LAUNCHER               ║" -ForegroundColor $green
Write-Host "║    Backend Manager para entornos Local y Producción    ║" -ForegroundColor $green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor $cyan
Write-Host ""

Write-Host "Selecciona el entorno que deseas iniciar:" -ForegroundColor $yellow
Write-Host " [1] 🧩 Entorno LOCAL (Emuladores Firebase)" -ForegroundColor $blue
Write-Host " [2] 🌍 Entorno PRODUCCIÓN (Firebase Cloud)" -ForegroundColor $red
Write-Host " [3] ❌ Salir" -ForegroundColor $yellow
Write-Host ""

# 🧠 Capturar selección
$choice = Read-Host "👉 Ingresa una opción (1-3)"

Switch ($choice) {
    "1" {
        Clear-Host
        Write-Host "🔧 Iniciando entorno LOCAL..." -ForegroundColor $green
        Start-Sleep -Seconds 1

        # Cargar .env.development
        if (Test-Path ".env.development") {
            Copy-Item ".env.development" ".env" -Force
            Write-Host "✅ Archivo .env.development cargado correctamente." -ForegroundColor $yellow
        } else {
            Write-Host "❌ No se encontró el archivo .env.development" -ForegroundColor $red
            exit
        }

        # Instalar dependencias
        if (Test-Path "package.json") {
            Write-Host "`n📦 Verificando dependencias..." -ForegroundColor $blue
            npm install | Out-Null
        }

        Write-Host "`n⚙️ Iniciando emuladores Firebase..." -ForegroundColor $green
        Start-Sleep -Seconds 1
        firebase emulators:start
    }

    "2" {
        Clear-Host
        Write-Host "🚀 Iniciando entorno PRODUCCIÓN..." -ForegroundColor $red
        Start-Sleep -Seconds 1

        # Cargar .env.production
        if (Test-Path ".env.production") {
            Copy-Item ".env.production" ".env" -Force
            Write-Host "✅ Archivo .env.production cargado correctamente." -ForegroundColor $yellow
        } else {
            Write-Host "❌ No se encontró el archivo .env.production" -ForegroundColor $red
            exit
        }

        # Instalar dependencias
        if (Test-Path "package.json") {
            Write-Host "`n📦 Verificando dependencias..." -ForegroundColor $blue
            npm install | Out-Null
        }

        Write-Host "`n🌎 Desplegando funciones a Firebase Cloud..." -ForegroundColor $green
        Start-Sleep -Seconds 1
        firebase deploy --only functions
    }

    "3" {
        Write-Host "`n👋 Saliendo del lanzador. ¡Hasta luego, Carlos!" -ForegroundColor $yellow
        exit
    }

    Default {
        Write-Host "`n❌ Opción inválida. Ejecuta nuevamente el script." -ForegroundColor $red
    }
}

