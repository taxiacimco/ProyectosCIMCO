# ============================================================
# Script: alternar-entorno.ps1
# Descripción: Activa el entorno deseado (.env.local o .env.prod)
# ============================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$FunctionsDir = Join-Path $ProjectRoot "functions"

Clear-Host
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host "      SELECCIONAR ENTORNO TAXIA CIMCO" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host "Directorio detectado: $FunctionsDir" -ForegroundColor Gray
Write-Host ""
Write-Host "1) Local (desarrollo)" -ForegroundColor Cyan
Write-Host "2) Producción" -ForegroundColor Yellow
$choice = Read-Host "Selecciona (1 o 2)"

$EnvLocal = Join-Path $FunctionsDir ".env.local"
$EnvProd  = Join-Path $FunctionsDir ".env.production"
$EnvTarget = Join-Path $FunctionsDir ".env"

if ($choice -eq "1") {
    if (Test-Path $EnvLocal) {
        Copy-Item -Path $EnvLocal -Destination $EnvTarget -Force
        Write-Host "`n✅ Entorno LOCAL activado exitosamente." -ForegroundColor Green
    } else {
        Write-Host "`n❌ Error: No se encontro el archivo $EnvLocal" -ForegroundColor Red
        New-Item -Path $EnvLocal -ItemType File -Force | Out-Null
        Write-Host "💡 Se ha creado un archivo .env.local vacio para evitar bloqueos." -ForegroundColor Yellow
    }
} elseif ($choice -eq "2") {
    if (Test-Path $EnvProd) {
        Copy-Item -Path $EnvProd -Destination $EnvTarget -Force
        Write-Host "`n🚀 Entorno DE PRODUCCION activado exitosamente." -ForegroundColor Green
    } else {
        Write-Host "`n❌ Error: No se encontro el archivo $EnvProd" -ForegroundColor Red
    }
} else {
    Write-Host "`n❌ Opcion no valida." -ForegroundColor Red
}

Write-Host "`nPresiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")