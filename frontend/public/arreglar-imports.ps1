Write-Host "=== Ajustador Automático de Imports Firebase v1.0 ===" -ForegroundColor Cyan

$root = "C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\public"

# Extensiones a revisar
$files = Get-ChildItem -Path $root -Recurse -Include *.js

foreach ($file in $files) {

    $content = Get-Content $file.FullName -Raw

    # Buscar imports antiguos
    if ($content -match "firebase-app.js" -or
        $content -match "firebase-auth.js" -or
        $content -match "firebase-firestore.js" -or
        $content -match "firebase-storage.js"
    ) {

        Write-Host "Corrigiendo imports en: $($file.FullName)" -ForegroundColor Yellow

        # Backup
        Copy-Item $file.FullName "$($file.FullName).bak" -Force

        # Reemplazar todos los imports de Firebase por la nueva ruta
        $new = $content `
            -replace 'from "https://www.gstatic.com/firebasejs/.*?/firebase-app.js"',  'from "../firebase/firebase-loader.js"' `
            -replace 'from "https://www.gstatic.com/firebasejs/.*?/firebase-auth.js"', 'from "../firebase/firebase-loader.js"' `
            -replace 'from "https://www.gstatic.com/firebasejs/.*?/firebase-firestore.js"', 'from "../firebase/firebase-loader.js"' `
            -replace 'from "https://www.gstatic.com/firebasejs/.*?/firebase-storage.js"', 'from "../firebase/firebase-loader.js"'

        # Guardar
        $new | Set-Content $file.FullName -Force -Encoding UTF8
    }
}

Write-Host "✔️ Proceso completado." -ForegroundColor Green
