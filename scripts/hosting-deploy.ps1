# hosting-deploy.ps1
# Build frontend (Vite) y copiar dist -> public. Genera log en /logs.

$Root = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$Frontend = Join-Path $Root "frontend"
$Dist = Join-Path $Frontend "dist"
$Public = Join-Path $Root "public"
$Logs = Join-Path $Root "logs"

# Nombre de log con timestamp
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = Join-Path $Logs "deploy_$ts.txt"

# Asegurar logs
if (-not (Test-Path $Logs)) { New-Item -Path $Logs -ItemType Directory | Out-Null }

Start-Transcript -Path $logFile -Force
Write-Host "=== DEPLOY DE HOSTING ===" -ForegroundColor Cyan
Write-Host "Proyecto root: $Root"

# 1) Ejecutar precheck (local)
Write-Host "`n-> Ejecutando prod-precheck.ps1 ..."
& (Join-Path $Root "scripts\prod-precheck.ps1")
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prod precheck falló. Revisa y corrige." -ForegroundColor Red
    Stop-Transcript
    exit 1
}

# 2) Build frontend (Vite)
Write-Host "`n-> Construyendo frontend (npm run build) en: $Frontend"
Push-Location $Frontend
# Usa pwsh si está disponible; de lo contrario, ejecuta npm directo
if (Get-Command pwsh -ErrorAction SilentlyContinue) {
    & pwsh -NoProfile -Command "npm install; npm run build"
} else {
    & cmd /c "npm install && npm run build"
}
$buildCode = $LASTEXITCODE
Pop-Location
if ($buildCode -ne 0) {
    Write-Host "❌ Build falló (npm run build)." -ForegroundColor Red
    Stop-Transcript
    exit 1
}

# 3) Copiar dist -> public
Write-Host "`n-> Copiando $Dist -> $Public"
if (-not (Test-Path $Dist)) {
    Write-Host "❌ No existe $Dist. Verifica el build." -ForegroundColor Red
    Stop-Transcript
    exit 1
}
if (-not (Test-Path $Public)) { New-Item -Path $Public -ItemType Directory | Out-Null }

# Eliminamos sólo archivos temporales en public que sabemos manejar (opcional)
# Copy
Copy-Item -Path (Join-Path $Dist "*") -Destination $Public -Recurse -Force

Write-Host "`n✔ Deploy completado. Log: $logFile" -ForegroundColor Green
Stop-Transcript
exit 0
