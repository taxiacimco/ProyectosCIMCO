# =============================================================================
# script: run-all.ps1 (VERSIÓN ESTABLE Y SEGURA - CIMCO 2026)
# =============================================================================
Clear-Host
$env:BROWSERSLIST_IGNORE_OLD_DATA = "true" 

Write-Host "--- ESTABILIZANDO SISTEMA ---" -ForegroundColor Cyan
# Mata procesos previos de forma agresiva para liberar el teclado y puertos
Get-Process node, java, firebase -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3 # Pausa de seguridad

Write-Host "[1/3] Sincronizando Base de Datos..." -ForegroundColor Yellow
firebase use pelagic-chalice-467818-e1 --force
firebase firestore:indexes > firestore.indexes.json
Start-Sleep -Seconds 2

Write-Host "[2/3] Compilando Frontend (Modo Silencioso)..." -ForegroundColor Yellow
Set-Location "frontend"
npm run build --silent
firebase deploy --only hosting --force
Set-Location ".."
Start-Sleep -Seconds 2

Write-Host "[3/3] 🚢 Backend a Cloud Run..." -ForegroundColor Magenta
Set-Location "taxia_cimco_backend"
# Usamos 'mvn clean' para asegurar que no haya archivos corruptos previos
mvn clean package -DskipTests
gcloud run deploy taxia-cimco-backend `
    --source . `
    --region us-central1 `
    --platform managed `
    --allow-unauthenticated `
    --project pelagic-chalice-467818-e1
Set-Location ".."

Write-Host "✅ PROCESO FINALIZADO. PC ESTABLE." -ForegroundColor Green
Read-Host "Presiona ENTER para cerrar esta ventana y evitar que el proceso quede colgado"