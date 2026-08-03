# ==============================================================================
# SCRIPT DE PRUEBAS DE INTEGRIDAD DE SALDOS - TAXIA CIMCO (CORE V19.1)
# Ubicación: backend/scripts/test-saldo.ps1
# ==============================================================================

param (
    [string]$USER_ID = "64a1b2c3d4e5f67890123456",
    [string]$TOKEN = ""
)

$BASE_URL = "http://localhost:3000/api/usuarios"

$HEADERS = @{
    "Content-Type" = "application/json"
}

if ($TOKEN -ne "") {
    $HEADERS.Add("Authorization", "Bearer $TOKEN")
}

Write-Host "🚀 Iniciando suite de validación de saldo en: $BASE_URL" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# TEST 1: ABONO DE SALDO (PUT /saldo)
# ------------------------------------------------------------------------------
Write-Host "`n[TEST 1] Ejecutando ABONO de +$50,000 para el usuario: $USER_ID..." -ForegroundColor Yellow

$bodyAbono = @{
    monto = 50000
    tipoOperacion = "ABONO"
    concepto = "Recarga de prueba automatizada PowerShell"
} | ConvertTo-Json

try {
    $res1 = Invoke-RestMethod -Uri "$BASE_URL/$USER_ID/saldo" -Method PUT -Headers $HEADERS -Body $bodyAbono
    Write-Host "✅ TEST 1 Exitoso (200 OK): Abono procesado correctamente." -ForegroundColor Green
    $res1 | ConvertTo-Json -Depth 3 | Write-Host
} catch {
    Write-Host "❌ TEST 1 Fallido:" -ForegroundColor Red $_.Exception.Message
}

# ------------------------------------------------------------------------------
# TEST 2: DÉBITO / DESCUENTO DE SALDO (POST /recargar via Alias)
# ------------------------------------------------------------------------------
Write-Host "`n[TEST 2] Ejecutando DÉBITO de -$15,000 (Descuento)..." -ForegroundColor Yellow

$bodyDebito = @{
    monto = 15000
    tipoOperacion = "DEBITO"
    concepto = "Descuento de comisión de prueba automatizada"
} | ConvertTo-Json

try {
    $res2 = Invoke-RestMethod -Uri "$BASE_URL/$USER_ID/recargar" -Method POST -Headers $HEADERS -Body $bodyDebito
    Write-Host "✅ TEST 2 Exitoso (200 OK): Débito procesado correctamente." -ForegroundColor Green
    $res2 | ConvertTo-Json -Depth 3 | Write-Host
} catch {
    Write-Host "❌ TEST 2 Fallido:" -ForegroundColor Red $_.Exception.Message
}

# ------------------------------------------------------------------------------
# TEST 3: VALIDACIÓN DE RECHAZO (Monto Negativo)
# ------------------------------------------------------------------------------
Write-Host "`n[TEST 3] Probando validación contra montos inválidos (-$5,000)..." -ForegroundColor Yellow

$bodyInvalid = @{
    monto = -5000
    tipoOperacion = "ABONO"
    concepto = "Prueba de fallo"
} | ConvertTo-Json

try {
    $res3 = Invoke-RestMethod -Uri "$BASE_URL/$USER_ID/saldo" -Method PUT -Headers $HEADERS -Body $bodyInvalid
    Write-Host "⚠️ TEST 3 Falló: El backend no debería aceptar montos negativos." -ForegroundColor Red
} catch {
    Write-Host "✅ TEST 3 Exitoso: El backend capturó el error de validación correctamente." -ForegroundColor Green
}