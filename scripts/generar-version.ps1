# ============================================================
# Script: generar-version.ps1
# Proyecto: TAXIA-CIMCO
# Descripción: Genera un archivo version.json con la fecha actual
# ============================================================

Write-Host ""
Write-Host "============================================================"
Write-Host " GENERANDO NUEVA VERSION DEL PROYECTO TAXIA-CIMCO "
Write-Host "============================================================"

$fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$version = Get-Date -Format "yyyy.MM.dd-HHmm"

$versionData = @{
    version = $version
    deployed = $fecha
}

$versionJson = $versionData | ConvertTo-Json -Depth 2
$path = "C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\public\version.json"

Set-Content -Path $path -Value $versionJson -Encoding UTF8

Write-Host ""
Write-Host "Archivo version.json generado correctamente en:"
Write-Host $path
Write-Host ""
Write-Host "Versión: $version"
Write-Host "Fecha de despliegue: $fecha"
Write-Host "============================================================"
