@echo off
title 🚀 Iniciando entorno LOCAL - CIMCO
echo ==========================================
echo 🔧 Cargando entorno local (.env.development)
echo ==========================================

REM Cambiar al directorio actual del script
cd /d "%~dp0"

REM Copiar el archivo .env.development como .env
if exist .env (
    del .env
)
copy .env.development .env >nul

echo ✅ Archivo .env.local cargado correctamente.
echo.

REM Instalar dependencias si es necesario
if exist package.json (
    echo 📦 Verificando dependencias...
    call npm install
)

echo.
echo 🚀 Iniciando emuladores de Firebase (local)...
echo ==========================================
firebase emulators:start
pause
