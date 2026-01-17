# ============================================================
# 🚀 TAXIA CIMCO - Generador de Paquete Backend (PowerShell)
# Crea estructura completa y comprime en taxia_cimco_backend_ready.zip
# ============================================================

Write-Host "🔧 Preparando estructura TAXIA CIMCO backend..." -ForegroundColor Cyan

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$zipFile = Join-Path $root "taxia_cimco_backend_ready.zip"
$functionsDir = Join-Path $root "functions"

# Crear carpetas si no existen
New-Item -ItemType Directory -Force -Path "$root/functions/routes" | Out-Null

# Crear README base si falta
if (-not (Test-Path "$root/README.md")) {
    "TAXIA CIMCO Backend - Auto generado" | Out-File "$root/README.md" -Encoding UTF8
}

# Verificar archivos mínimos
$requiredFiles = @(".env","firebase.json",".firebaserc","firestore.rules","storage.rules")
foreach ($f in $requiredFiles) {
    if (-not (Test-Path (Join-Path $root $f))) {
        Write-Host "⚠️  Archivo faltante: $f — creando vacío..." -ForegroundColor Yellow
        "" | Out-File (Join-Path $root $f) -Encoding UTF8
    }
}

# Comprimir backend
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }

Write-Host "📦 Comprimiendo en $zipFile ..." -ForegroundColor Green
Compress-Archive -Path "$root\*" -DestinationPath $zipFile -Force

Write-Host "✅ Paquete creado exitosamente:"
Write-Host "👉 $zipFile" -ForegroundColor Green
Write-Host "--------------------------------------------"
Write-Host "Puedes subirlo o distribuirlo como backend listo."
