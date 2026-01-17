# ============================================================
# 🚀 Script: personalizar-interfaces.ps1
# Descripción: Personaliza cada index.html con título, gradiente y emoji
#              específicos para cada entorno TAXIA CIMCO.
#              🔥 Versión extendida: también inserta emojis en el <h1>.
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$roles = @(
    @{ Folder = "pasajero";       Emoji = "🚕"; Title = "🚕 TAXIA CIMCO — Pasajero";        Gradient = "from-pink-500 to-yellow-400" },
    @{ Folder = "mototaxi";       Emoji = "🛵"; Title = "🛵 TAXIA CIMCO — Mototaxi";        Gradient = "from-yellow-400 to-orange-500" },
    @{ Folder = "motoparrillero"; Emoji = "🧍"; Title = "🧍 TAXIA CIMCO — Motoparrillero";  Gradient = "from-purple-500 to-fuchsia-500" },
    @{ Folder = "motocarga";      Emoji = "🚚"; Title = "🚚 TAXIA CIMCO — Motocarga";       Gradient = "from-green-500 to-lime-400" },
    @{ Folder = "despachador";    Emoji = "🛰️"; Title = "🛰️ TAXIA CIMCO — Despachador";     Gradient = "from-blue-500 to-cyan-400" },
    @{ Folder = "interconductor"; Emoji = "🚦"; Title = "🚦 TAXIA CIMCO — Conductor Inter"; Gradient = "from-teal-500 to-cyan-500" },
    @{ Folder = "admin";          Emoji = "💼"; Title = "💼 TAXIA CIMCO — CEO / Admin";     Gradient = "from-slate-700 to-gray-900" }
)

foreach ($r in $roles) {
    $file = ".\{0}\index.html" -f $r.Folder

    if (Test-Path $file) {
        Write-Host "⚙️ Personalizando: $file" -ForegroundColor Cyan

        $content = Get-Content $file -Raw

        # Reemplazar el <title> por el título con emoji
        $content = $content -replace "<title>.*?</title>", "<title>$($r.Title)</title>"

        # Cambiar el gradiente principal del fondo
        $content = $content -replace "bg-gradient-to-br.*?\"", "bg-gradient-to-br $($r.Gradient)\""

        # Reemplazar el <h1> visible por versión extendida con emoji
        $content = $content -replace "<h1>.*?</h1>", "<h1 class='text-3xl font-bold'>$($r.Emoji) TAXIA CIMCO — $($r.Folder.ToUpper())</h1>"

        # Guardar el archivo actualizado
        Set-Content $file $content -Encoding UTF8
    }
    else {
        Write-Host "⚠️ No se encontró $file" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Personalización completada con emojis visibles y gradientes aplicados (UTF-8 sin BOM)." -ForegroundColor Green
