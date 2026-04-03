# ==================================================================
# ✅ Super Start Local Watch - TAXIA CIMCO (Optimizado v2.2)
# ==================================================================
# Modificación: Filtrado selectivo de carpetas para evitar bucles de logs.

$ErrorActionPreference = "Stop"

# ----------------------------------------------------
# 0️⃣ Rutas y Configuración Dinámica
# ----------------------------------------------------
$basePath = (Get-Item -Path $PSScriptRoot).Parent.FullName
$srcPath = Join-Path $basePath "src"
$logPath = Join-Path $basePath "logs"
$scriptsPath = Join-Path $basePath "scripts"

Set-Location $basePath
Write-Host "`n🚀 [CIMCO] Iniciando Backend en modo Vigilancia (Watch)..." -ForegroundColor Cyan

# 1️⃣ Limpieza Profunda Preventiva
Write-Host "🧹 Limpiando procesos huérfanos..." -ForegroundColor Gray
pwsh -ExecutionPolicy Bypass -File (Join-Path $scriptsPath "port-killer.ps1") -ErrorAction SilentlyContinue

# 2️⃣ Gestión de Logs
if (Test-Path $logPath) {
    Remove-Item (Join-Path $logPath "*.log") -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $logPath -Force
}

# 3️⃣ Función Maestra de Reinicio Controlado
$global:tsnodeProcess = $null
$global:lastChange = Get-Date

function Start-TSNode {
    # Evitar reinicios múltiples en menos de 2 segundos (Protección de Teclado)
    $timeSinceLast = (Get-Date) - $global:lastChange
    if ($timeSinceLast.TotalSeconds -lt 2 -and $global:tsnodeProcess) { return }
    $global:lastChange = Get-Date

    if ($global:tsnodeProcess) {
        Write-Host "♻️ Reiniciando servidor ts-node..." -ForegroundColor Yellow
        Stop-Process -Id $global:tsnodeProcess.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
    
    Write-Host "🔨 Verificando sintaxis TypeScript..." -ForegroundColor Gray
    npx tsc --project tsconfig.json --noEmit

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error de compilación detectado. Servidor en espera." -ForegroundColor Red
        return
    }

    Write-Host "✅ Backend Online en puerto 3000" -ForegroundColor Green
    $global:tsnodeProcess = Start-Process "npx" -ArgumentList "ts-node ./src/server.ts" -PassThru -NoNewWindow
}

# 4️⃣ Inicialización
Start-TSNode
Start-Process "http://localhost:3000/" -ErrorAction SilentlyContinue

# 5️⃣ Watcher Inteligente con Filtros (ACTO 1)
# ------------------------------------------------------------------
Write-Host "👀 Vigilando cambios en: $srcPath (Ignorando Logs/Dist/Modules)" -ForegroundColor DarkGray
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $srcPath
$watcher.Filter = "*.*" # Vigilamos todos los archivos en SRC
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# ESTA ES LA CLAVE: El filtro de eventos que evita el bucle infinito
$action = { 
    $fullPath = $Event.SourceEventArgs.FullPath
    $fileName = $Event.SourceEventArgs.Name
    
    # 🚫 FILTRO DE SEGURIDAD: 
    # Si el cambio ocurre en carpetas de sistema, ignorar para no saturar el PC
    if ($fullPath -match "logs" -or $fullPath -match "node_modules" -or $fullPath -match "dist" -or $fullPath -match ".git") {
        return 
    }

    Write-Host "📝 Cambio válido detectado en: $fileName" -ForegroundColor DarkYellow
    Start-TSNode 
}

# Limpiar suscripciones viejas antes de crear nuevas
Unregister-Event -SourceIdentifier "CimcoWatch" -ErrorAction SilentlyContinue
Register-ObjectEvent $watcher "Changed" -SourceIdentifier "CimcoWatch" -Action $action
Register-ObjectEvent $watcher "Created" -SourceIdentifier "CimcoWatch" -Action $action
Register-ObjectEvent $watcher "Deleted" -SourceIdentifier "CimcoWatch" -Action $action

Write-Host "🎯 Sistema Activo. Ctrl+C para detener." -ForegroundColor White

# 6️⃣ Bucle de Mantenimiento de Memoria (Antilag)
try {
    while ($true) { 
        [System.GC]::Collect() 
        Start-Sleep -Seconds 2 
    }
} finally {
    Write-Host "`n🛑 Cerrando monitor y limpiando recursos..." -ForegroundColor Red
    if ($global:tsnodeProcess) { Stop-Process -Id $global:tsnodeProcess.Id -Force -ErrorAction SilentlyContinue }
    Unregister-Event -SourceIdentifier "CimcoWatch" -ErrorAction SilentlyContinue
    $watcher.Dispose()
}