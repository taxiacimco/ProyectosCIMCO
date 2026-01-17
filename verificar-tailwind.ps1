# ============================================================
# Script: verificar-tailwind.ps1
# Autor: Carlos Mario Fuentes García
# Proyecto: TAXI A CIMCO
# Propósito: Verificar instalación, versión y compilación de TailwindCSS
# ============================================================

Write-Host "`n Verificando entorno de TailwindCSS..." -ForegroundColor Cyan

# 1️ Comprobar si existe el módulo de Tailwind
$tailwindPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\node_modules\tailwindcss\lib\cli.js"
if (Test-Path $tailwindPath) {
    Write-Host " Tailwind CLI encontrado en:" -ForegroundColor Green
    Write-Host "   $tailwindPath" -ForegroundColor DarkGray
} else {
    Write-Host " No se encontró Tailwind en node_modules." -ForegroundColor Red
    Write-Host "   Ejecuta: npm install -D tailwindcss postcss autoprefixer" -ForegroundColor Yellow
    exit 1
}

# 2️ Mostrar versión
Write-Host "`n Versión de Tailwind instalada:" -ForegroundColor Cyan
npx tailwindcss -h | Select-String "tailwindcss v"

# 3️ Compilar CSS
$inputFile = "./frontend/public/css/style.css"
$outputFile = "./frontend/public/css/output.css"

if (Test-Path $inputFile) {
    Write-Host "`n Compilando Tailwind..." -ForegroundColor Cyan
    npx tailwindcss -i $inputFile -o $outputFile --minify
    if (Test-Path $outputFile) {
        $size = (Get-Item $outputFile).Length / 1KB
        Write-Host " Compilación exitosa. Archivo generado:" -ForegroundColor Green
        Write-Host "   $outputFile ($([math]::Round($size,2)) KB)" -ForegroundColor DarkGray
    } else {
        Write-Host " No se generó el archivo output.css" -ForegroundColor Red
    }
} else {
    Write-Host " No se encontró el archivo de entrada: $inputFile" -ForegroundColor Red
}

Write-Host "`n Verificación de Tailwind finalizada.`n" -ForegroundColor Cyan
