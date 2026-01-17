<#
===================================================================
 💾 TAXIA CIMCO - BACKUP AUTOMÁTICO DIARIO
===================================================================
Autor: Carlos Mario Fuentes García
Función: Exportar Firestore y Functions a carpeta con fecha
Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\backup_daily.ps1
-------------------------------------------------------------------
Requiere:
- Firebase CLI (ya instalada)
- Sesión iniciada con firebase login
-------------------------------------------------------------------
#>

$rootPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$backendPath = "$rootPath\taxia_cimco_backend"
$backupPath = "$backendPath\backups"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$todayFolder = "$backupPath\$timestamp"

if (-not (Test-Path $backupPath)) {
    New-Item -ItemType Directory -Force -Path $backupPath | Out-Null
}

# Crear carpeta del día
New-Item -ItemType Directory -Force -Path $todayFolder | Out-Null

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " 💾 TAXIA CIMCO - BACKUP AUTOMÁTICO " -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "📅 Fecha: $timestamp" -ForegroundColor Gray
Write-Host "📂 Carpeta destino: $todayFolder" -ForegroundColor Gray
Write-Host ""

# 1️⃣ Exportar Firestore
Write-Host "📡 Exportando Firestore..." -ForegroundColor Cyan
firebase firestore:export "$todayFolder" --project pelagic-chalice-467818-e1 | Out-Null
Write-Host "✅ Firestore exportado correctamente." -ForegroundColor Green

# 2️⃣ Copia de Functions y .env
Write-Host "🧩 Copiando archivos de entorno y funciones..." -ForegroundColor Cyan
Copy-Item "$backendPath\functions" "$todayFolder\functions" -Recurse -Force
Copy-Item "$backendPath\.env" "$todayFolder\.env.bak" -Force
Copy-Item "$backendPath\serviceAccount.json" "$todayFolder\serviceAccount.json.bak" -Force

Write-Host "✅ Archivos copiados." -ForegroundColor Green

# 3️⃣ Registro en log
$logFile = "$backupPath\backup_history.csv"
if (-not (Test-Path $logFile)) {
    "Fecha,Directorio,Estado" | Out-File $logFile -Encoding utf8
}
"$timestamp,$todayFolder,OK" | Out-File $logFile -Encoding utf8 -Append

Write-Host ""
Write-Host "✅ Backup completado con éxito." -ForegroundColor Green
Write-Host "🗂️ Guardado en: $todayFolder" -ForegroundColor Gray
Write-Host "===================================================" -ForegroundColor Cyan

# Notificación
[console]::Beep(1000,300)
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show('💾 Backup diario completado','TAXIA CIMCO',0,[System.Windows.Forms.MessageBoxIcon]::Information)
