# ============================================================
# Script: alternar-entorno.ps1
# Descripción: Activa el entorno deseado (.env.local o .env.prod)
# ============================================================

Clear-Host
Write-Host "============================================="
Write-Host "    SELECCIONAR ENTORNO TAXI A CIMCO"
Write-Host "============================================="
Write-Host ""
Write-Host "1) Local (desarrollo)"
Write-Host "2) Producción"
$choice = Read-Host "Selecciona (1 o 2)"

if ($choice -eq "1") {
    Copy-Item -Path ".\functions\.env.local" -Destination ".\functions\.env" -Force
    Write-Host "✅ Entorno local activado (.env.local copiado a .env)"
} elseif ($choice -eq "2") {
    Copy-Item -Path ".\functions\.env.prod" -Destination ".\functions\.env" -Force
    Write-Host "🚀 Entorno de producción activado (.env.prod copiado a .env)"
} else {
    Write-Host "❌ Opción no válida"
}
