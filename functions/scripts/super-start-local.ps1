# ==================================================================
# SUPER START LOCAL – TAXIA CIMCO
# ==================================================================
$ErrorActionPreference = "Stop"

# ----------------------------------------------------
# 0️⃣ Rutas principales
# ----------------------------------------------------
# 💡 Define la ruta base en base a la ubicación del script
$basePath = (Get-Item -Path $PSScriptRoot).FullName
$srcPath      = Join-Path $basePath "src"
$logPath      = Join-Path $basePath "logs"
$scriptsPath  = Join-Path $basePath "scripts"

Write-Host "🧹 Limpiando puertos antes de iniciar..."

# ----------------------------------------------------
# 1️⃣ Ejecutar port killer (Requiere port-killer.ps1 en scripts/)
# ----------------------------------------------------
$portKillerScript = Join-Path $scriptsPath "port-killer.ps1"
if (Test-Path $portKillerScript) {
    pwsh -ExecutionPolicy Bypass -File $portKillerScript -ErrorAction SilentlyContinue
    Write-Host "🧹 Puertos limpiados (Asumiendo 3000 y 5000)."
} else {
    Write-Host "⚠️ No se encontró port-killer.ps1. Continuando..." -ForegroundColor DarkYellow
}

Write-Host "🔹 Reiniciando backend local - TAXIA CIMCO 🔹"

# ----------------------------------------------------
# 2️⃣ Limpiar logs
# ----------------------------------------------------
if (Test-Path $logPath) {
    Get-ChildItem $logPath -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
    Write-Host "🧹 Logs limpiados en $logPath"
}

# ----------------------------------------------------
# 3️⃣ Ejecutar fix-firebase-imports (Requiere fix-firebase-imports.ps1 en scripts/)
# ----------------------------------------------------
$fixScript = Join-Path $scriptsPath "fix-firebase-imports.ps1"
if (Test-Path $fixScript) {
    Write-Host "🛠 Aplicando fix de Firebase..."
    pwsh -ExecutionPolicy Bypass -File $fixScript -ErrorAction SilentlyContinue
} else {
    Write-Host "⚠️ No se encontró fix-firebase-imports.ps1. Continuando..." -ForegroundColor DarkYellow
}

# ----------------------------------------------------
# 4️⃣ Compilar TypeScript
# ----------------------------------------------------
Write-Host "🔨 Compilando TypeScript..."

# 💥 CORRECCIÓN: Usamos el tsconfig.json de la carpeta functions (o el que corresponda a este nivel)
# Si este script se ejecuta desde functions/, entonces usamos tsconfig.json de la raíz.
Set-Location $basePath
npx tsc --project tsconfig.json
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error de compilación. Revisa los errores y vuelve a ejecutar." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Sin errores en TypeScript. Archivos JS generados en /lib." -ForegroundColor Green

# ----------------------------------------------------
# 5️⃣ Iniciar servidor local con ts-node
# ----------------------------------------------------
Write-Host "🚀 Levantando backend en puerto 3000..."

# Arrancamos ts-node desde la carpeta functions/
Start-Process "pwsh" -ArgumentList "-NoExit", "-Command", "cd $basePath; npx ts-node ./src/server.ts"

# ----------------------------------------------------
# 6️⃣ Abrir navegador
# ----------------------------------------------------
Start-Process "http://localhost:3000/"

Write-Host "🎯 Backend local listo."