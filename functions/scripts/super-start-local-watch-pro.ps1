# functions/scripts/super-start-local-watch-pro.ps1
$ErrorActionPreference = "Stop"

# --- Configuración de Rutas ---
# 💡 Importante: Define la ruta base para que sea independiente de dónde ejecutes el script.
$basePath = (Get-Item -Path $PSScriptRoot).Parent.FullName
$srcPath = Join-Path $basePath "src"
$scriptsPath = Join-Path $basePath "scripts"

Set-Location "$basePath"

# --- Variables de control ---
$serverPort = 5000 # Asumiendo el puerto 5000 por defecto de index.ts
$global:tsnodeProcess = $null
$global:isRunning = $false

Write-Host "🔹 Iniciando Backend TAXIA CIMCO (Modo Desarrollo Pro) 🔹"

# ---------------------------------------------------------
# FUNCIÓN DE DETECCIÓN DE ENDPOINTS (Mini Dashboard)
# ---------------------------------------------------------
function Get-Endpoints {
    # Lista de archivos de rutas TS
    # 💡 Buscamos en 'routes-ts' que es tu carpeta actual.
    $routeFiles = Get-ChildItem -Path $srcPath\routes-ts -Recurse -Filter '*.ts', '*.js' | Select-Object -ExpandProperty FullName
    
    $endpoints = @()
    
    # Mapeo de prefijos de Express basado en el nombre del archivo o carpeta.
    # 💥 ACTUALIZACIÓN: Se incluyen las nuevas rutas y se usa el nombre base del archivo.
    $prefixMap = @{
        "auth.routes.ts" = "/api/auth"
        "drivers.ts" = "/api/drivers"
        "rides.ts" = "/api/rides"
        "utils.ts" = "/api/utils"
        "admin.routes.ts" = "/api/admin"
        "analytics.routes.ts" = "/api/analytics"
        "despatch.routes.ts" = "/api/despatch"
        # Asumiendo que 'src/routes-ts/admin/index.js' se monta en /api/admin/
        "index.js" = "/api/admin" 
        "service.routes.ts" = "/api/service"
    }

    foreach ($file in $routeFiles) {
        $fileName = Split-Path $file -Leaf
        $fileBaseName = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
        
        # Intentar determinar el prefijo basado en el nombre del archivo
        $basePrefix = $prefixMap[$fileName]
        
        # Si no está en el mapa, intentar adivinar por el nombre de la carpeta (ej. 'admin')
        if (-not $basePrefix) {
            $parentDir = Split-Path $file -Parent | Split-Path -Leaf
            if ($parentDir -ne "routes-ts" -and $parentDir -ne "src") {
                # Ejemplo: Si el archivo está en routes-ts/admin/, usar /api/admin
                $basePrefix = "/api/$parentDir" 
            }
        }

        if (-not $basePrefix) { 
            continue 
        }
        
        # 💡 Corrección: Forzar la lectura de contenido sin problemas de encoding
        $content = Get-Content $file -Raw -Encoding UTF8
        
        # Buscar métodos HTTP y rutas (ej: .get('/status') o .post('/'))
        # Nota: Esto cubre tanto el formato JS como TS.
        $matches = [regex]::Matches($content, '(\.get|\.post|\.put|\.delete|\.patch)\((["''])(?<route>.*?)\2')
        
        foreach ($match in $matches) {
            $route = $match.Groups["route"].Value
            $method = $match.Groups[1].Value.TrimStart('.').ToUpper()
            
            # Construir el endpoint completo
            $fullEndpoint = $basePrefix + $route
            if ($route -eq "/" -and $fullEndpoint -ne $basePrefix) { $fullEndpoint = $basePrefix } # Evitar /api/auth/
            
            # Si el archivo es index.js/ts dentro de una carpeta, el prefijo ya incluye la carpeta (ej: /api/admin)
            if ($fileName -eq "index.js" -or $fileName -eq "index.ts") { 
                if ($route -ne "/") {
                    $fullEndpoint = $basePrefix + $route 
                } else {
                    $fullEndpoint = $basePrefix # Mapea /api/admin a la ruta raíz de ese sub-router
                }
            }
            
            $endpoints += [PSCustomObject]@{
                Method = $method
                Endpoint = $fullEndpoint
                Source = $fileName
            }
        }
    }
    # 💡 Añadimos la ruta raíz de Express que está en server.ts (si aún se usa) o index.ts
    $endpoints += [PSCustomObject]@{ Method = "GET"; Endpoint = "/"; Source = "index.ts" }
    
    return $endpoints | Sort-Object Endpoint
}

# ---------------------------------------------------------
# FUNCIÓN DE REINICIO DE TS-NODE
# ---------------------------------------------------------
function Start-TSNode {
    if ($global:tsnodeProcess -ne $null) {
        Write-Host "♻️ Reiniciando ts-node (PID: $($global:tsnodeProcess.Id))..."
        Stop-Process -Id $global:tsnodeProcess.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
    
    # 1. Compilar TypeScript primero para detectar errores antes de arrancar
    Write-Host "🔨 Compilando TypeScript..."
    # 💥 CORRECCIÓN: Usamos el tsconfig.json de la raíz de functions/
    npx tsc --project tsconfig.json --noEmit
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Errores de compilación detectados. Servidor NO iniciado." -ForegroundColor Red
        return
    }
    
    Write-Host "✅ Compilación OK. Levantando Express..." -ForegroundColor Green
    
    # 2. Levantar ts-node en un nuevo proceso y mantener la referencia
    # 💥 CORRECCIÓN: Usamos el entry point principal (Asumiendo que es index.ts)
    $global:tsnodeProcess = Start-Process "npx" -ArgumentList "ts-node ./src/index.ts" -PassThru
    $global:isRunning = $true
    Start-Sleep -Seconds 1 

    # 3. Mostrar Dashboard de Rutas
    $endpoints = Get-Endpoints
    Clear-Host 

    Write-Host "=========================================================" -ForegroundColor Yellow
    Write-Host "🚀 TAXIA CIMCO API - Backend Listo" -ForegroundColor Cyan
    Write-Host "🏠 Host: http://localhost:$serverPort" -ForegroundColor Cyan
    Write-Host "=========================================================" -ForegroundColor Yellow
    
    # Mostrar el Dashboard
    $endpoints | Format-Table -AutoSize
    
    Write-Host "=========================================================" -ForegroundColor Yellow
    Write-Host "👀 Watcher Activo. Presiona Ctrl+C para detener." -ForegroundColor White
    Write-Host "---------------------------------------------------------" -ForegroundColor DarkGray
}

# ---------------------------------------------------------
# INICIO DEL PROCESO
# ---------------------------------------------------------

# Abrir navegador (solo la primera vez)
Start-Process "http://localhost:$serverPort/" 

# Levantar backend la primera vez
Start-TSNode

# Watcher para reinicio automático
Write-Host "⏳ Esperando cambios en .ts para reinicio automático..."
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $srcPath
$watcher.IncludeSubdirectories = $true
$watcher.Filter = "*.ts"
$watcher.EnableRaisingEvents = $true

# Asignar acciones al watcher
$action = { 
    Write-Host "🚨 Archivo modificado. Iniciando reinicio controlado..." -ForegroundColor DarkYellow
    Start-TSNode 
}
Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Created" -Action $action
Register-ObjectEvent $watcher "Deleted" -Action $action

# Mantener el script en ejecución (filtrando los Jobs de PowerShell)
while ($true) { 
    # Detener y limpiar los jobs de eventos que se acumulan
    Get-Job | Where-Object { $_.State -eq 'NotStarted' } | Remove-Job -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5 
}