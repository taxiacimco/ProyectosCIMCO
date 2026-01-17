# ============================================================
# Script: verificar-entorno-pro.ps1
# Proyecto: TAXIA-CIMCO
# Descripción: Verifica entorno antes del despliegue y analiza estado de Firebase
# Autor: Carlos Mario Fuentes García
# ============================================================

Clear-Host
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " VERIFICANDO ENTORNO DE DESPLIEGUE TAXIA-CIMCO" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

function Comprobar($nombre, $comando, $requerido = $true) {
    try {
        $salida = & $comando 2>$null
        if ($salida) {
            Write-Host "✅ $nombre detectado correctamente."
        } else {
            if ($requerido) {
                Write-Host "❌ $nombre no encontrado. Instálalo antes de continuar." -ForegroundColor Red
            } else {
                Write-Host "⚠️  $nombre no encontrado (opcional)." -ForegroundColor Yellow
            }
        }
    } catch {
        if ($requerido) {
            Write-Host "❌ $nombre no disponible. Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# 🔹 Comprobaciones principales
Comprobar "Node.js" { node -v }
Comprobar "Git" { git --version }
Comprobar "Firebase CLI" { firebase --version }

# 🔹 Comprobación de archivos .env
$envDir = "C:\Users\Carlos Fuentes\ProyectosCIMCO\functions"
$envFile = "$envDir\.env"
$envProd = "$envDir\.env.production"

if (Test-Path $envFile) {
    Write-Host "✅ Archivo .env activo encontrado en $envDir"
} else {
    Write-Host "⚠️  Archivo .env no encontrado. Debes activar un entorno antes de desplegar." -ForegroundColor Yellow
}

if (Test-Path $envProd) {
    Write-Host "✅ Archivo .env.production encontrado."
    $vars = Get-Content $envProd | Where-Object { $_ -match "=" }
    Write-Host "   Variables detectadas en producción: $($vars.Count)"
} else {
    Write-Host "⚠️  No existe .env.production. Crea uno antes del despliegue." -ForegroundColor Yellow
}

# 🔹 Estado de sesión Firebase
Write-Host "`nComprobando sesión Firebase..." -ForegroundColor Cyan
try {
    $login = firebase login:list
    if ($login -match "Logged in as") {
        Write-Host "✅ Sesión activa detectada."
    } else {
        Write-Host "⚠️  No hay sesión activa. Ejecuta: firebase login" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error al verificar sesión Firebase." -ForegroundColor Red
}

# 🔹 Logs del último despliegue
Write-Host "`nAnalizando logs del último despliegue..." -ForegroundColor Cyan
$logFile = "C:\Users\Carlos Fuentes\ProyectosCIMCO\firebase-debug.log"
if (Test-Path $logFile) {
    $fecha = (Get-Item $logFile).LastWriteTime
    Write-Host "✅ Log de despliegue encontrado ($fecha)."
    $lineas = Get-Content $logFile | Select-Object -Last 3
    Write-Host "Últimas líneas:"
    $lineas | ForEach-Object { Write-Host "   $_" }
} else {
    Write-Host "⚠️  No se encontró firebase-debug.log. Se generará al hacer un deploy." -ForegroundColor Yellow
}

# 🔹 Estado de Hosting
Write-Host "`nConsultando estado del Hosting Firebase..." -ForegroundColor Cyan
try {
    $hostingInfo = firebase hosting:sites:list 2>$null
    if ($hostingInfo) {
        Write-Host "✅ Hosting activo detectado:"
        $hostingInfo | ForEach-Object { Write-Host "   $_" }
    } else {
        Write-Host "⚠️  No se detectó hosting activo o no tienes permisos." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error al consultar hosting. Verifica tu conexión o permisos." -ForegroundColor Red
}

Write-Host "`n============================================================"
Write-Host " VERIFICACIÓN PROFESIONAL COMPLETADA "
Write-Host "============================================================"
Write-Host "Si todo aparece con ✅ puedes ejecutar:"
Write-Host "   ./deploy-firebase.ps1"
Write-Host "============================================================"
