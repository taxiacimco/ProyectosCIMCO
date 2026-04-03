# 🆘 REPARADOR DE EMERGENCIA CIMCO
Write-Host "⚠️ Ejecutando limpieza profunda de Input/Output..." -ForegroundColor Red

# 1. Matar el proceso de la consola que se queda pegado
Get-Process conhost | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Desactivar temporalmente las 'Sticky Keys' de Windows que el TAB suele activar
Set-ItemProperty -Path 'HKCU:\Control Panel\Accessibility\StickyKeys' -Name 'Flags' -Value '506'

# 3. Limpiar los archivos de bloqueo de NPM/Vite
$lockFiles = Get-ChildItem -Path "C:\Users\Carlos Fuentes\ProyectosCIMCO" -Include "node_modules/.vite", ".firebase/hosting.*.cache" -Recurse
if ($lockFiles) { $lockFiles | Remove-Item -Force -Recurse }

Write-Host "✨ PC Normalizada. Prueba presionar TAB ahora." -ForegroundColor Green