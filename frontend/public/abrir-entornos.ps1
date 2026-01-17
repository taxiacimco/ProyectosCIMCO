# ============================================================
# 🌐 Script: abrir-entornos.ps1
# Descripción: Abre simultáneamente las interfaces web TAXIA CIMCO,
#              mostrando iconos y nombres por entorno.
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$entornos = @(
    @{ Folder = "pasajero";       Emoji = "🚕"; Nombre = "Pasajero" },
    @{ Folder = "mototaxi";       Emoji = "🛵"; Nombre = "Mototaxi" },
    @{ Folder = "motoparrillero"; Emoji = "🧍"; Nombre = "Motoparrillero" },
    @{ Folder = "motocarga";      Emoji = "🚚"; Nombre = "Motocarga" },
    @{ Folder = "despachador";    Emoji = "🛰️"; Nombre = "Despachador" },
    @{ Folder = "interconductor"; Emoji = "🚦"; Nombre = "Conductor Inter" },
    @{ Folder = "admin";          Emoji = "💼"; Nombre = "CEO / Admin" }
)

foreach ($e in $entornos) {
    $path = ".\{0}\index.html" -f $e.Folder
    if (Test-Path $path) {
        Write-Host "🌎 $($e.Emoji) Abriendo entorno: $($e.Nombre)" -ForegroundColor Cyan
        Start-Process $path
    } else {
        Write-Host "⚠️ No se encontró: $path" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Todos los entornos disponibles han sido abiertos correctamente." -ForegroundColor Green
