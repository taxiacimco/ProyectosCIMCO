# Este script copia los loaders de Firebase que están en la carpeta 'public'
# a la carpeta 'dist' para que el script de pre-verificación y el despliegue
# de producción puedan encontrarlos correctamente.

Write-Host "--- Copiando archivos críticos de Firebase Loader a la carpeta dist ---"

$SourceDir = ".\public\js\firebase"
$TargetDir = ".\dist\js\firebase"

# Crear la estructura de carpetas si no existe
if (-not (Test-Path $TargetDir)) {
    Write-Host "[ INFO ] Creando directorio: $TargetDir"
    New-Item -Path $TargetDir -ItemType Directory | Out-Null
}

$FilesToCopy = @("firebase-loader.js", "firebase-loader-admin.js")

foreach ($File in $FilesToCopy) {
    $SourcePath = Join-Path $SourceDir $File
    $TargetPath = Join-Path $TargetDir $File

    if (Test-Path $SourcePath) {
        Copy-Item -Path $SourcePath -Destination $TargetPath -Force
        Write-Host "[ ✅ OK ] Copiado: $File a $TargetDir"
    } else {
        Write-Host "[ ❌ ERROR ] Archivo no encontrado en la fuente: $SourcePath"
    }
}

Write-Host "--- Proceso de copia finalizado ---"