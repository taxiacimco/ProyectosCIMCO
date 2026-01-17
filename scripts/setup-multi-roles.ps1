# 🚀 CONFIGURACIÓN AUTOMÁTICA MULTI-ROL VITE + FIREBASE HOSTING
Write-Host "=== Configurando Multi-Frontend por Roles ===" -ForegroundColor Cyan

$roles = @(
    "pasajero",
    "admin",
    "interconductor",
    "mototaxi",
    "motoparrillero",
    "motocarga",
    "despachador"
)

$basePath = "frontend/public/roles"

# Crear carpetas por rol
foreach ($r in $roles) {
    $path = "$basePath/$r"

    if (-Not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
        Write-Host "🟢 Carpeta creada: $path"
    }

    # Crear index.html base
    $htmlPath = "$path/index.html"
    if (-Not (Test-Path $htmlPath)) {
        @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>TaxiA CIMCO - $r</title>
  <link rel="manifest" href="/roles/$r/manifest-$r.webmanifest" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
"@ | Set-Content $htmlPath
        Write-Host "📄 index.html creado: $htmlPath"
    }

    # Crear manifest base
    $manifestPath = "$path/manifest-$r.webmanifest"
    if (-Not (Test-Path $manifestPath)) {
        @"
{
  "name": "TaxiA - $r",
  "short_name": "$r",
  "start_url": "/$r/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
"@ | Set-Content $manifestPath
        Write-Host "📄 Manifest creado: $manifestPath"
    }
}

Write-Host "`n=== TODAS LAS CARPETAS Y ARCHIVOS CREADOS EXITOSAMENTE ===" -ForegroundColor Green
