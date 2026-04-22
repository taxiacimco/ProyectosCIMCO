# ==========================================================
# CIMCO MASTER CONTROL - ARRANQUE Y MANTENIMIENTO (V3.2)
# ==========================================================
# Configuración de robustez
$ErrorActionPreference = "Continue" # Cambiado a Continue para poder ver errores si ocurren
$BaseDir = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$ScriptsDir = "$BaseDir\scripts"
$JavaLogPath = "$BaseDir\taxia_cimco_backend\monitor\logs"

# Función para evitar que el teclado se quede "pegado" en procesos batch
function LiberarBufferTeclado {
    try {
        $wshell = New-Object -ComObject WScript.Shell
        $wshell.SendKeys('{ESC}')
    } catch {
        Write-Warning "No se pudo liberar el buffer del teclado."
    }
}

# Función para ejecutar scripts verificando su existencia
function Ejecutar-Script {
    param([string]$Path, [string]$Nombre)
    if (Test-Path $Path) {
        Write-Host ">>> Ejecutando $Nombre..." -ForegroundColor Cyan
        & $Path
    } else {
        Write-Host "xxx ERROR: No se encuentra el script: $Path" -ForegroundColor Red
        Write-Host "    Verifica la carpeta scripts." -ForegroundColor Yellow
        Pause
    }
}

function Menu {
    Clear-Host
    Write-Host "==========================================" -ForegroundColor Magenta
    Write-Host "   SISTEMA DE CONTROL UNIFICADO CIMCO" -ForegroundColor White
    Write-Host "   Usuario: Carlos Fuentes | Pro" -ForegroundColor Gray
    Write-Host "==========================================" -ForegroundColor Magenta
    Write-Host "1. INICIAR TODO (Local: Backend + Frontend)" -ForegroundColor Green
    Write-Host "2. LIMPIEZA TOTAL (Puertos, Logs y Cache)" -ForegroundColor Yellow
    Write-Host "3. RE-PROGRAMAR TAREAS (Monitor cada 5 min)" -ForegroundColor Cyan
    Write-Host "4. DETENER TODO (Kill Node y Java)" -ForegroundColor Red
    Write-Host "5. SALIR" -ForegroundColor White
    Write-Host "------------------------------------------" -ForegroundColor Gray
    Write-Host "6. DESPLIEGUE CORPORATIVO (Firebase/Cloud)" -ForegroundColor Blue
    Write-Host "==========================================" -ForegroundColor Magenta
    
    $choice = Read-Host "`nSelecciona una opcion [1-6]"

    switch ($choice) {
        "1" { 
            LiberarBufferTeclado
            Ejecutar-Script -Path "$ScriptsDir\iniciar-todo.ps1" -Nombre "Iniciar Todo"
        }
        "2" { 
            Write-Host "`n--- Iniciando mantenimiento profundo ---" -ForegroundColor Yellow
            LiberarBufferTeclado
            Ejecutar-Script -Path "$ScriptsDir\liberar-puertos.ps1" -Nombre "Liberar Puertos"
            Ejecutar-Script -Path "$ScriptsDir\limpiar-logs.ps1" -Nombre "Limpiar Logs"
            Ejecutar-Script -Path "$ScriptsDir\limpiar-cache-web.ps1" -Nombre "Limpiar Cache"

            # Limpieza de logs antiguos de Java
            if (Test-Path $JavaLogPath) {
                Write-Host "Limpiando logs de Java antiguos..." -ForegroundColor Gray
                $viejos = Get-ChildItem -Path $JavaLogPath -Filter *.log | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
                if ($viejos) { 
                    $viejos | Remove-Item -Force 
                    Write-Host "Logs eliminados correctamente." -ForegroundColor Green
                }
            }
            [System.GC]::Collect()
            Write-Host "`n[OK] Mantenimiento completado." -ForegroundColor Green
            Pause
        }
        "3" { 
            LiberarBufferTeclado
            Ejecutar-Script -Path "$ScriptsDir\programar-tareas.ps1" -Nombre "Programar Tareas"
        }
        "4" { 
            Write-Host "Deteniendo procesos activos..." -ForegroundColor Red
            Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
            Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force
            LiberarBufferTeclado
            Write-Host "Sistema en reposo (Node y Java cerrados)." -ForegroundColor Green
            Pause
        }
        "5" { 
            Write-Host "Cerrando consola..." -ForegroundColor Gray
            exit 
        }
        "6" { 
            $confirm = Read-Host "Confirmas el DESPLIEGUE a produccion? (S/N)"
            if ($confirm -eq "S" -or $confirm -eq "s") {
                Ejecutar-Script -Path "$ScriptsDir\deploy_all.ps1" -Nombre "Despliegue General"
            } else {
                Write-Host "Despliegue cancelado por el usuario." -ForegroundColor Yellow
                Pause
            }
        }
        default {
            Write-Host "Opcion no valida, intenta de nuevo." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}

# Bucle principal
while($true) { Menu }