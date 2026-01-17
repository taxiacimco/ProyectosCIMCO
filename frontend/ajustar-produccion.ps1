# ajustar-produccion.ps1
$root = "C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\public"
$backupFolder = "$root\backup_produccion_$(Get-Date -Format yyyyMMdd_HHmmss)"

New-Item -ItemType Directory -Path $backupFolder | Out-Null

Write-Host "==== Ajustando entorno PRODUCCIÓN en: $root ===="

$files = Get-ChildItem -Path $root -Recurse -Filter *.html

foreach ($file in $files) {
    Write-Host "Procesando: $($file.FullName)"

    # Backup
    Copy-Item $file.FullName "$backupFolder\$($file.Name)"

    $content = Get-Content $file.FullName -Raw

    # 1️⃣ Quitar scripts CDN o antiguos
    $content = $content -replace '<script[^>]*www\.gstatic\.com\/firebasejs[^>]*><\/script>', ''
    $content = $content -replace '<script[^>]*firebase-loader[^>]*><\/script>', ''

    # 2️⃣ Insertar loader correcto de producción
    $loader = '<script src="/js/firebase/firebase-loader.js"></script>'

    if ($content -match '</body>') {
        $content = $content -replace '</body>', "$loader`n</body>"
    } else {
        $content += "`n$loader"
    }

    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "✔ Producción ajustada correctamente."
Write-Host "Backups guardados en: $backupFolder"
