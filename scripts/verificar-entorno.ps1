# ============================================================
# Script: verificar-entorno.ps1
# Proyecto: TAXIA-CIMCO
# Descripción: Comprueba CLI, carpetas, puertos y variables
# ============================================================

Clear-Host
Write-Host "============================================================"
Write-Host " VERIFICACIÓN DEL ENTORNO TAXIA-CIMCO "
Write-Host "============================================================"

$base = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$frontend = "$base\frontend"
$functions = "$base\functions"
$envFile = "$functions\.env"

# 1. Firebase CLI
Write-Host "`n[1] Verificando Firebase CLI..." -ForegroundColor Cyan
$firebase = Get-Command firebase -ErrorAction SilentlyContinue
if ($firebase) {
    $version = firebase --version
    Write-Host "Firebase CLI detectado: $version" -ForegroundColor Green
} else {
    Write-Host "Firebase CLI no encontrado. Instálalo con npm install -g firebase-tools" -ForegroundColor Red
}

# 2. Sesión activa
Write-Host "`n[2] Verificando sesión..." -ForegroundColor Cyan
try {
    $loginStatus = firebase login:list
    if ($loginStatus -match "Logged in as") {
        Write-Host "Sesión activa detectada." -ForegroundColor Green
    } else {
        Write-Host "No hay sesión. Ejecuta: firebase login" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error al comprobar sesión Firebase." -ForegroundColor Red
}

# 3. Carpetas
Write-Host "`n[3] Verificando estructura..." -ForegroundColor Cyan
foreach ($dir in @($frontend, $functions)) {
    if (Test-Path $dir) {
        Write-Host "OK: $dir" -ForegroundColor Green
    } else {
        Write-Host "Falta carpeta: $dir" -ForegroundColor Red
    }
}

# 4. Archivo .env
Write-Host "`n[4] Verificando archivo .env..." -ForegroundColor Cyan
if (Test-Path $envFile) {
    Write-Host ".env encontrado." -ForegroundColor Green
} else {
    Write-Host ".env no encontrado en $functions" -ForegroundColor Red
}

# 5. Scripts principales
Write-Host "`n[5] Verificando scripts esenciales..." -ForegroundColor Cyan
$scripts = @(
    "$base\scripts\alternar-entorno.ps1",
    "$base\scripts\deploy-firebase.ps1",
    "$base\scripts\iniciar-todo.ps1"
)
foreach ($file in $scripts) {
    if (Test-Path $file) {
        Write-Host "OK: $(Split-Path $file -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "Falta: $(Split-Path $file -Leaf)" -ForegroundColor Yellow
    }
}

# 6. Puertos
Write-Host "`n[6] Verificando puertos 5000, 5001, 8080..." -ForegroundColor Cyan
foreach ($p in 5000,5001,8080) {
    $used = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $p }
    if ($used) {
        Write-Host "Puerto $p ocupado." -ForegroundColor Yellow
    } else {
        Write-Host "Puerto $p libre." -ForegroundColor Green
    }
}

Write-Host "`n============================================================"
Write-Host " VERIFICACIÓN COMPLETADA "
Write-Host "============================================================"
