# -------------------------------------------------
# Script para liberar puertos usados por Firebase/Emulators/Node/Java
# Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\liberar-puertos.ps1
# -------------------------------------------------

[CmdletBinding()]
param()

$ErrorActionPreference = "SilentlyContinue"

Write-Host "`n--- Iniciando limpieza de puertos en ProyectosCIMCO ---" -ForegroundColor Cyan

# Lista completa de puertos: 
# 4400, 4005, 8085, 5005, 8090 (Tus originales)
# 5001 (Functions), 8080 (Firestore), 9099 (Auth), 5173 (Vite default), 3000 (React/Node default)
$portsToCheck = @(3000, 4005, 4400, 5001, 5005, 5173, 8080, 8085, 8090, 9099)

$foundPids = @()

Write-Host "Buscando procesos activos..." -ForegroundColor Gray

if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    foreach ($p in $portsToCheck) {
        $conns = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            if ($c.OwningProcess) { $foundPids += $c.OwningProcess }
        }
    }
} else {
    # Fallback: netstat.exe
    $netstat = Join-Path $env:windir "System32\netstat.exe"
    if (-Not (Test-Path $netstat)) {
        Write-Host "[ERROR] No se encontró netstat.exe." -ForegroundColor Red
        exit 1
    }
    $lines = & $netstat -ano
    foreach ($p in $portsToCheck) {
        foreach ($line in $lines) {
            if ($line -match "[:\.]$p\s") {
                $cols = $line -split '\s+' | Where-Object { $_ -ne '' }
                $pid = $cols[-1]
                if ($pid -match '^\d+$') { $foundPids += [int]$pid }
            }
        }
    }
}

$foundPids = $foundPids | Sort-Object -Unique

if ($foundPids.Count -eq 0) {
    Write-Host "[OK] No se detectaron procesos en los puertos configurados. Sistema limpio." -ForegroundColor Green
    exit 0
}

Write-Host "`nSe detectaron los siguientes procesos ocupando puertos:" -ForegroundColor Yellow
foreach ($pid in $foundPids) {
    try {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host (" -> PID {0} | Nombre: {1} | CPU: {2}" -f $proc.Id, $proc.ProcessName, $proc.CPU) -ForegroundColor Yellow
        } else {
            Write-Host (" -> PID {0} | (No se pudo obtener el nombre)" -f $pid) -ForegroundColor Yellow
        }
    } catch {
        Write-Host (" -> PID {0} | (Error de acceso)" -f $pid) -ForegroundColor Yellow
    }
}

Write-Host ""
$confirm = Read-Host "¿Deseas forzar el cierre de estos procesos? (S/N)"
if ($confirm.ToUpper() -ne "S") {
    Write-Host "Operación cancelada por el usuario." -ForegroundColor Cyan
    exit 0
}

# Cerrar procesos con barra de progreso
$total = $foundPids.Count
$i = 0
foreach ($pid in $foundPids) {
    $i++
    $percent = [int](($i / $total) * 100)
    Write-Progress -Activity "Liberando puertos" -Status "Cerrando PID $pid ($i de $total)" -PercentComplete $percent
    try {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 400
        Write-Host (" -> PID {0} finalizado correctamente." -f $pid) -ForegroundColor Green
    } catch {
        Write-Host (" -> [!] No se pudo cerrar PID {0}. Prueba ejecutando como Administrador." -f $pid) -ForegroundColor Red
    }
}

Write-Progress -Activity "Liberando puertos" -Completed
Write-Host "`nLimpieza finalizada. Ya puedes iniciar tus servicios." -ForegroundColor Cyan