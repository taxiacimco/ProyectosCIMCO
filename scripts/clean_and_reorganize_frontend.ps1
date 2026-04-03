# Script de PowerShell para automatizar la limpieza y reorganización del directorio 'frontend/public'
#
# INSTRUCCIÓN: Ejecuta este script desde la raíz de tu proyecto (el directorio que contiene
# las carpetas 'frontend' y 'functions').

# --- CONFIGURACIÓN DE RUTAS Y PATRONES ---
$FrontendDir = "frontend"
$PublicDir = Join-Path $FrontendDir "public"
$AssetsDir = Join-Path $PublicDir "assets"

# Archivos y patrones a EXCLUIR de la limpieza/movimiento (archivos esenciales en la raíz)
$Exclusions = @(
    "index.html",
    "favicon.ico",
    "manifest.json",
    "robots.txt",
    "404.html"
)

# Extensiones de archivos que queremos mover a la carpeta 'assets'
$AssetExtensions = @(
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.svg",
    "*.webp",
    "*.gif",
    "*.css",
    "*.js",
    "*.woff",
    "*.woff2",
    "*.ttf",
    "*.otf"
)

# Patrones de archivos/carpetas obsoletos o temporales a ELIMINAR
$JunkPatterns = @(
    ".DS_Store", # Archivos de sistema de macOS
    "Thumbs.db", # Archivos de sistema de Windows
    "*.map",     # Archivos de mapa de origen (source maps)
    "*~",        # Archivos de respaldo de editores
    "*.bak"      # Archivos de respaldo
)

Write-Host "Iniciando la limpieza y reorganización del directorio público: '$PublicDir'..."

# 1. Verificar si el directorio público existe
if (-not (Test-Path -Path $PublicDir -PathType Container)) {
    Write-Error "¡Error! El directorio público '$PublicDir' no se encontró. Asegúrate de estar en la carpeta raíz del proyecto."
    exit 1
}

# 2. Creación de la carpeta 'assets' si no existe
Write-Host "-> Verificando/creando la carpeta de assets: '$AssetsDir'..."
if (-not (Test-Path -Path $AssetsDir -PathType Container)) {
    New-Item -Path $AssetsDir -ItemType Directory | Out-Null
    Write-Host "   Carpeta 'assets' creada."
}

# 3. Limpieza: Eliminación de archivos temporales y obsoletos
Write-Host "-> Eliminando archivos temporales y obsoletos..."
foreach ($pattern in $JunkPatterns) {
    # Busca recursivamente en $PublicDir, excluyendo la nueva carpeta 'assets' para no interferir
    Get-ChildItem -Path $PublicDir -Exclude "assets" -Include $pattern -Recurse -Force | ForEach-Object {
        # Evitar eliminar directorios como 'node_modules' por si acaso
        if ($_.PSIsContainer -eq $false) {
            Remove-Item -Path $_.FullName -Force
            Write-Host "   Eliminado: $($_.Name)" -ForegroundColor Yellow
        }
    }
}

# 4. Reorganización: Mover assets a la carpeta 'assets'
Write-Host "-> Moviendo archivos de assets de la raíz a '$AssetsDir'..."

# Obtener solo archivos en la raíz de $PublicDir (Depth 0)
Get-ChildItem -Path $PublicDir -File -Depth 0 | ForEach-Object {
    $file = $_
    $filename = $file.Name
    $isExcluded = $Exclusions -contains $filename
    
    # Comprobar si la extensión del archivo está en nuestra lista de assets a mover
    $isAsset = $AssetExtensions -contains ("*" + $file.Extension.ToLower())

    if (-not $isExcluded -and $isAsset) {
        try {
            Move-Item -Path $file.FullName -Destination $AssetsDir -Force
            Write-Host "   Movido: $filename" -ForegroundColor Green
        } catch {
            # Línea 90 corregida para evitar el ParserError
            Write-Error "   Fallo al mover ${filename}: $($_.Exception.Message)"
        }
    }
}

Write-Host "`n¡Limpieza y reorganización del frontend completada!" -ForegroundColor Cyan
Write-Host "Archivos clave (index.html, etc.) se mantuvieron en la raíz de public." -ForegroundColor Cyan
Write-Host "Los assets dispersos fueron consolidados en el directorio 'assets'." -ForegroundColor Cyan