@echo off
setlocal

:: =======================================================
:: CONFIGURACION - AJUSTAR SI ES NECESARIO
:: =======================================================
:: La carpeta raiz de tu proyecto, donde reside firebase.json
SET PROJECT_ROOT=C:\Users\Carlos Fuentes\ProyectosCIMCO
:: El ID de tu proyecto de Firebase
SET FIREBASE_PROJECT_ID=pelagic-chalice-467818-e1
:: La subcarpeta donde esta el script de Node.js (asumo que es 'panel')
SET PANEL_DIR=%PROJECT_ROOT%\panel
:: El nombre del script de Node.js
SET NODE_SCRIPT=auto-update-status.mjs
:: EL NOMBRE DEL TARGET DE HOSTING SIMPLE (El nombre corto en firebase.json)
:: ¡IMPORTANTE! Hemos confirmado que este debe ser 'panel'
SET HOSTING_TARGET=panel

echo.
echo =======================================================
echo == TAXIA CIMCO - INICIO DE ACTUALIZACION AUTOMATICA ===
echo =======================================================
echo.

:: 1. Ejecutar el script de Node.js
echo [1/2] - Ejecutando script de Node.js para actualizar status.json...
:: Cambiar al directorio 'panel' para ejecutar el script
cd /d "%PANEL_DIR%"
node "%NODE_SCRIPT%"

echo.

:: 2. Despliegue a Firebase Hosting
echo [2/2] - Desplegando archivos actualizados a Firebase Hosting...
:: Regresar al directorio raiz del proyecto para que 'firebase deploy' encuentre firebase.json
cd /d "%PROJECT_ROOT%"
:: Comando corregido: Usa el ID del proyecto y SOLO el nombre corto del target (panel)
firebase deploy --project %FIREBASE_PROJECT_ID% --only hosting:%HOSTING_TARGET%

echo.

:END
echo ======================================================
echo == TAXIA CIMCO - FIN DE PROCESO DE ACTUALIZACION  ==
echo ======================================================

endlocal