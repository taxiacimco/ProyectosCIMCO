@echo off
title 🚀 Programador automático de tareas - TAXIA CIMCO
color 0A
echo ==========================================================
echo 🕒 TAXIA CIMCO - Registro automático de tareas
echo ==========================================================

NET SESSION >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Este script necesita permisos de administrador.
    echo 🔹 Haz clic derecho y selecciona "Ejecutar como administrador".
    pause
    exit /b
)

set "PS_SCRIPT=C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\programar-tareas.ps1"
if not exist "%PS_SCRIPT%" (
    echo ❌ No se encontró el archivo PowerShell:
    echo    %PS_SCRIPT%
    pause
    exit /b
)

echo 🧠 Ejecutando PowerShell para registrar las tareas...
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%PS_SCRIPT%"
echo ----------------------------------------------------------
echo ✅ Todas las tareas han sido registradas correctamente.
echo 🕒 03:00 → Despliegue silencioso
echo 🕒 03:10 → Limpieza de respaldo
echo 🕒 03:20 → Actualización automática de status
echo ==========================================================
pause
exit
