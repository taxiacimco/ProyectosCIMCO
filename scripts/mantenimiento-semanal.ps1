# =====================================================================
# 🧠 MANTENIMIENTO SEMANAL AUTOMÁTICO - TAXI A CIMCO
# Ejecuta verificación Firestore + limpieza de logs + envío de resumen
# Programado para ejecutarse cada lunes a las 9:00 a.m.
# =====================================================================

# === Configuración de rutas ===
$basePath = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$scriptsPath = Join-Path $basePath "scripts"
$logsPath = Join-Path $basePath "logs"
$logFile = Join-Path $logsPath "mantenimiento-semanal.log"
$firestoreCheck = Join-Path $scriptsPath "test-firestore-check.mjs"
$cleanScript = Join-Path $scriptsPath "limpiar-logs.ps1"
$statusFile = Join-Path $logsPath "status.json"

# Crear carpeta de logs si no existe
if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath | Out-Null
}

# === 1️⃣ Ejecutar verificación de Firestore ===
Write-Host "[INFO] Ejecutando verificación Firestore..."
$firestoreOutput = node $firestoreCheck 2>&1
Add-Content -Path $logFile -Value "`n[$(Get-Date -Format u)] Verificación Firestore:"
Add-Content -Path $logFile -Value $firestoreOutput

if ($firestoreOutput -match "Verificación Firestore completada sin errores") {
    $status = @{
        status = "OK"
        lastCheck = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        message = "Verificación correcta de Firestore"
    }
    Write-Host "[OK] Firestore operativo."
} else {
    $status = @{
        status = "ERROR"
        lastCheck = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        message = "Error durante la verificación de Firestore"
    }
    Write-Host "[ERROR] Se detectó un problema en Firestore."
}

$status | ConvertTo-Json | Out-File -Encoding UTF8 $statusFile

# === 2️⃣ Limpieza automática de logs antiguos ===
Write-Host "[INFO] Ejecutando limpieza de logs antiguos..."
$cleanOutput = Start-Process -FilePath "C:\Program Files\PowerShell\7\pwsh.exe" `
    -ArgumentList "-ExecutionPolicy Bypass -File `"$cleanScript`"" `
    -NoNewWindow -Wait -PassThru

Add-Content -Path $logFile -Value "`n[$(Get-Date -Format u)] Limpieza de logs completada."

# === 3️⃣ Generar resumen ===
$summary = @"
📅 Reporte de Mantenimiento Semanal - TAXI A CIMCO
Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Estado Firestore: $($status.status)
Mensaje: $($status.message)

Último registro guardado en:
$logFile

-------------------------------------------------
Sistema verificado y optimizado automáticamente.
-------------------------------------------------
"@

Add-Content -Path $logFile -Value "`n$summary"

# === 4️⃣ Enviar correo electrónico ===
try {
    Write-Host "[INFO] Enviando reporte al correo taxiacimco@gmail.com..."
    $smtpServer = "smtp.gmail.com"
    $smtpPort = 587
    $from = "taxiacimco@gmail.com"
    $to = "taxiacimco@gmail.com"
    $subject = "Reporte Semanal - Taxi A CIMCO"
    $body = $summary
    $password = "faburyyfrzrlzlvj"

    Send-MailMessage `
      -From $from `
      -To $to `
      -Subject $subject `
      -Body $body `
      -SmtpServer $smtpServer `
      -Port $smtpPort `
      -UseSsl `
      -Credential (New-Object PSCredential($from, (ConvertTo-SecureString $password -AsPlainText -Force)))

    Write-Host "[OK] Reporte enviado correctamente a $to"
    Add-Content -Path $logFile -Value "[EMAIL] Reporte enviado correctamente a $to"
}
catch {
    Write-Host "[ERROR] No se pudo enviar el correo: $($_.Exception.Message)"
    Add-Content -Path $logFile -Value "[EMAIL ERROR] $($_.Exception.Message)"
}

Write-Host "`n[OK] Mantenimiento semanal completado."
Write-Host "[LOG] Archivo completo en: $logFile"

# === 5️⃣ Generar reporte visual ===
$htmlFile = Join-Path $logsPath "mantenimiento-semanal.html"
$htmlContent = @"
<!DOCTYPE html>
<html lang='es'>
<head>
<meta charset='UTF-8'>
<title>Reporte de Mantenimiento - Taxi A CIMCO</title>
<style>
  body { font-family: Arial, sans-serif; background: #f6f7fb; color: #333; margin: 40px; }
  h1 { color: #1565c0; text-align: center; }
  .ok { color: #2e7d32; font-weight: bold; }
  .error { color: #c62828; font-weight: bold; }
  .card {
    background: white; padding: 20px; border-radius: 10px; 
    box-shadow: 0 3px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 20px auto;
  }
</style>
</head>
<body>
  <h1>🚖 Reporte de Mantenimiento - TAXI A CIMCO</h1>
  <div class='card'>
    <p><strong>📅 Fecha:</strong> $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")</p>
    <p><strong>🧠 Estado Firestore:</strong> <span class='$(if ($status.status -eq 'OK') {'ok'} else {'error'})'>$($status.status)</span></p>
    <p><strong>📝 Mensaje:</strong> $($status.message)</p>
    <p><strong>📄 Log detallado:</strong> <a href='file:///$logFile'>Abrir archivo de texto</a></p>
  </div>
</body>
</html>
"@
$htmlContent | Out-File -Encoding UTF8 $htmlFile
Write-Host "[OK] Reporte visual generado en: $htmlFile"
