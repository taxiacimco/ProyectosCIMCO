# create-prod-scripts.ps1
# Generador automático: crea los scripts de producción en ./scripts
# Ejecuta desde la raíz del proyecto (C:\Users\Carlos Fuentes\ProyectosCIMCO)

$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$TargetDir = Join-Path $RootPath 'scripts'
$LogsDir = Join-Path $RootPath 'logs'

if (-not (Test-Path $TargetDir)) { New-Item -Path $TargetDir -ItemType Directory | Out-Null }
if (-not (Test-Path $LogsDir))  { New-Item -Path $LogsDir -ItemType Directory | Out-Null }

Write-Host "Generando scripts en: $TargetDir" -ForegroundColor Cyan

# ---------- Contenidos: cada valor es el contenido final del archivo a crear ----------
$prod_precheck = @'
# prod-precheck.ps1
# Validaciones básicas para producción
param()
$Root = "' + ($RootPath -replace '\\','\\\\') + '"
$Frontend = Join-Path $Root 'frontend'
$Dist = Join-Path $Frontend 'dist'
$Public = Join-Path $Root 'public'

Write-Host "[precheck] Root: $Root"

# 1) Node / npm
try {
    $node = (Get-Command node -ErrorAction Stop).Source
    $npm  = (Get-Command npm -ErrorAction Stop).Source
    Write-Host "[OK] Node: $node" -ForegroundColor Green
    Write-Host "[OK] npm:  $npm" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node/npm no encontrados. Instala Node.js y asegúrate que 'node' y 'npm' estén en PATH." -ForegroundColor Red
    exit 1
}

# 2) Firebase CLI
try { Get-Command firebase -ErrorAction Stop | Out-Null; Write-Host "[OK] Firebase CLI disponible." -ForegroundColor Green }
catch { Write-Host "[ERROR] firebase CLI no encontrado. Instala 'firebase-tools'." -ForegroundColor Red; exit 1 }

# 3) Frontend folder
if (-not (Test-Path $Frontend)) { Write-Host "[ERROR] Frontend no encontrado: $Frontend" -ForegroundColor Red; exit 1 }
if (-not (Test-Path (Join-Path $Frontend 'package.json'))) { Write-Host "[WARN] package.json no encontrado en frontend. Revisa tu proyecto." -ForegroundColor Yellow }

# 4) Dist folder (si existe) y public
if (Test-Path $Dist) { Write-Host "[INFO] Dist existente: $Dist" -ForegroundColor Yellow }
if (-not (Test-Path $Public)) { Write-Host "[WARN] Public no existe. El script de despliegue lo creará: $Public" -ForegroundColor Yellow }

# 5) serviceAccountKey
if (Test-Path (Join-Path $Root 'serviceAccountKey.json')) { Write-Host "[OK] serviceAccountKey.json presente." -ForegroundColor Green }
else { Write-Host "[WARN] serviceAccountKey.json NO encontrado en $Root. Revisa claves sensibles." -ForegroundColor Yellow }

Write-Host "\nPre-check finalizado correctamente." -ForegroundColor Cyan
'@

$hosting_deploy = @'
# hosting-deploy.ps1
# 1) Ejecuta build (Vite), 2) copia dist -> public, 3) limpia archivos peligrosos, 4) genera log
param()
$Root = "' + ($RootPath -replace '\\','\\\\') + '"
$Frontend = Join-Path $Root 'frontend'
$Dist = Join-Path $Frontend 'dist'
$Public = Join-Path $Root 'public'
$Logs = Join-Path $Root 'logs'

$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$logfile = Join-Path $Logs "deploy_$stamp.txt"
Write-Host "[deploy] Log: $logfile" -ForegroundColor Cyan

function Log { param($m) Add-Content -Path $logfile -Value "$(Get-Date -Format 'u')  $m" }

# Build
Push-Location $Frontend
Log "Iniciando build (npm run build) en $Frontend"
$proc = Start-Process -FilePath npm -ArgumentList 'run','build' -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -ne 0) { Log "ERROR: build falló con código $($proc.ExitCode)"; Write-Host "Build falló. Revisa el log: $logfile" -ForegroundColor Red; exit 1 }
Log "Build completado exitosamente."
Pop-Location

# Asegurar Public
if (-not (Test-Path $Public)) { New-Item -Path $Public -ItemType Directory | Out-Null; Log "Creada carpeta public." }

# Copiar dist -> public
Log "Limpiando destino parcial (solo archivos web seguros)"
# eliminar solo archivos html/js/css generados previamente (no tocamos backups ni node_modules)
Get-ChildItem -Path $Public -Recurse -File | Where-Object { $_.Extension -in '.html','.js','.css','.json','.svg','.png','.jpg','.jpeg','.webmanifest','.woff2' } | Remove-Item -Force -ErrorAction SilentlyContinue

Log "Copiando $Dist -> $Public"
Copy-Item -Path (Join-Path $Dist '*') -Destination $Public -Recurse -Force
Log "Copia finalizada."

# Post-check
Log "Contenido público: $(Get-ChildItem -Path $Public -Recurse | Measure-Object).Count archivos"
Write-Host "Despliegue local finalizado. Revisa: $logfile" -ForegroundColor Green
'@

$reparar_hosting = @'
# reparar-hosting.ps1
param(
    [switch]$DryRun = $true
)
$Root = "' + ($RootPath -replace '\\','\\\\') + '"
$Public = Join-Path $Root 'public'
if (-not (Test-Path $Public)) { Write-Host "Public no encontrado: $Public" -ForegroundColor Red; exit 1 }

$patterns = @('backup*','*backup*','*node_modules*','.DS_Store','*.zip','*coverage*')
$found = @()
foreach ($p in $patterns) { $found += Get-ChildItem -Path $Public -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -like $p } }
$found = $found | Select-Object -Unique
if ($found.Count -eq 0) { Write-Host "No se encontraron elementos a limpiar en public." -ForegroundColor Green; exit 0 }

Write-Host "Elementos detectados: $($found.Count)" -ForegroundColor Yellow
foreach ($f in $found) { Write-Host " - $($f.FullName)" }

if ($DryRun) { Write-Host "DryRun activado: no se eliminará nada. Ejecuta con -DryRun:$false para borrar." -ForegroundColor Cyan; exit 0 }

foreach ($f in $found) {
    try { Remove-Item -LiteralPath $f.FullName -Recurse -Force; Write-Host "Eliminado: $($f.FullName)" -ForegroundColor Green }
    catch { Write-Host "Error al eliminar: $($f.FullName) — $($_.Exception.Message)" -ForegroundColor Red }
}

Write-Host "Reparación completada." -ForegroundColor Green
'@

$logs_cleaner = @'
# logs-cleaner.ps1
param(
    [int]$Keep = 10
)
$Root = "' + ($RootPath -replace '\\','\\\\') + '"
$Logs = Join-Path $Root 'logs'
if (-not (Test-Path $Logs)) { Write-Host "Logs no encontrado: $Logs" -ForegroundColor Yellow; exit 0 }
$files = Get-ChildItem -Path $Logs -File | Sort-Object LastWriteTime -Descending
$toDelete = $files | Select-Object -Skip $Keep
foreach ($f in $toDelete) { Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue; Write-Host "Borrado: $($f.Name)" }
Write-Host "Logs limpiados. Conservados: $Keep" -ForegroundColor Green
'@

$prod_master = @'
# prod.ps1
# Script maestro: ejecuta precheck -> hosting-deploy -> logs-cleaner
param()
$Root = "' + ($RootPath -replace '\\','\\\\') + '"
$S = Join-Path $Root 'scripts'

Write-Host "Iniciando flujo PRO" -ForegroundColor Cyan

# 1) Precheck
& (Join-Path $S 'prod-precheck.ps1')

# 2) Deploy hosting
& (Join-Path $S 'hosting-deploy.ps1')

# 3) Limpiar logs - mantener 20
& (Join-Path $S 'logs-cleaner.ps1') -Keep 20

Write-Host "Flujo PRO finalizado." -ForegroundColor Green
'@

# ---------- Escribir archivos ----------
$map = @{
    'prod-precheck.ps1' = $prod_precheck
    'hosting-deploy.ps1' = $hosting_deploy
    'reparar-hosting.ps1' = $reparar_hosting
    'logs-cleaner.ps1'   = $logs_cleaner
    'prod.ps1'           = $prod_master
}

foreach ($f in $map.Keys) {
    $path = Join-Path $TargetDir $f
    $map[$f] | Out-File -FilePath $path -Encoding UTF8 -Force
    Write-Host "Creado: $path"
}

Write-Host "\n✅ Generación completada. Ejecuta desde la raíz del proyecto como administrador:" -ForegroundColor Cyan
Write-Host "powershell -ExecutionPolicy Bypass -File .\scripts\prod.ps1" -ForegroundColor Yellow
Write-Host "(O revisa cada script en $TargetDir)" -ForegroundColor Gray
