# super-start-local.ps1
# ---------------------------------------------------
# Inicia TODO el entorno local:
# - Limpia puertos
# - Carga variables .env.local
# - Compila TypeScript
# - Inicia Firebase emulators
# - Inicia el backend en modo watch
# ---------------------------------------------------

Write-Host "🚀 SUPER START LOCAL – Iniciando entorno completo..." -ForegroundColor Cyan

# 1. Ir a la raíz del proyecto
Set-Location "$PSScriptRoot\.."

# 2. Liberar puertos comunes (3000, 4000, 5001, 8080)
Write-Host "🔄 Liberando puertos ocupados..."
pwsh -ExecutionPolicy Bypass -File ".\scripts\liberar-puertos.ps1"

# 3. Cargar variables .env.local si existen
if (Test-Path ".env.local") {
    Write-Host "🔑 Cargando variables de .env.local"
    $envVars = Get-Content ".env.local" | Where-Object { $_ -match "=" }
    foreach ($line in $envVars) {
        $pair = $line -split "=", 2
        [Environment]::SetEnvironmentVariable($pair[0], $pair[1])
    }
} else {
    Write-Host "⚠️ No existe .env.local, se usan valores por defecto"
}

# 4. Construir backend TypeScript
Write-Host "🔧 Compilando TypeScript..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: La compilación falló. Revisa el código." -ForegroundColor Red
    exit 1
}

# 5. Iniciar Firebase emulators
Write-Host "🔥 Iniciando Firebase emulators..."
Start-Process "firebase" -ArgumentList "emulators:start --import=./data --export-on-exit" -NoNewWindow

Start-Sleep -Seconds 3

# 6. Iniciar backend en modo watch
Write-Host "🟢 Iniciando backend en modo watch..."
npm run start:dev

Write-Host "✨ Todo el entorno local está listo."
