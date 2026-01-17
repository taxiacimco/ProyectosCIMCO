# Limpia los artefactos de compilación (archivos JS y mapas)
# SIN tocar la estructura de carpetas fuente (src) ni las rutas.

Write-Host "Iniciando limpieza de artefactos de compilación (JS/Map)..." -ForegroundColor Cyan

# Directorios de compilación comunes en Firebase Functions
$OutputFolders = @(
    "dist", 
    "lib", 
    "functions/dist", 
    "functions/lib"
)

$TotalRemoved = 0

foreach ($Folder in $OutputFolders) {
    if (Test-Path -Path $Folder -PathType Container) {
        Write-Host "-> Limpiando contenido en '$Folder'..." -ForegroundColor Yellow
        
        # Eliminar archivos .js y .js.map dentro de la carpeta de salida
        $FilesToRemove = Get-ChildItem -Path $Folder -Recurse -Include "*.js", "*.js.map" -ErrorAction SilentlyContinue
        
        foreach ($File in $FilesToRemove) {
            Remove-Item -Path $File.FullName -Force
            $TotalRemoved++
        }
    }
}

# También elimina el archivo clean_and_rename_backend.ps1 que es el causante del problema
if (Test-Path -Path "clean_and_rename_backend.ps1" -PathType Leaf) {
    Remove-Item -Path "clean_and_rename_backend.ps1" -Force
    Write-Host "-> Eliminado el script obsoleto 'clean_and_rename_backend.ps1'." -ForegroundColor Red
}

Write-Host "`nLimpieza completada. Archivos eliminados: $TotalRemoved" -ForegroundColor Green