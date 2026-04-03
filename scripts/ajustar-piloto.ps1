# ajustar-piloto.ps1
$root = "C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\public\piloto"
if (-not (Test-Path $root)) {
    Write-Host "ERROR: No existe la carpeta piloto en: $root" -ForegroundColor Red
    exit 1
}
$backupFolder = "$root\backup_piloto_$(Get-Date -Format yyyyMMdd_HHmmss)"
New-Item -ItemType Directory -Path $backupFolder | Out-Null

Write-Host "==== Ajustando entorno PILOTO en: $root ===="

$files = Get-ChildItem -Path $root -Recurse -Filter *.html

foreach ($file in $files) {
    Write-Host "Procesando: $($file.FullName)"
    # Backup
    Copy-Item $file.FullName "$backupFolder\$($file.Name)"

    $content = Get-Content $file.FullName -Raw

    # quitar posibles scripts CDN de Firebase y firebase-loader duplicado
    $content = $content -replace '<script[^>]*www\.gstatic\.com\/firebasejs[^>]*><\/script>', ''
    $content = $content -replace '<script[^>]*firebase-loader[^>]*><\/script>', ''

    # insertar loader piloto justo antes de </body>
    $loader = '<script src="/piloto/js/firebase/firebase-loader.js"></script>'
    if ($content -match '</body>') {
        $content = $content -replace '</body>', "$loader`n</body>"
    } else {
        # si no hay </body>, añadir al final
        $content = $content + "`n" + $loader
    }

    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "✔ Piloto ajustado correctamente."
Write-Host "Backups guardados en: $backupFolder"
