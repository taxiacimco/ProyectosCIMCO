# ==================================================================
# Super Start Local Watch - TAXIA CIMCO
# ==================================================================
$ErrorActionPreference = "Stop"

# ----------------------------------------------------
# 0️⃣ Rutas y Configuración
# ----------------------------------------------------
# 💡 Hacemos la ruta base dinámica (se establece en el directorio 'functions' si se ejecuta desde 'scripts')
$basePath = (Get-Item -Path $PSScriptRoot).Parent.FullName
$srcPath = Join-Path $basePath "src"
$logPath = Join-Path $basePath "logs"
$scriptsPath = Join-Path $basePath "scripts"

Set-Location $basePath
Write-Host "🔹 Reiniciando backend local con watch - TAXIA CIMCO 🔹"

# 1️⃣ Limpieza inicial de puertos
Write-Host "🧹 Limpiando puertos antes de iniciar (modo watch)..."
pwsh -ExecutionPolicy Bypass -File (Join-Path $scriptsPath "port-killer.ps1") -ErrorAction SilentlyContinue

# 2️⃣ Limpiar logs
if (Test-Path $logPath) {
    Get-ChildItem $logPath -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
    Write-Host "🧹 Logs limpiados en $logPath"
}

# 3️⃣ Fix imports
$fixScript = Join-Path $scriptsPath "fix-firebase-imports.ps1"
if (Test-Path $fixScript) {
    Write-Host "🛠 Aplicando fix de Firebase..."
    pwsh -ExecutionPolicy Bypass -File $fixScript -ErrorAction SilentlyContinue
}

# 4️⃣ Función para reiniciar ts-node (Ahora incluye la verificación de TS)
$global:tsnodeProcess = $null
function Start-TSNode {
    if ($global:tsnodeProcess) {
        Write-Host "♻️ Deteniendo ts-node..."
        Stop-Process -Id $global:tsnodeProcess.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 300
    }
    
    # 💥 Compilar y verificar errores antes de levantar
    Write-Host "🔨 Compilando y verificando TypeScript..."
    npx tsc --project tsconfig.json --noEmit

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Errores de compilación detectados. Servidor NO iniciado." -ForegroundColor Red
        return
    }

    Write-Host "✅ Compilación OK. Levantando Express en puerto 3000..." -ForegroundColor Green
    
    # Levantar ts-node
    # Nota: Usamos Start-Process directamente con npx para evitar abrir una ventana extra de pwsh,
    # aunque esto puede variar según la configuración de su terminal.
    $global:tsnodeProcess = Start-Process "npx" -ArgumentList "ts-node ./src/server.ts" -PassThru
}

# 5️⃣ Abrir navegador una sola vez
Start-Process "http://localhost:3000/" -ErrorAction SilentlyContinue

# 6️⃣ Iniciar backend la primera vez
Start-TSNode

# 7️⃣ Watcher
Write-Host "👀 Watcher activo. Esperando cambios en $srcPath..."
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $srcPath
$watcher.Filter = "*.ts"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Acción para todos los eventos del Watcher
$action = { 
    Write-Host "🔄 Archivo modificado → Reiniciando controladamente..." -ForegroundColor DarkYellow
    Start-TSNode 
}

Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Created" -Action $action
Register-ObjectEvent $watcher "Deleted" -Action $action

Write-Host "🎯 Backend listo con watch. Ctrl+C para detener y limpiar." -ForegroundColor White

# Mantener el script en ejecución
while ($true) { 
    # Detener y limpiar los jobs de eventos que se acumulan
    Get-Job | Where-Object { $_.State -eq 'NotStarted' } | Remove-Job -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5 
}