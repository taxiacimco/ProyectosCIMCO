# ============================================================
# 🔧 Script: reparar-utf8.ps1
# Descripción:
#   Corrige automáticamente archivos .ps1 y .html con BOM o codificación errónea,
#   convirtiéndolos a UTF-8 sin BOM, sin alterar el contenido visible.
#   Ideal para mantener emojis, acentos y símbolos funcionando correctamente.
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "`n🔧 Iniciando reparación automática de codificación UTF-8..." -ForegroundColor Cyan

# Buscar archivos relevantes
$archivos = Get-ChildItem -Path . -Recurse -Include *.ps1, *.html -ErrorAction SilentlyContinue

if ($archivos.Count -eq 0) {
    Write-Host "⚠️ No se encontraron archivos .ps1 o .html en este directorio." -ForegroundColor Yellow
    exit
}

$reparados = @()
$yaCorrectos = @()

foreach ($archivo in $archivos) {
    try {
        $bytes = [System.IO.File]::ReadAllBytes($archivo.FullName)

        # Detectar BOM (EF BB BF)
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            $nuevo = [System.Text.Encoding]::UTF8.GetString($bytes[3..($bytes.Length - 1)])
            [System.IO.File]::WriteAllText($archivo.FullName, $nuevo, (New-Object System.Text.UTF8Encoding $false))
            $reparados += $archivo.FullName
        }
        else {
            # Reescribir en UTF-8 sin BOM para asegurar formato correcto
            $contenido = Get-Content -Path $archivo.FullName -Raw
            [System.IO.File]::WriteAllText($archivo.FullName, $contenido, (New-Object System.Text.UTF8Encoding $false))
            $yaCorrectos += $archivo.FullName
        }
    }
    catch {
        Write-Host "❌ Error procesando $($archivo.FullName): $_" -ForegroundColor Red
    }
}

# Mostrar resumen
Write-Host "`n================= RESULTADOS =================" -ForegroundColor White
Write-Host "🧩 Archivos reparados (se eliminó BOM): $($reparados.Count)" -ForegroundColor Yellow
Write-Host "✅ Archivos ya correctos (UTF-8 sin BOM): $($yaCorrectos.Count)" -ForegroundColor Green
Write-Host "============================================="

if ($reparados.Count -gt 0) {
    Write-Host "`n🛠️ Archivos reparados:" -ForegroundColor Yellow
    $reparados | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkYellow }
}

if ($yaCorrectos.Count -gt 0) {
    Write-Host "`n✅ Archivos que ya estaban correctos:" -ForegroundColor Green
    $yaCorrectos | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
}

Write-Host "`n🎯 Reparación de codificación completada exitosamente.`n" -ForegroundColor Cyan
