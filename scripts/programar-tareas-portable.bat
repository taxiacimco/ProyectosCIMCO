@echo off
title 🚀 Programador automático de tareas - TAXIA CIMCO (Portable)
color 0A
echo ==========================================================
echo 🕒 TAXIA CIMCO - Registro automático de tareas (Portable)
echo ==========================================================
echo.

:: Detectar usuario y ruta base del proyecto
set "USER_FOLDER=%USERPROFILE%"
set "PROJECT_PATH=%USER_FOLDER%\ProyectosCIMCO"
set "SCRIPTS_PATH=%PROJECT_PATH%\scripts"
set "PS_SCRIPT=%SCRIPTS_PATH%\programar-tareas.ps1"

:: Verifica permisos de administrador
NET SESSION >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Este script necesita permisos de administrador.
    echo 🔹 Haz clic derecho y selecciona "Ejecutar como administrador".
    pause
    exit /b
)

echo ✅ Ejecutando como administrador...

if not exist "%PS_SCRIPT%" (
    echo ❌ No se encontró el archivo PowerShell:
    echo    %PS_SCRIPT%
    echo 🔎 Asegúrate de que el proyecto esté en:
    echo    %PROJECT_PATH%
    pause
    exit /b
)

echo 🧠 Ejecutando PowerShell para registrar las tareas...
echo ----------------------------------------------------------
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%PS_SCRIPT%"
echo ----------------------------------------------------------
echo ✅ Todas las tareas han sido registradas correctamente.
echo.

echo 🕒 Verifica en el Programador de Tareas:
echo     03:00 AM → Despliegue silencioso TAXIA CIMCO
echo     03:10 AM → Limpieza de respaldo TAXIA CIMCO
echo     03:20 AM → Actualización automática de status TAXIA CIMCO
echo ==========================================================
pause
exit
