# Script de PowerShell para actualizar todos los archivos HTML (excepto backups).
# 1. Inyecta la definición de la variable global APP_ENV = 'dev'.
# 2. Convierte los scripts de carga de Firebase a type="module".

$AppEnvScript = "`n    <script>`n        <!-- Define el entorno de la aplicación. 'dev' (Desarrollo) es el valor por defecto. -->`n        <!-- CÁMBIALO MANUALMENTE A 'prod' solo antes de desplegar en producción. -->`n        const APP_ENV = 'dev'; `n    </script>`n"

# =========================================================================
# 1. ENCONTRAR Y FILTRAR ARCHIVOS
# =========================================================================

# Busca todos los archivos HTML de forma recursiva, excluyendo cualquier directorio que contenga "backup"
Write-Host "Iniciando búsqueda de archivos HTML..." -ForegroundColor Cyan

Get-ChildItem -Path . -Include *.html -Recurse | Where-Object { 
    $_.FullName -notmatch "backup_" -and $_.FullName -notmatch "backups_" 
} | ForEach-Object {
    $FilePath = $_.FullName
    Write-Host "`nProcesando archivo: $FilePath" -ForegroundColor Yellow

    # Lee el contenido completo del archivo
    $Content = Get-Content $FilePath -Raw

    # =========================================================================
    # 2. INYECTAR APP_ENV
    # =========================================================================
    # Si APP_ENV no está definida, la inserta antes del cierre de </head>
    if ($Content -notmatch "const APP_ENV") {
        Write-Host "   -> Insertando la definición de APP_ENV ('dev')." -ForegroundColor Green
        # Reemplaza </head> con el script de entorno y </head>
        $NewContent = $Content -replace "</head>", ($AppEnvScript + "</head>")
        $Content = $NewContent
    } else {
        Write-Host "   -> APP_ENV ya existe. Saltando inserción."
    }

    # =========================================================================
    # 3. CONVERTIR SCRIPT LOADER A MÓDULO
    # =========================================================================
    # Patrón para el loader principal: busca cualquier script que cargue firebase-loader.js o firebase-loader-admin.js
    # y que NO tenga ya el type="module". Esto también maneja las rutas relativas.

    $OldPattern = '(<script src="[^"]*?firebase-loader[^"]*\.js")[^>]*?>\s*</script>'
    $NewPattern = '<script type="module" src="$1"></script>'
    
    # Realiza el reemplazo si encuentra el patrón ANTIGUO y no encuentra el type="module"
    if ($Content -match $OldPattern -and $Content -notmatch 'type="module"') {
        Write-Host "   -> Actualizando el script loader a 'type=""module""'." -ForegroundColor Green
        $Content = $Content -replace $OldPattern, $NewPattern
    } else {
        Write-Host "   -> Script loader ya es un módulo o no encontrado. Saltando actualización."
    }
    
    # =========================================================================
    # 4. GUARDAR CAMBIOS
    # =========================================================================

    # Sobrescribir el archivo con el nuevo contenido, asegurando la codificación UTF8
    $Content | Set-Content $FilePath -Force -Encoding UTF8
}

Write-Host "`n✅ ¡Proceso de actualización de scripts en HTML completado con éxito! ✅`n" -ForegroundColor Cyan
Write-Host "Acciones realizadas:" -ForegroundColor Cyan
Write-Host "- La variable 'const APP_ENV = 'dev';' fue inyectada en el <head> de los archivos." -ForegroundColor Cyan
Write-Host "- La carga de los loaders de Firebase fue ajustada a '<script type=""module"" ...>'." -ForegroundColor Cyan
Write-Host "`n🚨 Próximo Paso Crítico:" -ForegroundColor Red
Write-Host "1. Revisa tu archivo 'firebase-config-manager.mjs' y reemplaza las claves de 'DEV_CONFIG'." -ForegroundColor Red
Write-Host "2. Recuerda que debes cambiar 'dev' a 'prod' en cada HTML antes de ejecutar el despliegue final." -ForegroundColor Red