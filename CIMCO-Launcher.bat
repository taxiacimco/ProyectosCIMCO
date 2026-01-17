@echo off
title 🚀 CIMCO Launcher
color 0A
echo ===========================================
echo     INICIANDO PANEL DE CONTROL CIMCO
echo ===========================================
echo.

REM Cambiar a UTF-8
chcp 65001 >nul

REM Detectar la ruta de PowerShell
set "PS_PATH=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

if not exist "%PS_PATH%" (
    echo ❌ No se encontró PowerShell en tu sistema.
    pause
    exit /b
)

REM Ejecutar PowerShell sin pedir confirmación de política
"%PS_PATH%" -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%~dp0'; ./start-firebase.ps1"

pause
