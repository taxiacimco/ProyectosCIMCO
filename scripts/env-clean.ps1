Write-Host "🧹 Limpiando archivos .env NO permitidos..." -ForegroundColor Cyan

$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$ForbiddenFiles = Get-ChildItem -Path $RootPath -Recurse -Force -Filter ".env" | Where-Object {
    $_.Name -eq ".env" -or $_.Name -like ".env.*.disabled" -or $_.Name -like "*.backup"
}

if ($ForbiddenFiles.Count -eq 0) {
    Write-Host "✔ No se encontraron archivos .env prohibidos." -ForegroundColor Green
    exit 0
}

foreach ($file in $ForbiddenFiles) {
    try {
        Remove-Item -Path $file.FullName -Force
        Write-Host "🗑 Eliminado: $($file.FullName)" -ForegroundColor Yellow
    } catch {
        Write-Host "❌ ERROR eliminando: $($file.FullName)" -ForegroundColor Red
    }
}

Write-Host "✨ Limpieza finalizada." -ForegroundColor Green
