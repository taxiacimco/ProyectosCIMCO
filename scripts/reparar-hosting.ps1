# reparar-hosting.ps1
# Limpieza segura SOLO dentro de /public. Por defecto DryRun (no borra).
param(
    [switch]$DryRun = $true
)

$Root = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$Public = Join-Path $Root "public"

Write-Host "=== REPARAR HOSTING (SOLO $Public) ===" -ForegroundColor Cyan
Write-Host "DryRun = $DryRun"

if (-not (Test-Path $Public)) {
    Write-Host "❌ No existe la carpeta public: $Public" -ForegroundColor Red
    exit 1
}

# Patrones de limpieza segura
$patterns = @('backup*','*backup*','*node_modules*','*.zip','*.tar.gz','*.log','*.DS_Store','*coverage*')

$itemsToRemove = @()
foreach ($p in $patterns) {
    $found = Get-ChildItem -Path $Public -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -like $p }
    if ($found) { $itemsToRemove += $found }
}

if ($itemsToRemove.Count -eq 0) {
    Write-Host "No se encontraron elementos a limpiar." -ForegroundColor Green
    exit 0
}

Write-Host "Elementos detectados: $($itemsToRemove.Count)"
foreach ($i in $itemsToRemove) { Write-Host " - $($i.FullName)" }

if ($DryRun) {
    Write-Host "`nModo DryRun activado. Ningún archivo será eliminado." -ForegroundColor Yellow
    Write-Host "Ejecuta con -DryRun:`$false para eliminar." -ForegroundColor Cyan
    exit 0
}

# Confirmación manual adicional
$confirm = Read-Host "¿Deseas eliminar los elementos listados? Escribe SI para confirmar"
if ($confirm -ne "SI") {
    Write-Host "Operación cancelada por usuario." -ForegroundColor Yellow
    exit 1
}

foreach ($i in $itemsToRemove) {
    try {
        Remove-Item $i.FullName -Recurse -Force -ErrorAction Stop
        Write-Host "Eliminado: $($i.FullName)" -ForegroundColor Green
    } catch {
        Write-Host "Error eliminando: $($i.FullName) — $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "✅ Reparación completada." -ForegroundColor Green
exit 0
