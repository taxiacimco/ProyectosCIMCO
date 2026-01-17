# ============================================================
# 🧠 VERIFICADOR DE ENTORNO AVANZADO - Proyecto CIMCO
# Autor: Carlos Mario Fuentes García
# ============================================================

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🔍 Verificando archivo de entorno (.env)..." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 📁 RUTAS BASE
# ============================================================
$envPath = ".env"   # Ruta principal (ajustada para tu caso)
$reportPath = "verificacion_env_report.html"

# ============================================================
# 📝 PLANTILLA HTML SEGURA
# ============================================================
$htmlReport = @'
<html>
<head>
<meta charset="UTF-8">
<title>Verificación de .env - CIMCO</title>
<style>
body { font-family: Arial; background: #f5f5f5; margin: 30px; }
h2 { color: #0B5394; }
table { border-collapse: collapse; width: 100%; background: white; }
th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
th { background-color: #0B5394; color: white; }
.ok { color: green; }
.warn { color: orange; }
.error { color: red; }
.suspicious { color: #d58512; }
</style>
</head>
<body>
<h2>🔍 Informe de verificación del archivo .env</h2>
'@

$htmlReport += "<p><strong>Fecha:</strong> $(Get-Date)</p>"

# ============================================================
# 🔍 COMPROBAR EXISTENCIA
# ============================================================
if (-Not (Test-Path $envPath)) {
    Write-Host "❌ ERROR: No se encontró el archivo $envPath" -ForegroundColor Red
    $htmlReport += "<p class='error'>❌ ERROR: No se encontró el archivo <b>$envPath</b></p></body></html>"
    $htmlReport | Out-File $reportPath -Encoding UTF8
    Write-Host "📄 Informe generado: $reportPath" -ForegroundColor Yellow
    exit 1
}

# ============================================================
# 📄 LECTURA DEL ARCHIVO .env
# ============================================================
$envContent = Get-Content $envPath | Where-Object { $_ -notmatch '^\s*#' -and $_ -match '=' }

# ============================================================
# 🔑 CLAVES REQUERIDAS (SIN PREFIJO)
# ============================================================
$requiredKeys = @(
    "FIREBASE_API_KEY",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_STORAGE_BUCKET",
    "FIREBASE_MESSAGING_SENDER_ID",
    "FIREBASE_APP_ID",
    "FIREBASE_MEASUREMENT_ID",
    "MAPS_API_KEY",
    "GEMINI_API_KEY",
    "WHATSAPP_TOKEN",
    "WHATSAPP_PHONE_ID"
)

# ============================================================
# 📊 TABLA DE RESULTADOS
# ============================================================
$htmlReport += "<table><tr><th>Variable</th><th>Estado</th><th>Comentario</th></tr>"

foreach ($key in $requiredKeys) {
    # Buscar clave normal o con prefijo REACT_APP_
    $regexPattern = "^(REACT_APP_)?$key="
    $line = $envContent | Where-Object { $_ -match $regexPattern }

    if (-not $line) {
        Write-Host "❌ Falta $key" -ForegroundColor Red
        $htmlReport += "<tr><td>$key</td><td class='error'>❌ Faltante</td><td>No está definida en el archivo.</td></tr>"
        continue
    }

    $value = $line.Split("=")[1].Trim()

    if ($value -eq "") {
        Write-Host "⚠️  $key está vacía" -ForegroundColor Yellow
        $htmlReport += "<tr><td>$key</td><td class='warn'>⚠️ Vacía</td><td>Debe tener un valor.</td></tr>"
        continue
    }

    # Validación de formato
    if ($key -match "FIREBASE_API_KEY|MAPS_API_KEY|GEMINI_API_KEY") {
        if ($value -notmatch "^AIza") {
            Write-Host "⚠️  $key formato sospechoso" -ForegroundColor Yellow
            $htmlReport += "<tr><td>$key</td><td class='suspicious'>🧩 Sospechoso</td><td>Normalmente comienza con 'AIza'.</td></tr>"
            continue
        }
    }

    if ($key -eq "WHATSAPP_TOKEN" -and $value -notmatch "^EAA") {
        Write-Host "⚠️  $key podría ser incorrecto (tokens Meta inician con 'EAA')" -ForegroundColor Yellow
        $htmlReport += "<tr><td>$key</td><td class='suspicious'>🧩 Sospechoso</td><td>Tokens Meta suelen iniciar con 'EAA'.</td></tr>"
        continue
    }

    Write-Host "✅ $key correcto" -ForegroundColor Green
    $htmlReport += "<tr><td>$key</td><td class='ok'>✅ OK</td><td>Formato correcto.</td></tr>"
}

$htmlReport += "</table>"
$htmlReport += "<p style='margin-top:20px;'><strong>✅ Verificación completada.</strong></p>"
$htmlReport += "</body></html>"

# ============================================================
# 💾 GUARDAR REPORTE
# ============================================================
$htmlReport | Out-File $reportPath -Encoding UTF8

Write-Host ""
Write-Host "📄 Informe generado correctamente: $reportPath" -ForegroundColor Cyan
Write-Host "   Ábrelo en tu navegador para ver el resumen visual." -ForegroundColor Yellow
