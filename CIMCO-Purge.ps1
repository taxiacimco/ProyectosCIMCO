# CIMCO-Purge v2.1 - Limpieza y Auditoría de Entorno (Fixed)
Write-Host "--- INICIANDO MANTENIMIENTO PROFESIONAL CIMCO ---" -ForegroundColor Cyan

# --- PARTE 1: LIMPIEZA DE BASURA ---
$targets = @("target", "dist", ".firebase", "build", "out")
Write-Host "[1/2] Limpiando archivos de compilación y temporales..." -ForegroundColor Yellow

foreach ($folder in $targets) {
    $found = Get-ChildItem -Path . -Include $folder -Recurse -ErrorAction SilentlyContinue
    if ($found) {
        $found | Remove-Item -Recurse -Force
        Write-Host "  ✔ Eliminado: $folder" -ForegroundColor Gray
    }
}

# Limpiar logs específicos
Remove-Item -Path "functions\*.log", "logs\*.log", "*.log" -ErrorAction SilentlyContinue
Write-Host "  ✔ Logs depurados." -ForegroundColor Gray

# --- PARTE 2: VALIDADOR DE VARIABLES .ENV ---
Write-Host "`n[2/2] Auditando variables de entorno (.env)..." -ForegroundColor Yellow

# Buscamos archivos .env.example
$envExamples = Get-ChildItem -Path . -Filter ".env.example" -Recurse

if (-not $envExamples) {
    Write-Host "  i No se encontraron archivos .env.example para comparar." -ForegroundColor DarkGray
} else {
    foreach ($example in $envExamples) {
        $dir = $example.DirectoryName
        # Simplificamos la ruta para mostrarla
        $shortPath = $dir.Split("\")[-1]
        $envActual = Join-Path $dir ".env"
        
        Write-Host "  Verificando: /$shortPath" -ForegroundColor White
        
        if (-not (Test-Path $envActual)) {
            Write-Host "  ⚠ ALERTA: No existe el archivo .env en /$shortPath" -ForegroundColor Red
            continue
        }

        # Extraer nombres de variables (ignora comentarios y líneas vacías)
        $keysExample = Get-Content $example.FullName | Where-Object { $_ -match "^[^#].+=" } | ForEach-Object { $_.Split('=')[0].Trim() }
        $keysActual = Get-Content $envActual | Where-Object { $_ -match "^[^#].+=" } | ForEach-Object { $_.Split('=')[0].Trim() }

        $missing = foreach ($k in $keysExample) { if ($k -notin $keysActual) { $k } }

        if ($missing) {
            Write-Host "  ❌ FALTAN VARIABLES en /$shortPath/.env :" -ForegroundColor Red
            $missing | ForEach-Object { Write-Host "     - $_" -ForegroundColor Red }
        } else {
            Write-Host "     ✅ Todo en orden." -ForegroundColor Green
        }
    }
}

Write-Host "`n--- MANTENIMIENTO COMPLETADO ---" -ForegroundColor Cyan