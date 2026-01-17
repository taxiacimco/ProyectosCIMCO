Write-Host "========================================================" -ForegroundColor Yellow
Write-Host " 🧹 LIMPIEZA PROFESIONAL DEL PUBLIC (Firebase Hosting) "
Write-Host "========================================================" -ForegroundColor Yellow

$Public = "C:\Users\Carlos Fuentes\ProyectosCIMCO\public"

if (-not (Test-Path $Public)) {
    Write-Host "❌ ERROR: No existe la carpeta PUBLIC."
    exit 1
}

# Patrones prohibidos
$basura = @(
    "*node_modules*",
    "*backup*",
    "*respaldo*",
    "*lcov-report*",
    "*coverage*"
)

$archivosBasura = Get-ChildItem -Path $Public -Recurse -Force | 
    Where-Object {
        $match = $false
        foreach ($b in $basura) {
            if ($_.FullName -like $b) { $match = $true }
        }
        $match -eq $true
    }

if ($archivosBasura.Count -eq 0) {
    Write-Host "✔ No se encontraron archivos basura."
    exit 0
}

Write-Host "`nArchivos que se eliminarán:`n" -ForegroundColor Yellow

foreach ($file in $archivosBasura) {
    Write-Host "🗑 $($file.FullName)" -ForegroundColor Red
}

$confirm = Read-Host "`n¿Eliminar todos? (s/n)"

if ($confirm -ne "s") {
    Write-Host "❌ Cancelado por el usuario."
    exit 0
}

foreach ($file in $archivosBasura) {
    try {
        Remove-Item -Path $file.FullName -Force -Recurse
        Write-Host "✔ Eliminado: $($file.FullName)" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ No se pudo eliminar: $($file.FullName)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Limpieza completada." -ForegroundColor Green
