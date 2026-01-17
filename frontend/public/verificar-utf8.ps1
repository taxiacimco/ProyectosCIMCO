# ============================================================
# 🔍 Script: verificar-utf8.ps1
# Descripción:
#   Escanea todos los archivos .ps1 y .html dentro del directorio actual
#   y detecta si están en formato UTF-8 SIN BOM (correcto) o con BOM (incorrecto).
#   Ideal para evitar errores con emojis y acentos en PowerShell.
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "`n🚀 Verificando codificación UTF-8 de archivos..." -ForegroundColor Cyan

# Buscar archivos relevantes
$archivos = Get-ChildItem -Path . -Recurse -Include *.ps1, *.html -ErrorAction SilentlyContinue

if ($archivos.Count -eq 0) {
    Write-Host "⚠️ No se encontraron archivos .ps1 o .html en este directorio." -ForegroundColor Yellow
    exit
}

$correctos = @()
$conBOM = @()
$otros = @()

foreach ($archivo in $archivos) {
    $bytes = [System.IO.File]::ReadAllBytes($archivo.FullName)

    # UTF-8 BOM = EF BB BF
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $conBOM += $archivo.FullName
    }
    else {
        try {
            [System.Text.Encoding]::UTF8.GetString($bytes) | Out-Null
            $correctos += $archivo.FullName
        }
        catch {
            $otros += $archivo.FullName
        }
    }
}

# Mostrar resultados
Write-Host "`n==================== RESULTADOS ====================" -ForegroundColor White
Write-Host "✅ Correctos (UTF-8 sin BOM): $($correctos.Count)" -ForegroundColor Green
Write-Host "⚠️ Con BOM (revisar y corregir): $($conBOM.Count)" -ForegroundColor Yellow
Write-Host "❌ Otros formatos (no UTF-8): $($otros.Count)" -ForegroundColor Red
Write-Host "====================================================="

if ($correctos.Count -gt 0) {
    Write-Host "`n✅ Archivos correctos:" -ForegroundColor Green
    $correctos | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
}

if ($conBOM.Count -gt 0) {
    Write-Host "`n⚠️ Archivos con BOM (debes re-guardarlos en UTF-8 sin BOM):" -ForegroundColor Yellow
    $conBOM | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkYellow }
}

if ($otros.Count -gt 0) {
    Write-Host "`n❌ Archivos en otro formato (posiblemente ANSI o Latin1):" -ForegroundColor Red
    $otros | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkRed }
}

Write-Host "`n🔧 Consejo: en VS Code abre el archivo, mira la barra inferior y cámbialo a 'UTF-8' sin BOM." -ForegroundColor Cyan
Write-Host "`n🧩 Verificación finalizada.`n" -ForegroundColor White
