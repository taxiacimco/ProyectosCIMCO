@echo off
title 🚀 Iniciando entorno PRODUCCIÓN - CIMCO
echo ==========================================
echo 🔧 Cargando entorno de producción (.env.production)
echo ==========================================

REM Cambiar al directorio actual del script
cd /d "%~dp0"

REM Copiar el archivo .env.production como .env
if exist .env (
    del .env
)
copy .env.production .env >nul

echo ✅ Archivo .env.production cargado correctamente.
echo.

REM Instalar dependencias si es necesario
if exist package.json (
    echo 📦 Verificando dependencias...
    call npm install
)

echo.
echo 🚀 Desplegando funciones en Firebase PRODUCCIÓN...
echo ==========================================
firebase deploy --only functions
pause
