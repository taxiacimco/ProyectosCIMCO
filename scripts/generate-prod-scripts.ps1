# ================================
# GENERADOR AUTOMÁTICO DE SCRIPTS
# ================================
Write-Host "▶ Generando scripts profesionales..." -ForegroundColor Cyan

$Scripts = @{
    "prod-precheck.ps1" = @'
Write-Host "=== PRECHECK DE PRODUCCIÓN ===" -ForegroundColor Yellow

# Validar carpetas
$required = @(
    "..\frontend",
    "..\public"
)

foreach ($folder in $required) {
    if (-not (Test-Path $folder)) {
        Write-Host "❌ Falta carpeta: $folder" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✔ Carpetas OK" -ForegroundColor Green

# Validar Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node no está instalado" -ForegroundColor Red
    exit 1
}

Write-Host "✔ Node encontrado" -ForegroundColor Green
Write-Host "PRECHECK COMPLETO" -ForegroundColor Green
'@

    "hosting-deploy.ps1" = @'
param(
    [string]$LogFolder = "..\logs"
)

# Crear carpeta de logs
if (-not (Test-Path $LogFolder)) {
    New-Item -ItemType Directory -Path $LogFolder | Out-Null
}

# Rotación de logs (dejar solo 10)
$logs = Get-ChildItem $LogFolder -Filter "deploy_*.txt"
if ($logs.Count -gt 10) {
    $logs | Sort-Object LastWriteTime | Select-Object -First ($logs.Count - 10) | Remove-Item
}

$timestamp = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
$logFile = "$LogFolder/deploy_$timestamp.txt"

Start-Transcript -Path $logFile

Write-Host "=== DEPLOY DE HOSTING ===" -ForegroundColor Yellow

# Build frontend
Push-Location "../frontend"
npm install
npm run build
Pop-Location

# Copiar dist → public
Copy-Item "../frontend/dist/*" "../public" -Recurse -Force

Write-Host "✔ Deploy completado" -ForegroundColor Green
Stop-Transcript
'@

    "reparar-hosting.ps1" = @'
param(
    [bool]$DryRun = $true,
    [string]$Target = "..\public"
)

Write-Host "=== REPARAR HOSTING ===" -ForegroundColor Yellow
Write-Host "DryRun = $DryRun" -ForegroundColor Cyan

if (-not (Test-Path $Target)) {
    Write-Host "❌ No existe la carpeta /public" -ForegroundColor Red
    exit 1
}

$items = Get-ChildItem $Target

if ($DryRun) {
    Write-Host "🔎 PREVISUALIZACIÓN — Esto es lo que se eliminaría:"
    $items | ForEach-Object { Write-Host " - $_" }
    exit 0
}

Write-Host "🗑 Eliminando archivos viejos..."
$items | Remove-Item -Recurse -Force

Write-Host "✔ Public limpio" -ForegroundColor Green
'@
}

foreach ($script in $Scripts.Keys) {
    $path = ".\$script"
    Set-Content -Path $path -Value $Scripts[$script] -Encoding UTF8
    Write-Host "✔ Script generado: $path" -ForegroundColor Green
}

Write-Host "🎉 TODOS LOS SCRIPTS HAN SIDO GENERADOS"
