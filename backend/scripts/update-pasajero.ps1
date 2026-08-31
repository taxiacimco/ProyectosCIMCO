# Versión Arquitectura: V19.3 - Actualización Directa de Usuario para Pruebas
# Ubicación: backend/scripts/update-pasajero.ps1

param (
    [string]$USER_ID = "6a29b491c8d7b14cd8f85871",
    [string]$NEW_EMAIL = "carlosmariofuentesgarcia@gmail.com",
    [string]$NEW_PHONE = "3003503249"
)

$BASE_URL = "http://localhost:3000/api/usuarios"
$AUTH_URL = "http://localhost:3000/api/auth/login"

Write-Host "🚀 Iniciando actualización de datos para el usuario: $USER_ID" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# PASO 1: AUTENTICACIÓN ADMIN (Obtener JWT)
# ------------------------------------------------------------------------------
$loginBody = @{
    email = "taxiacimco@gmail.com"
    password = "Mijagua*57"
} | ConvertTo-Json

try {
    $loginRes = Invoke-RestMethod -Uri $AUTH_URL -Method Post -Body $loginBody -ContentType "application/json"
    $TOKEN = $loginRes.token
    Write-Host "✅ Autenticado como Administrador." -ForegroundColor Green
} catch {
    Write-Host "❌ Error al autenticar como Administrador:" -ForegroundColor Red $_.Exception.Message
    exit 1
}

$HEADERS = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type"  = "application/json"
}

# ------------------------------------------------------------------------------
# PASO 2: ACTUALIZAR CORREO Y TELÉFONO VIA PUT
# ------------------------------------------------------------------------------
$updateBody = @{
    email = $NEW_EMAIL
    telefono = $NEW_PHONE
    celular = $NEW_PHONE
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/$USER_ID" -Method PUT -Headers $HEADERS -Body $updateBody
    Write-Host "`n✅ Datos actualizados exitosamente:" -ForegroundColor Green
    Write-Host "📧 Nuevo Correo: $NEW_EMAIL" -ForegroundColor Yellow
    Write-Host "📱 Nuevo Celular: $NEW_PHONE" -ForegroundColor Yellow
    $res | ConvertTo-Json -Depth 3 | Write-Host
} catch {
    Write-Host "`n❌ Error actualizando el usuario:" -ForegroundColor Red $_.Exception.Message
}