@echo off
TITLE TAXIA CIMCO - ACCESO MAESTRO
COLOR 0B

:: ==========================================================
:: CONFIGURACIÓN DE RUTAS ABSOLUTAS
:: ==========================================================
set "PS_PATH=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
set "MASTER_SCRIPT=C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\CIMCO-Master-Control.ps1"

:: Verificar si el script de PowerShell existe antes de continuar
if not exist "%MASTER_SCRIPT%" (
    color 0C
    echo --------------------------------------------------
    echo [ERROR] NO SE ENCUENTRA EL ARCHIVO:
    echo %MASTER_SCRIPT%
    echo --------------------------------------------------
    echo Por favor, verifica que la ruta sea correcta.
    pause
    exit
)

echo ==================================================
echo           SISTEMA DE LANZAMIENTO CIMCO
echo ==================================================

:: [1/3] Limpiar procesos previos
echo [1/3] Limpiando procesos Node y Java en ejecucion...
taskkill /f /im node.exe /t >nul 2>&1
taskkill /f /im java.exe /t >nul 2>&1

:: [2/3] Liberar buffer de teclado
echo [2/3] Optimizando entrada de teclado...
"%PS_PATH%" -Command "$w = New-Object -ComObject WScript.Shell; $w.SendKeys('{ESC}')"
timeout /t 1 /nobreak >nul

:: [3/3] Ejecutar Master Control
echo [3/3] Iniciando Interfaz Magenta...
echo --------------------------------------------------

:: Ejecución con Bypass de política para evitar bloqueos de Windows
"%PS_PATH%" -NoProfile -ExecutionPolicy Bypass -File "%MASTER_SCRIPT%"

:: Captura de errores de PowerShell
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo --------------------------------------------------
    echo [!] ERROR CRITICO AL INICIAR POWERSHELL
    echo --------------------------------------------------
    echo Codigo de salida: %errorlevel%
    echo Posibles causas:
    echo 1. PowerShell esta restringido por el sistema.
    echo 2. El archivo .ps1 tiene errores de sintaxis.
    echo.
    pause
)