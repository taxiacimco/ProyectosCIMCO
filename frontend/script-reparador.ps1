# === Script Reparador Firebase para HTML ===
$root = "C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\public"
$backupFolder = "$root\backup_reparador_$(Get-Date -Format yyyyMMdd_HHmmss)"
New-Item -ItemType Directory -Path $backupFolder | Out-Null

Write-Host "========================================="
Write-Host "  REPARADOR AUTOMÁTICO DE HTML INICIADO"
Write-Host "========================================="

$files = Get-ChildItem -Path $root -Recurse -Filter *.html

foreach ($file in $files) {

    # Saltar los backups
    if ($file.FullName -like "*backup_*") { continue }

    $content = Get-Content $file.FullName -Raw

    # Crear backup individual
    Copy-Item $file.FullName "$backupFolder\$($file.Name)"

    # Eliminar Firebase CDN
    $content = $content -replace '<script[^>]*firebase.*?<\/script>', ''

    # Eliminar scripts duplicados de firebase-loader
    $content = $content -replace '<script src=".*?firebase-loader.js"><\/script>', ''

    # Determinar entorno
    $dir = Split-Path $file.FullName -Parent

    if ($dir -match "admin") {
        $loader = '<script src="/admin/js/firebase/firebase-loader.js"></script>'
    }
    elseif ($dir -match "despachador") {
        $loader = '<script src="/despachador/js/firebase/firebase-loader.js"></script>'
    }
    elseif ($dir -match "interconductor") {
        $loader = '<script src="/interconductor/js/firebase/firebase-loader.js"></script>'
    }
    elseif ($dir -match "mototaxi") {
        $loader = '<script src="/mototaxi/js/firebase/firebase-loader.js"></script>'
    }
    elseif ($dir -match "pasajero") {
        $loader = '<script src="/pasajero/js/firebase/firebase-loader.js"></script>'
    }
    else {
        $loader = '<script src="/js/firebase/firebase-loader.js"></script>'
    }

    # Insertar el loader antes de </body>
    $content = $content -replace '</body>', "$loader`n</body>"

    # Guardar cambios
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "`n✔ Reparación completada"
Write-Host "Backup disponible en: $backupFolder"
