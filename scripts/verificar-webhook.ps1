# ==============================
# verificar-webhook.ps1
# ==============================

# Configuración
$ACCESS_TOKEN = "EAALDHhT6fwUBPQYMizZBMYD0coDR3bP7nzcI7wjolA2YH5G3zZCSFWTNmCZAOXyRSkBbIhuCgTJeZBdQOkslmHq7e82diD09Gm11ZB4bgAViXS5b95gqTGrH050Xcq5OTv8tLux81YAaJwNZBAoweCu3P0prPNo0E6x0xxcaLfSyR9hZC2k1Yx9wiAX805PBxqIjgZDZD"
$WABA_ID      = "1158297576167491"

Write-Host "Consultando suscripciones de webhook en Meta..." -ForegroundColor Cyan

# Endpoint de verificación
$verifyUrl = "https://graph.facebook.com/v19.0/$WABA_ID/subscriptions"

try {
    $response = Invoke-RestMethod -Uri $verifyUrl -Method Get `
        -Headers @{ Authorization = "Bearer $ACCESS_TOKEN" }

    Write-Host "Webhooks registrados:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5 | Write-Host
}
catch {
    Write-Host "Error al consultar el webhook:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
