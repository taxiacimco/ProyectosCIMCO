# === Script de Prueba: test-firebase-html.ps1 ===

# Este script verifica que todos los archivos HTML utilicen el loader correcto
# y que no contengan referencias obsoletas al CDN de Firebase.

$root = "C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\public"
$totalFiles = 0
$errorsFound = $false

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   ✅ INICIO DE PRUEBA DE FIREBASE HTML" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$files = Get-ChildItem -Path $root -Recurse -Filter *.html

foreach ($file in $files) {
    # Ignorar archivos de backup
    if ($file.FullName -like "*backup_*") { continue }

    $totalFiles++
    $content = Get-Content $file.FullName -Raw
    
    # CORRECCIÓN: Escapar la ruta para que la operación -replace funcione como texto literal
    $escapedRoot = [regex]::Escape($root)
    $filename = $file.FullName -replace $escapedRoot, ""

    $hasCDN = $content -match 'www\.gstatic\.com\/firebasejs'
    $hasCorrectLoader = $content -match 'firebase-loader\.js'

    # 1. Comprobación de CDN (Error Crítico)
    if ($hasCDN) {
        Write-Host "❌ ERROR CRÍTICO en $filename" -ForegroundColor Red
        Write-Host "   -> ¡CDN de Firebase ENCONTRADO! El reparador falló en este archivo." -ForegroundColor Red
        $errorsFound = $true
    }

    # 2. Comprobación de Loader
    if (!$hasCorrectLoader) {
        Write-Host "⚠️ ADVERTENCIA en $filename" -ForegroundColor Yellow
        Write-Host "   -> No se encontró ninguna referencia a 'firebase-loader.js'." -ForegroundColor Yellow
        $errorsFound = $true
    } else {
        # Determinar la ruta esperada según la ubicación del archivo
        $loaderPath = ""
        # Detección de entorno
        if ($filename -match "/piloto/") {
            $loaderPath = "/piloto/js/firebase/firebase-loader.js"
        } elseif ($filename -match "/admin/") {
            $loaderPath = "/admin/js/firebase/firebase-loader.js"
        } elseif ($filename -match "/despachador/") {
            $loaderPath = "/despachador/js/firebase/firebase-loader.js"
        } elseif ($filename -match "/interconductor/") {
            $loaderPath = "/interconductor/js/firebase/firebase-loader.js"
        } elseif ($filename -match "/mototaxi/") {
            $loaderPath = "/mototaxi/js/firebase/firebase-loader.js"
        } elseif ($filename -match "/pasajero/") {
            $loaderPath = "/pasajero/js/firebase/firebase-loader.js"
        }
        # Ruta por defecto (para archivos en /public/ directamente o subcarpetas no nombradas)
        if ($loaderPath -eq "") {
             $loaderPath = "/js/firebase/firebase-loader.js"
        }


        if ($loaderPath -ne "") {
            # Se usa -match aquí porque la ruta contiene barras diagonales
            if ($content -match [regex]::Escape($loaderPath)) {
                Write-Host "   ✔ OK: Loader $loaderPath encontrado en $filename." -ForegroundColor Green
            } else {
                Write-Host "❌ ERROR en $filename" -ForegroundColor Red
                Write-Host "   -> Se encontró 'firebase-loader.js', pero la ruta ($loaderPath) no coincide con el entorno esperado." -ForegroundColor Red
                $errorsFound = $true
            }
        }
    }
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   ✅ PRUEBA FINALIZADA" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host "Archivos revisados: $totalFiles"

if ($errorsFound) {
    Write-Host "🚨 RESULTADO: Se detectaron ERRORES/ADVERTENCIAS. Revisa los archivos marcados." -ForegroundColor Red
    exit 1
} else {
    Write-Host "🎉 RESULTADO: ¡TODO OK! No se detectaron problemas con los loaders de Firebase." -ForegroundColor Green
    exit 0
}