Write-Host "🔍 Buscando archivos .env expuestos en el proyecto..." -ForegroundColor Cyan

$root = Get-Location
$envFiles = Get-ChildItem -Path $root -Recurse -Filter ".env*" -File

$ignoreList = @(
    ".env.example",
    ".env.local",
    ".env.test",
    ".env.development",
    ".env.production",
    ".env.sample"
)

foreach ($file in $envFiles) {
    if ($ignoreList -contains $file.Name) {
        Write-Host "⚠️ Archivo permitido encontrado: $($file.FullName)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Archivo .env NO permitido: $($file.FullName)" -ForegroundColor Red
    }
}

Write-Host "`n✔️ Escaneo completado."
