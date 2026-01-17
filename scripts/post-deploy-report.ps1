<#
.SYNOPSIS
  post-deploy-report.ps1
.DESCRIPTION
  Lee los logs de despliegue generados por los scripts de deploy (logs/deploy_*.txt),
  extrae información clave y genera:
    - Un HTML resumen (scripts/environment_status.html por defecto)
    - Un CSV de historial (logs/deploy_history.csv)
    - Un archivo de texto resumen (logs/deploy_latest_summary.txt)
  Pensado para tu estructura:
    Root: C:\Users\Carlos Fuentes\ProyectosCIMCO
    Logs: C:\Users\Carlos Fuentes\ProyectosCIMCO\logs
    Scripts: C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts
.PARAMETER LogFolder
  Carpeta donde están los logs. Default: ..\logs desde scripts.
.PARAMETER OutHtml
  Ruta del HTML de salida. Default: ..\scripts\environment_status.html
.PARAMETER Force
  Forzar regeneración aunque exista.
.EXAMPLE
  pwsh -ExecutionPolicy Bypass -File .\scripts\post-deploy-report.ps1
#>

param(
    [string]$RootPath = (Resolve-Path ".." -Relative).TrimEnd('\'),
    [string]$LogFolder = (Join-Path (Resolve-Path ".." -Relative) "logs"),
    [string]$OutHtml = (Join-Path (Resolve-Path "." -Relative) "environment_status.html"),
    [switch]$Force
)

# Asegurar rutas absolutas
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not (Test-Path $RootPath)) {
    $RootPath = (Get-Item -Path $ScriptDir).Parent.FullName
}
$LogFolder = (Resolve-Path -Path (Join-Path $RootPath "logs") -ErrorAction SilentlyContinue)  -or (Join-Path $RootPath "logs")
$OutHtml = (Join-Path $ScriptDir "environment_status.html")
$HistoryCsv = Join-Path $LogFolder "deploy_history.csv"
$LatestSummary = Join-Path $LogFolder "deploy_latest_summary.txt"

# Crear carpeta logs si no existe
if (-not (Test-Path $LogFolder)) {
    New-Item -Path $LogFolder -ItemType Directory | Out-Null
}

Write-Host "Root del proyecto: $RootPath"
Write-Host "Carpeta logs: $LogFolder"
Write-Host "Archivo HTML de salida: $OutHtml"
Write-Host "CSV historial: $HistoryCsv"
Write-Host "TXT resumen último deploy: $LatestSummary"
Write-Host ""

# Buscar archivos de log deploy_*.txt (ordenados por fecha desc)
$logFiles = Get-ChildItem -Path $LogFolder -Filter "deploy_*.txt" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending

if (-not $logFiles -or $logFiles.Count -eq 0) {
    Write-Warning "No se encontraron logs deploy_*.txt en $LogFolder. Nada que reportar."
    exit 0
}

# Tomar el log más reciente
$latestLog = $logFiles[0]
Write-Host "Analizando log: $($latestLog.Name) (modificado: $($latestLog.LastWriteTime))" -ForegroundColor Cyan

# Leer contenido
$logText = Get-Content -Path $latestLog.FullName -Raw -ErrorAction SilentlyContinue

# Helper: extraer líneas con tokens clave
function Extract-Section($pattern) {
    $matches = Select-String -InputObject $logText -Pattern $pattern -AllMatches | ForEach-Object { $_.Line.Trim() }
    return ,$matches
}

# 1) Detectar resumen rápido: líneas con "✅" "❌" "ERROR" "Build falló" "Despliegue"
$okLines = Extract-Section "✅"
$errLines = Extract-Section "❌|ERROR|Fallo|Falló|FAIL|Build falló|error during build|Could not resolve"
$deployLines = Extract-Section "DEPLOY|DESPLIEGUE|Deploy|deploy"

# 2) Buscar timings y duración (si existe)
$timeLines = Select-String -InputObject $logText -Pattern "\b(Duration|Tiempo|Finalizado|Finalizad|Tiempo Total|Duración|Finalizado:)\b" -AllMatches | ForEach-Object { $_.Line.Trim() }

# 3) Extraer proyectos targets y URLs (web.app / firebase)
$urls = Select-String -InputObject $logText -Pattern "https?://[^\s,]+" -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object { $_.Value } | Select-Object -Unique

# 4) Generar resumen simplificado
$summaryLines = @()
$summaryLines += "Resumen del log: $($latestLog.Name)"
$summaryLines += "Fecha del log: $($latestLog.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))"
if ($okLines.Count -gt 0) { $summaryLines += "`nLíneas con indicadores OK:"; $summaryLines += $okLines[0..([math]::Min(10,$okLines.Count)-1)] }
if ($errLines.Count -gt 0) { $summaryLines += "`nLíneas con errores / advertencias:"; $summaryLines += $errLines[0..([math]::Min(20,$errLines.Count)-1)] }
if ($deployLines.Count -gt 0) { $summaryLines += "`nLíneas relacionadas con despliegue:"; $summaryLines += $deployLines[0..([math]::Min(20,$deployLines.Count)-1)] }
if ($timeLines.Count -gt 0) { $summaryLines += "`nLíneas con timestamps/timings:"; $summaryLines += $timeLines }

if ($urls.Count -gt 0) {
    $summaryLines += "`nURLs detectadas:"
    $summaryLines += $urls
}

# Guardar resumen TXT
$summaryLines -join "`n" | Out-File -FilePath $LatestSummary -Encoding UTF8

# 5) Actualizar CSV de historial (Date, LogFile, Status, URLs, Notes)
# Determinar estado básico: si hay errores -> FAILED, si hay "DESPLIEGUE PRO EXITOSO" o "✅ DESPLIEGUE" -> SUCCESS
$status = "UNKNOWN"
if ($logText -match "DESPLIEGUE PRO EXITOSO|DEPLOY COMPLETADO|DESPLIEGUE CORPORATIVO COMPLETADO|✅ DESPLIEGUE") { $status = "SUCCESS" }
elseif ($logText -match "ERROR|Error:|Build falló|error during build|Fallo|FALLÓ") { $status = "FAILED" }

$csvRecord = @{
    date = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    logfile = $latestLog.Name
    status = $status
    urls = ($urls -join " | ")
    notes = if ($errLines.Count -gt 0) { ($errLines | Select-Object -First 5) -join " ; " } else { "" }
}

# Si CSV no existe, crearlo con header
if (-not (Test-Path $HistoryCsv)) {
    "date,logfile,status,urls,notes" | Out-File -FilePath $HistoryCsv -Encoding UTF8
}
# Añadir registro
"{0},{1},{2},{3},{4}" -f $csvRecord.date, $csvRecord.logfile, $csvRecord.status, ($csvRecord.urls -replace ",",";"), ($csvRecord.notes -replace ",",";") | Out-File -FilePath $HistoryCsv -Append -Encoding UTF8

# 6) Generar HTML limpio (resumen top)
$htmlHeader = @"
<!doctype html>
<html lang='es'>
<head>
  <meta charset='utf-8'/>
  <meta name='viewport' content='width=device-width,initial-scale=1' />
  <title>TAXIA CIMCO - Reporte de Despliegue</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; background:#f6f8fb; color:#222; padding:20px }
    .card { background:white; padding:16px; border-radius:8px; box-shadow:0 6px 20px rgba(0,0,0,0.06); margin-bottom:12px }
    h1 { margin:0 0 8px 0; font-size:20px }
    pre { background:#0b1020; color:#e6eef8; padding:12px; border-radius:6px; overflow:auto; max-height:320px }
    table { width:100%; border-collapse:collapse; }
    th,td { padding:8px 10px; border-bottom:1px solid #eee; text-align:left }
    .ok { color:green; font-weight:bold }
    .fail { color:#b91c1c; font-weight:bold }
  </style>
</head>
<body>
  <div class='card'>
    <h1>TAXIA CIMCO — Reporte de Despliegue</h1>
    <div>Generado: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</div>
    <div>Log analizado: <strong>$($latestLog.Name)</strong></div>
  </div>
"@

# Determinar estado visual
$statusClass = if ($status -eq "SUCCESS") { "ok" } elseif ($status -eq "FAILED") { "fail" } else { "" }

# Build HTML body
$htmlBody = @"
  <div class='card'>
    <h2>Estado general: <span class='$statusClass'>$status</span></h2>
    <p>URLs detectadas: </p>
    <ul>
"@
foreach ($u in $urls) { $htmlBody += "      <li><a href='$u' target='_blank'>$u</a></li>`n" }

$htmlBody += @"
    </ul>
  </div>

  <div class='card'>
    <h2>Resumen rápido</h2>
    <pre>$(($summaryLines -join "`n"))</pre>
  </div>

  <div class='card'>
    <h2>Historial de despliegues (últimas 10 filas)</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Log</th><th>Estado</th><th>URLs</th></tr></thead>
      <tbody>
"@

# Leer últimas 10 líneas del CSV (ignorando header)
if (Test-Path $HistoryCsv) {
    $csvAll = Import-Csv -Path $HistoryCsv -ErrorAction SilentlyContinue
    $tail = $csvAll | Select-Object -Last 10 | ForEach-Object {
        "<tr><td>$_.'date'</td><td>$_.'logfile'</td><td>$($_.'status')</td><td>$($_.'urls')</td></tr>`n"
    }
    $htmlBody += ($tail -join "")
} else {
    $htmlBody += "<tr><td colspan='4'>No hay historial aún.</td></tr>`n"
}

$htmlBody += @"
      </tbody>
    </table>
  </div>

  <footer style='opacity:.6; font-size:12px; margin-top:18px'>
    TAXIA CIMCO — Reporte generado automáticamente desde $RootPath
  </footer>
</body>
</html>
"@

# Guardar HTML
$htmlHeader + $htmlBody | Out-File -FilePath $OutHtml -Encoding UTF8 -Force

Write-Host ""
Write-Host "✅ Reporte HTML generado en: $OutHtml" -ForegroundColor Green
Write-Host "✅ CSV historial actualizado en: $HistoryCsv" -ForegroundColor Green
Write-Host "✅ Resumen rápido guardado en: $LatestSummary" -ForegroundColor Green

# Mostrar una vista corta en consola
Write-Host "`n--- Resumen corto ---`n"
Get-Content -Path $LatestSummary -TotalCount 40 | ForEach-Object { Write-Host $_ }

Write-Host "`nListo. Puedes abrir el HTML en tu navegador para revisar el reporte completo." -ForegroundColor Cyan
