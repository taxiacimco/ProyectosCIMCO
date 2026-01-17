# ============================================================
#  Script: verificar-firebase-ceo.ps1
#  Autor: Carlos Mario Fuentes García
#  Objetivo: Diagnóstico profesional del entorno Firebase CEO
# ============================================================

Write-Host ""
Write-Host " Diagnóstico del entorno Firebase (ADMIN / CEO)" -ForegroundColor Cyan
Write-Host ""

$pathConfig = "frontend\public\js\firebase-config-ceo.js"

if (-Not (Test-Path $pathConfig)) {
    Write-Host " No se encontró el archivo firebase-config-ceo.js en frontend/public/js/" -ForegroundColor Red
    exit
}

# Extraer API Key
$content = Get-Content $pathConfig -Raw
if ($content -match "apiKey\s*:\s*['""]([^'""]+)['""]") {
    $apiKey = $matches[1]
    Write-Host " API Key detectada: $apiKey" -ForegroundColor Green
} else {
    Write-Host " No se encontró la API Key en el archivo." -ForegroundColor Red
    exit
}

# Probar conexión con endpoint moderno de Firebase Auth
$url = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey"

Write-Host ""
Write-Host " Probando conectividad con Firebase Auth REST API..." -ForegroundColor Yellow

for ($i = 0; $i -le 20; $i += 2) {
    Write-Host -NoNewline "▌"
    Start-Sleep -Milliseconds 80
}
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10 -Method POST -Body "{}" -ContentType "application/json"
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 400) {
        Write-Host " Conexión con Firebase Auth API establecida correctamente." -ForegroundColor Green
    } else {
        Write-Host " Firebase respondió con código: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " Error al conectar con Firebase Auth: $($_.Exception.Message)" -ForegroundColor Red
}

# Confirmar existencia de TailwindCSS compilado
$cssPath = "frontend\public\css\output.css"
if (Test-Path $cssPath) {
    $size = (Get-Item $cssPath).Length / 1KB
    Write-Host " Archivo CSS de Tailwind encontrado (${size} KB)" -ForegroundColor Green
} else {
    Write-Host " No se encontró output.css (puede que Tailwind no se haya compilado)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host " Diagnóstico completado." -ForegroundColor Cyan
Write-Host ""
