# ==================================================================
# PowerShell Script: fix-firebase-imports.ps1
# Objetivo: Reescribir todos los imports de firebase-init en TS
# ==================================================================

# Ruta base del proyecto
$basePath = "C:\Users\Carlos Fuentes\ProyectosCIMCO\functions\src"

# Buscar todos los archivos .ts
$tsFiles = Get-ChildItem -Path $basePath -Recurse -Filter "*.ts"

foreach ($file in $tsFiles) {
    $content = Get-Content $file.FullName -Raw

    # Reemplazo de imports que apuntan a firebase-init
    $newContent = $content -replace 'import\s+admin\s+from\s+["'']\.\/firebase-init(\.js)?["'']', 'import admin from "./firebase-init";'

    # Reemplazo opcional para named export (si quieres usar { admin, IS_FIREBASE })
    # $newContent = $content -replace 'import\s+admin\s+from\s+["'']\.\/firebase-init(\.js)?["'']', 'import { admin, IS_FIREBASE } from "./firebase-init";'

    # Guardar cambios si hubo modificaciones
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
        Write-Host "✅ Actualizado import en $($file.FullName)"
    }
}

Write-Host "🎯 Todos los imports de firebase-init han sido estandarizados."
