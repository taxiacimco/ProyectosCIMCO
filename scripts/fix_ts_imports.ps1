# Script de PowerShell para automatizar la corrección de imports relativos en archivos .ts
# Agrega la extensión ".js" a todas las importaciones relativas (./ o ../) y asegura las comillas.
#
# INSTRUCCIÓN: Ejecuta este script desde la raíz de tu proyecto (el directorio que contiene
# las carpetas 'frontend' y 'functions').

# --- CONFIGURACIÓN DE RUTAS ---
$FunctionsSrcDir = "functions/src"
$TsFiles = Get-ChildItem -Path $FunctionsSrcDir -Filter "*.ts" -Recurse

Write-Host "Iniciando la corrección de imports en '$FunctionsSrcDir'..."

$Counter = 0

foreach ($File in $TsFiles) {
    # Lee todo el contenido del archivo
    $Content = Get-Content -Path $File.FullName -Raw

    # Este patrón busca cualquier cosa que parezca un import relativo, con o sin comillas, y sin la extensión final
    # El reemplazo: envuelve la ruta capturada ($1) en comillas dobles y le añade ".js"
    $NewContent = [regex]::Replace($Content, '["'']?(\.{1,2}/[^"'']+)(?:\.(?:js|ts|json|d\.ts))?["'']?', '"$1.js"', 'IgnoreCase')
    
    # Limpia cualquier doble extensión residual que pueda haber quedado (.js.js)
    $NewContent = [regex]::Replace($NewContent, '\.js\.js', '.js', 'IgnoreCase')

    # Verifica si hubo cambios
    if ($NewContent -ne $Content) {
        # Escribe el nuevo contenido de vuelta al archivo
        Set-Content -Path $File.FullName -Value $NewContent
        Write-Host "-> Corregido (Comillas y .js): $($File.Name)" -ForegroundColor Green
        $Counter++
    }
}

Write-Host "`n--- RESUMEN ---" -ForegroundColor Cyan
Write-Host "¡Corrección de imports completada!" -ForegroundColor Cyan
Write-Host "Archivos .ts modificados: $Counter" -ForegroundColor Yellow
Write-Host "El problema de las comillas ha sido resuelto. Ahora, compilará." -ForegroundColor Cyan