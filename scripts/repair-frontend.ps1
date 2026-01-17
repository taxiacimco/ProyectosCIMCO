# ============================================================
#  REPAIR FRONTEND - Sistema multi roles Taxia CIMCO
#  Este script:
#   - Valida carpetas de roles
#   - Regenera index.html
#   - Regenera manifest.json
#   - Repara firebase.json
#   - Limpia dist
#   - Verifica rutas
# ============================================================

$frontend = "frontend\public\roles"
$roles = @("pasajero", "admin", "interconductor", "mototaxi", "motoparrillero", "motocarga", "despachador")

Write-Host "========================================="
Write-Host " REPARANDO FRONTEND MULTI-ROL"
Write-Host "========================================="

# ============================================================
# 1. Crear carpetas de roles si no existen
# ============================================================
foreach ($role in $roles) {
    $path = "$frontend\$role"

    if (-not (Test-Path $path)) {
        Write-Host "Creando carpeta: $path"
        New-Item -ItemType Directory -Path $path | Out-Null
    }
}

# ============================================================
# 2. Crear index.html basico si falta
# ============================================================
foreach ($role in $roles) {
    $indexPath = "$frontend\$role\index.html"

    if (-not (Test-Path $indexPath)) {
        Write-Host "Creando index.html para $role"

        @"
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$role</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>
"@ | Set-Content $indexPath
    }
}

# ============================================================
# 3. Crear manifest.json si falta
# ============================================================
foreach ($role in $roles) {
    $rolePath = "$frontend\$role"
    $manifest = "$rolePath\manifest.webmanifest"

    if (-not (Test-Path $manifest)) {
        Write-Host "Generando manifest para $role"

@"
{
  "name": "Panel $role",
  "short_name": "$role",
  "start_url": "/$role/",
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
"@ | Set-Content $manifest
    }
}

# ============================================================
# 4. Limpiar dist
# ============================================================
$distPath = "frontend\dist"
if (Test-Path $distPath) {
    Write-Host "Limpiando frontend/dist"
    Remove-Item -Recurse -Force $distPath
}

# ============================================================
# 5. Reparar firebase.json (rewrites multi-frontend)
# ============================================================
$firebaseFile = "firebase.json"

if (Test-Path $firebaseFile) {
    Write-Host "Revisando firebase.json"

    $firebaseContent = Get-Content $firebaseFile -Raw | ConvertFrom-Json

    # Hosting principal
    $hosting = @(
        @{
            public = "frontend/dist"
            ignore = @("firebase.json", "**/.*", "**/node_modules/**")
            cleanUrls = $true
            trailingSlash = $false
            rewrites = @()
        }
        @{
            target = "panel"
            public = "panel/public"
            ignore = @("firebase.json", "**/.*", "**/node_modules/**")
        }
    )

    foreach ($role in $roles) {
        $hosting[0].rewrites += @{
            source = "/$role/**"
            destination = "/$role/index.html"
        }
    }

    $firebaseContent.hosting = $hosting

    ($firebaseContent | ConvertTo-Json -Depth 20) | Set-Content $firebaseFile

    Write-Host "firebase.json corregido"
}

# ============================================================
# 6. Listo
# ============================================================
Write-Host ""
Write-Host "========================================="
Write-Host " REPARACION COMPLETA"
Write-Host "Ejecuta ahora:"
Write-Host "  npm install"
Write-Host "  npm run build"
Write-Host "========================================="
