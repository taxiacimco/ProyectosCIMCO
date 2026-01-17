$roles = @(
    "pasajero",
    "admin",
    "interconductor",
    "mototaxi",
    "motoparrillero",
    "motocarga",
    "despachador"
)

foreach ($r in $roles) {
    Write-Host "🚀 Compilando rol: $r" -ForegroundColor Cyan
    $env:VITE_APP_ROLE = $r
    npm run build
    Write-Host "✔ Build completado: $r" -ForegroundColor Green
}
