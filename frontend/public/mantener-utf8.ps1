[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$logFile = Join-Path $PSScriptRoot "utf8-log.txt"
function Log($mensaje) {
    $linea = ("[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $mensaje)
    Add-Content -Path $logFile -Value $linea -Encoding UTF8
}

Write-Host "`n Iniciando mantenimiento total UTF-8..." -ForegroundColor Cyan
Log "=== Inicio del mantenimiento UTF-8 ==="

function Verificar-Codificacion {
    Write-Host "`n Verificando archivos .ps1 y .html..." -ForegroundColor Yellow
    $archivos = Get-ChildItem -Path $PSScriptRoot -Recurse -Include *.ps1, *.html -ErrorAction SilentlyContinue
    $malos = @()
    $buenos = @()

    foreach ($archivo in $archivos) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes($archivo.FullName)
            if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
                $malos += $archivo.FullName
                Log "BOM detectado en $($archivo.FullName)"
            } else {
                $buenos += $archivo.FullName
            }
        } catch {
            Log "Error leyendo $($archivo.FullName): $($_.Exception.Message)"
        }
    }

    Write-Host "`n Correctos: $($buenos.Count) /  Con BOM: $($malos.Count)" -ForegroundColor White
    Log "Correctos: $($buenos.Count) | Con BOM: $($malos.Count)"

    return [PSCustomObject]@{ Buenos = $buenos; Malos = $malos }
}

function Reparar-Codificacion {
    param([string[]]$ArchivosMalos)
    if (-not $ArchivosMalos -or $ArchivosMalos.Count -eq 0) {
        Write-Host "`n No hay archivos que reparar." -ForegroundColor Green
        Log "No se encontraron archivos con BOM."
        return @()
    }

    Write-Host "`n Corrigiendo archivos con BOM..." -ForegroundColor Yellow
    Log "Corrigiendo archivos..."
    $reparados = @()

    foreach ($archivo in $ArchivosMalos) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes($archivo)
            # Quitar los 3 bytes BOM y reconstruir string
            $bodyBytes = $bytes[3..($bytes.Length - 1)]
            $nuevo = [System.Text.Encoding]::UTF8.GetString($bodyBytes)
            [System.IO.File]::WriteAllText($archivo, $nuevo, (New-Object System.Text.UTF8Encoding $false))
            Write-Host ("    Reparado: " + $archivo) -ForegroundColor DarkYellow
            Log "Reparado: $archivo"
            $reparados += $archivo
        } catch {
            Write-Host ("    Error en $archivo -> " + $_.Exception.Message) -ForegroundColor Red
            Log ("Error procesando ${archivo}: " + $_.Exception.Message)
        }
    }
    return $reparados
}

function Abrir-HTMLs {
    param([string[]]$Archivos)
    if (-not $Archivos -or $Archivos.Count -eq 0) { return }
    Write-Host "`n Abriendo HTMLs reparados..." -ForegroundColor Cyan
    foreach ($archivo in $Archivos) {
        if ($archivo.ToLower().EndsWith(".html")) {
            Start-Process $archivo
            Start-Sleep -Milliseconds 500
        }
    }
}

function Mostrar-Resumen {
    param([string[]]$Buenos, [string[]]$Malos, [string[]]$Reparados)
    Write-Host "`n==============================================" -ForegroundColor DarkGray
    Write-Host " RESUMEN FINAL DEL MANTENIMIENTO UTF-8" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor DarkGray
    Write-Host " Correctos: $($Buenos.Count)" -ForegroundColor Green
    Write-Host " Con BOM: $($Malos.Count)" -ForegroundColor Yellow
    Write-Host " Reparados: $($Reparados.Count)" -ForegroundColor Cyan

    if ($Reparados.Count -gt 0) {
        Write-Host "`n Archivos reparados:" -ForegroundColor White
        foreach ($r in $Reparados) { Write-Host "    $r" -ForegroundColor DarkCyan }
    }

    Write-Host "`n Mantenimiento completado exitosamente." -ForegroundColor Green
    Write-Host "==============================================`n" -ForegroundColor DarkGray
    [console]::beep(880,200); Start-Sleep -Milliseconds 150; [console]::beep(1040,200)
    Log "Correctos: $($Buenos.Count) | Con BOM: $($Malos.Count) | Reparados: $($Reparados.Count)"
    Log "=== Fin del mantenimiento UTF-8 ===`n"
}

# Ejecutar flujo
$resultado = Verificar-Codificacion
$reparados = Reparar-Codificacion -ArchivosMalos $resultado.Malos
Abrir-HTMLs -Archivos $reparados

# Re-comprobación final
$todos = Get-ChildItem -Path $PSScriptRoot -Recurse -Include *.ps1, *.html -ErrorAction SilentlyContinue
$buenosFinal = @()
foreach ($f in $todos) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    if (-not ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)) {
        $buenosFinal += $f.FullName
    }
}
Mostrar-Resumen -Buenos $buenosFinal -Malos $resultado.Malos -Reparados $reparados