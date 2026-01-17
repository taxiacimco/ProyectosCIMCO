# ============================
# ORGANIZAR PROYECTO CIMCO
# ============================
Write-Host "=== Organizando estructura de Hosting Firebase ===" -ForegroundColor Cyan

# Ruta base del proyecto
$base = "C:\Users\Carlos Fuentes\ProyectosCIMCO"

# Carpeta /public
$public = Join-Path $base "public"
$ceo = Join-Path $public "ceo"
$pasajero = Join-Path $public "pasajero"
$shared = Join-Path $public "shared"

# Crear carpetas si no existen
$folders = @($public, $ceo, $pasajero, $shared)

foreach ($folder in $folders) {
    if (-Not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "Carpeta creada: $folder" -ForegroundColor Green
    } else {
        Write-Host "✓ Carpeta ya existe: $folder"
    }
}

Write-Host "`n=== Buscando archivos existentes ===`n" -ForegroundColor Yellow

# Archivos que buscaremos
$buscar = @(
    "login.html",
    "login-ceo.html",
    "firebase-loader.js",
    "firebase-loader-pasajero.js",
    "index.html"
)

foreach ($archivo in $buscar) {
    $resultados = Get-ChildItem -Path $base -Recurse -Filter $archivo -ErrorAction SilentlyContinue

    if ($resultados) {
        foreach ($file in $resultados) {
            Write-Host "Encontrado: $($file.FullName)" -ForegroundColor Cyan

            # Decidir destino según nombre
            switch -Wildcard ($archivo) {
                "login-ceo.html" { $destino = $ceo }
                "firebase-loader.js" { $destino = $ceo }
                "firebase-loader-pasajero.js" { $destino = $pasajero }
                "login.html" { $destino = $pasajero }
                "index.html" { $destino = $public }
            }

            $nuevo = Join-Path $destino $archivo

            # Preguntar antes de mover
            $respuesta = Read-Host "¿Mover este archivo a $destino ? (s/n)"
            if ($respuesta -eq "s") {
                Move-Item -Path $file.FullName -Destination $nuevo -Force
                Write-Host "→ Movido a: $nuevo" -ForegroundColor Green
            } else {
                Write-Host "✗ No movido" -ForegroundColor DarkYellow
            }
        }
    } else {
        Write-Host "No se encontró: $archivo" -ForegroundColor DarkGray
    }
}

Write-Host "`n=== Proceso terminado ===" -ForegroundColor Green
