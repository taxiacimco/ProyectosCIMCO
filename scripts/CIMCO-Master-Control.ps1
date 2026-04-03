# ==========================================================
# CIMCO MASTER CONTROL - ARRANQUE Y MANTENIMIENTO (V3.1)
# ==========================================================
$ErrorActionPreference = "SilentlyContinue"
$BaseDir = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$ScriptsDir = "$BaseDir\scripts"
$JavaLogPath = "$BaseDir\taxia_cimco_backend\monitor\logs"

function LiberarBufferTeclado {
    $wshell = New-Object -ComObject WScript.Shell
    $wshell.SendKeys('{ESC}')
}

function Menu {
    Clear-Host
    Write-Host "==========================================" -ForegroundColor Magenta
    Write-Host "   SISTEMA DE CONTROL UNIFICADO CIMCO" -ForegroundColor White
    Write-Host "==========================================" -ForegroundColor Magenta
    Write-Host "1. INICIAR TODO (Local: Backend + Frontend)" -ForegroundColor Green
    Write-Host "2. LIMPIEZA TOTAL (Puertos, Logs y Cache)" -ForegroundColor Yellow
    Write-Host "3. RE-PROGRAMAR TAREAS (Monitor cada 5 min)" -ForegroundColor Cyan
    Write-Host "4. DETENER TODO (Kill Node y Java)" -ForegroundColor Red
    Write-Host "5. Salir"
    Write-Host "------------------------------------------" -ForegroundColor Gray
    Write-Host "6. DESPLIEGUE CORPORATIVO (Nube)" -ForegroundColor Blue
    Write-Host "==========================================" -ForegroundColor Magenta
    
    $choice = Read-Host "`nSelecciona una opcion"

    switch ($choice) {
        "1" { 
            LiberarBufferTeclado
            & "$ScriptsDir\iniciar-todo.ps1" 
        }
        "2" { 
            Write-Host "`n--- Iniciando mantenimiento profundo ---" -ForegroundColor Yellow
            LiberarBufferTeclado
            & "$ScriptsDir\liberar-puertos.ps1"
            & "$ScriptsDir\limpiar-logs.ps1"
            & "$ScriptsDir\limpiar-cache-web.ps1"

            if (Test-Path $JavaLogPath) {
                $viejos = Get-ChildItem -Path $JavaLogPath -Filter *.log | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
                if ($viejos) { $viejos | Remove-Item -Force }
            }
            [System.GC]::Collect()
            Write-Host "`n Limpieza completada." -ForegroundColor Green
            Pause
        }
        "3" { 
            LiberarBufferTeclado
            & "$ScriptsDir\programar-tareas.ps1" 
        }
        "4" { 
            Stop-Process -Name "node" -Force
            Stop-Process -Name "java" -Force
            LiberarBufferTeclado
            Write-Host "Sistema en reposo." -ForegroundColor Green
            Pause
        }
        "5" { exit }
        "6" { 
            $confirm = Read-Host "Confirmas el despliegue? (S/N)"
            if ($confirm -eq "S") {
                & "$ScriptsDir\deploy_all.ps1"
            }
            Pause
        }
    }
}

while($true) { Menu }