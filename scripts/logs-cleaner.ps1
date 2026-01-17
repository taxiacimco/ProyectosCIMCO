# logs-cleaner.ps1
param(
    [int]$Keep = 10
)
$Root = "' + ($RootPath -replace '\\','\\\\') + '"
$Logs = Join-Path $Root 'logs'
if (-not (Test-Path $Logs)) { Write-Host "Logs no encontrado: $Logs" -ForegroundColor Yellow; exit 0 }
$files = Get-ChildItem -Path $Logs -File | Sort-Object LastWriteTime -Descending
$toDelete = $files | Select-Object -Skip $Keep
foreach ($f in $toDelete) { Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue; Write-Host "Borrado: $($f.Name)" }
Write-Host "Logs limpiados. Conservados: $Keep" -ForegroundColor Green
