@echo off
title 🚀 CIMCO Launcher — Backend Manager (BAT)
color 0B
cls

set ROOT=%~dp0
cd /d "%ROOT%"

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║              🚖  TAXIA CIMCO - LAUNCHER               ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Selecciona el entorno que deseas iniciar:
echo   [1] 🧩 Entorno LOCAL (Emuladores Firebase)
echo   [2] 🌍 Entorno PRODUCCIÓN (Deploy funciones)
echo   [3] ❌ Salir
echo.
set /p option=👉 Ingresa una opción (1-3): 

if "%option%"=="1" goto LOCAL
if "%option%"=="2" goto PROD
if "%option%"=="3" goto EXIT

echo ❌ Opción no válida.
pause
exit /b

:LOCAL
cls
echo 🔧 Iniciando entorno LOCAL...
if exist ".env.development" (
    copy /Y ".env.development" ".env" >nul
    echo ✅ .env.development -> .env
) else (
    echo ⚠️ No se encontró .env.development. Asegurate de tenerlo.
)

echo.
echo 📦 Lanzando npm install (se ejecutará en segundo plano)...
:: Creamos un lock file dentro del background process y lo eliminamos al terminar
start "" /b cmd /c "echo installing > .npm_install_lock & npm install --no-audit --no-fund & if exist .npm_install_lock del .npm_install_lock"
:: Mostrar barra animada mientras exista el lock
set "spinner=|/-\"
:waitLoop
if exist ".npm_install_lock" (
    for /l %%i in (0,1,3) do (
      set /p="Instalando dependencias... %spinner:~%%i,1% " <nul
      ping -n 1 -w 400 127.0.0.1 >nul
      <nul set /p="`r"
    )
    goto waitLoop
)
echo.
echo ✅ Dependencias instaladas (o ya estaban).
echo.
echo ⚙️ Iniciando emuladores Firebase...
firebase emulators:start
goto END

:PROD
cls
echo 🚀 Iniciando despliegue a PRODUCCIÓN...
if exist ".env.production" (
    copy /Y ".env.production" ".env" >nul
    echo ✅ .env.production -> .env
) else (
    echo ⚠️ No se encontró .env.production. Asegurate de tenerlo.
)

echo.
echo 📦 Lanzando npm install (se ejecutará en segundo plano)...
start "" /b cmd /c "echo installing > .npm_install_lock & npm install --no-audit --no-fund & if exist .npm_install_lock del .npm_install_lock"
set "spinner=|/-\"
:waitLoopProd
if exist ".npm_install_lock" (
    for /l %%i in (0,1,3) do (
      set /p="Instalando dependencias... %spinner:~%%i,1% " <nul
      ping -n 1 -w 400 127.0.0.1 >nul
      <nul set /p="`r"
    )
    goto waitLoopProd
)
echo.
echo ✅ Dependencias instaladas.
echo.
echo 🌎 Desplegando funciones a Firebase Cloud...
firebase deploy --only functions
goto END

:EXIT
cls
echo 👋 Saliendo del lanzador.
timeout /t 1 >nul
exit /b

:END
pause
