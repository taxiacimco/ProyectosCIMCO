# ----------------------------
# start-local.ps1
# ----------------------------

Write-Host "🔹 Reiniciando backend local - TAXIA CIMCO 🔹"

# 1️⃣ Detener ts-node si ya está corriendo
$tsNodeProcesses = Get-Process -Name "ts-node" -ErrorAction SilentlyContinue
if ($tsNodeProcesses) {
    Write-Host "🛑 Deteniendo ts-node existente..."
    $tsNodeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# 2️⃣ Limpiar logs
$logPath = ".\logs\*"
if (Test-Path $logPath) {
    Write-Host "🧹 Limpiando logs antiguos..."
    Remove-Item $logPath -Force -Recurse -ErrorAction SilentlyContinue
}

# 3️⃣ Compilar TypeScript (si hay cambios)
if (Test-Path ".\tsconfig.json") {
    Write-Host "🔨 Compilando TypeScript..."
    npx tsc --project tsconfig.json
}

# 4️⃣ Levantar backend con ts-node
Write-Host "🚀 Iniciando backend local con ts-node..."
Start-Process powershell -ArgumentList "npx ts-node src/index.ts"

# 5️⃣ Abrir navegador automáticamente
Start-Sleep -Seconds 3
$urls = @(
    "http://localhost:5000/",            # Health check
    "http://localhost:5000/api/auth"    # Ruta de prueba auth
)
foreach ($url in $urls) {
    Start-Process $url
}

Write-Host "✅ Backend local levantado. Revisa las rutas en tu navegador."
