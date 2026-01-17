# ============================================================
# personalizar-interfaces.ps1 (versiÃ³n extendida con emojis)
# ============================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$roles = @(
    @{ Folder = "pasajero";        Title = "ðŸš• TAXIA CIMCO â€” Pasajero";       Gradient = "from-pink-500 to-yellow-400" },
    @{ Folder = "mototaxi";        Title = "ðŸ›µ TAXIA CIMCO â€” Mototaxi";       Gradient = "from-yellow-400 to-orange-500" },
    @{ Folder = "motoparrillero";  Title = "ðŸ§ TAXIA CIMCO â€” Motoparrillero"; Gradient = "from-purple-500 to-fuchsia-500" },
    @{ Folder = "motocarga";       Title = "ðŸ“¦ TAXIA CIMCO â€” Motocarga";      Gradient = "from-green-500 to-lime-400" },
    @{ Folder = "despachador";     Title = "ðŸ“ž TAXIA CIMCO â€” Despachador";    Gradient = "from-blue-500 to-indigo-500" },
    @{ Folder = "interconductor";  Title = "ðŸšš TAXIA CIMCO â€” Conductor Inter";Gradient = "from-teal-500 to-cyan-500" },
    @{ Folder = "admin";           Title = "ðŸ’¼ TAXIA CIMCO â€” CEO / Admin";    Gradient = "from-gray-700 to-gray-900" }
)

foreach ($role in $roles) {
    $indexPath = ".\{0}\index.html" -f $role.Folder

    if (Test-Path $indexPath) {
        Write-Host "ðŸŽ¨ Personalizando: $indexPath" -ForegroundColor Cyan

        $content = Get-Content $indexPath -Raw -Encoding UTF8

        # Actualizar tÃ­tulo del documento
        $content = $content -replace '(?<=<title>).*?(?=</title>)', $role.Title

        # Actualizar encabezado principal
        $content = $content -replace '(?<=<h1[^>]*>).*?(?=</h1>)', $role.Title

        # Actualizar gradiente de fondo (Tailwind)
        $content = $content -replace '(bg-gradient-to-r from-[\w-]+ to-[\w-]+)', "bg-gradient-to-r $($role.Gradient)"

        Set-Content $indexPath $content -Encoding UTF8
    }
    else {
        Write-Host "âš ï¸ No se encontrÃ³: $indexPath" -ForegroundColor Yellow
    }
}

Write-Host "`nâœ… PersonalizaciÃ³n completada con Ã©xito con emojis y colores Ãºnicos." -ForegroundColor Green
