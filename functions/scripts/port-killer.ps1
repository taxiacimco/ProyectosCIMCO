Write-Host "🔎 Buscando procesos ocupando puertos..."

$ports = @(3000, 8080, 5173, 4200, 5000, 5500, 9000)

foreach ($port in $ports) {
    $process = netstat -ano | Select-String ":$port "
    if ($process) {
        Write-Host "⚠️ Puerto $port está en uso. Matando proceso..."
        $pid = ($process -split "\s+")[-1]
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Proceso $pid eliminado."
        } catch {
            Write-Host "⚠️ No se pudo eliminar el proceso $pid."
        }
    } else {
        Write-Host "✔️ Puerto $port libre."
    }
}

Write-Host "🎯 Puertos limpiados."
