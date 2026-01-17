# ====================================================================
# 🚦 FIRESTORE HEALTH CHECK AUTOMÁTICO - TAXI A CIMCO (versión estable)
# Ejecuta test-firestore-check.mjs y guarda el estado y fecha en status.json
# ====================================================================

# --- Configuración de rutas ---
$basePath = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$scriptsPath = Join-Path $basePath "scripts"
$logsPath = Join-Path $basePath "logs"
$statusFile = Join-Path $logsPath "status.json"

# Crear carpeta logs si no existe
if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath | Out-Null
}

Write-Host "🔍 Ejecutando verificación de Firestore..."

# Ejecutar test y capturar salida
$output = & node "$scriptsPath\test-firestore-check.mjs" 2>&1 | Out-String
# Limpieza de caracteres rotos y normalización
$cleanOutput = $output -replace '[^\w\s\.:-]', ' ' -replace '\s+', ' '

# --- Evaluación del resultado ---
if ($cleanOutput -match "(?i)completada" -and $cleanOutput -match "(?i)errores") {
    $status = @{
        status = "OK"
        lastCheck = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        message = "Firestore operativo y verificado correctamente."
    }
    Write-Host "✅ Firestore operativo y permisos válidos."
} else {
    $status = @{
        status = "ERROR"
        lastCheck = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        message = "Error al verificar Firestore: El test no reportó conexión correcta."
    }
    Write-Host "❌ Error en la verificación de Firestore."
}

# --- Guardar resultados ---
$status | ConvertTo-Json | Out-File -Encoding UTF8 $statusFile

# Mostrar salida completa y resumen
Write-Host "📄 Estado guardado en: $statusFile"
Write-Host "`n🧾 Resultado completo del test Firestore:`n"
Write-Host $cleanOutput
Write-Host "`n🧩 Estado actual del sistema:"
Get-Content $statusFile
