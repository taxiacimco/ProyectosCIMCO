# Script de inicio optimizado para evitar descontrol de sistema
# Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\super-start-safe.ps1

$ErrorActionPreference = "Stop"
$LogFile = "C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\auto-run.log"

Write-Host "=== INICIANDO SISTEMA TAXIA CIMCO (MODO SEGURO) ===" -ForegroundColor Cyan
                                                                                                                                                                                                
# Función para ejecutar scripts sin robar el foco del teclado
function Start-CimcoProcess {
    param([string]$Path, [string]$Title)
    Write-Host "Iniciando $Title..." -ForegroundColor Yellow
    
    # Start-Process con WindowStyle Hidden o Minimized evita que la ventana salte al frente
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$Path`"" -WindowStyle Minimized
    Start-Sleep -Seconds 2 # Pausa para no saturar el procesador
}

try {
    # 1. Limpiar puertos antes de empezar
    & "C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\liberar-puertos.ps1"
    
    # 2. Iniciar Backend (Emulator)
    Start-CimcoProcess -Path "C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\iniciar-backend.ps1" -Title "Firebase Emulator"
    
    # 3. Iniciar Frontend (Vite)
    # Usamos --silent para que Node no envíe alertas innecesarias
    Set-Location "C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend"
    Start-Process cmd -ArgumentList "/c npm run dev -- --silent" -WindowStyle Minimized
    
    Write-Host "✅ Sistema iniciado. Todas las ventanas están minimizadas." -ForegroundColor Green
} catch {
    "Error en el inicio: $_" | Out-File -FilePath $LogFile -Append
    Write-Host "❌ Error detectado. Revisa auto-run.log" -ForegroundColor Red
}