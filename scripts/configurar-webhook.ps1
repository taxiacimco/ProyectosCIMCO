# =============================================================================
# script: configurar-webhook.ps1
# descripción: Configura el Webhook de ngrok para el proyecto Taxia CIMCO
# =============================================================================

Clear-Host
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "     CONFIGURANDO WEBHOOK (TAXIA -> NGROK)   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. DEFINIR LA URL DE NGROK (Tu túnel hacia internet)
# Copia aquí la URL que te dio ngrok. 
$NGROK_URL = "https://c8c360f762ae.ngrok-free.app"
$WEBHOOK_PATH = "/api/webhook/taxia"
$FULL_URL = "$NGROK_URL$WEBHOOK_PATH"

$ENV_FILE = "./backend/.env"

Write-Host "[1/3] Validando URL de ngrok..." -ForegroundColor Yellow
Write-Host "URL Base: $NGROK_URL" -ForegroundColor Gray
Write-Host "Ruta Webhook: $WEBHOOK_PATH" -ForegroundColor Gray

# 2. Comprobar si existe la carpeta backend y actualizar .env
if (Test-Path "./backend") {
    try {
        # Creamos el contenido del archivo .env
        $EnvContent = @"
PORT=5001
WEBHOOK_URL=$FULL_URL
TAXIA_API_KEY=TU_API_KEY_DE_TAXIA_AQUI
"@
        $EnvContent | Out-File -FilePath $ENV_FILE -Encoding utf8 -Force
        Write-Host "[2/3] Archivo .env actualizado exitosamente." -ForegroundColor Green
    } catch {
        Write-Host "[!] Error crítico al escribir el archivo .env: $($_.Exception.Message)" -ForegroundColor Red
        exit
    }
} else {
    Write-Host "[!] Error: No se encontró la carpeta 'backend'. Asegúrate de estar en la raíz del proyecto." -ForegroundColor Red
    exit
}

# 3. Instrucciones de Activación en Taxia
Write-Host "---------------------------------------------" -ForegroundColor Gray
Write-Host "[3/3] CONFIGURACIÓN DE RED COMPLETADA." -ForegroundColor Green
Write-Host ""
Write-Host "PASO FINAL OBLIGATORIO:" -ForegroundColor White
Write-Host "Copia la siguiente URL y pégala en el Panel de Taxia:" -ForegroundColor Yellow
Write-Host ">> $FULL_URL" -ForegroundColor Magenta -Object
Write-Host ""
Write-Host "---------------------------------------------" -ForegroundColor Gray
Write-Host "Presiona cualquier tecla para finalizar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")