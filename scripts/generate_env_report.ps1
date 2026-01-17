<#
============================================================
 🧩 TAXIA CIMCO - GENERADOR DE REPORTE HTML DE ENTORNOS
============================================================
#>

$basePath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$envProd = Join-Path $basePath ".env"
$envTest = Join-Path $basePath ".env.test"
$saProd = Join-Path $basePath "serviceAccount.json"
$saTest = Join-Path $basePath "serviceAccount-test.json"
$outputFile = Join-Path $basePath "environment_status.html"

function Get-StatusRow($name, $status, $color) {
    return "<tr><td><b>$name</b></td><td style='color:$color'>$status</td></tr>"
}

function File-Exists($path) {
    return (Test-Path $path)
}

$rows = @()

if (File-Exists $envProd) {
    $rows += Get-StatusRow ".env (PRO)" "OK ✅" "green"
} else {
    $rows += Get-StatusRow ".env (PRO)" "FALTANTE ❌" "red"
}

if (File-Exists $envTest) {
    $rows += Get-StatusRow ".env.test (QA)" "OK ✅" "green"
} else {
    $rows += Get-StatusRow ".env.test (QA)" "FALTANTE ❌" "red"
}

if (File-Exists $saProd) {
    $rows += Get-StatusRow "serviceAccount.json (PRO)" "OK ✅" "green"
} else {
    $rows += Get-StatusRow "serviceAccount.json (PRO)" "FALTANTE ❌" "red"
}

if (File-Exists $saTest) {
    $rows += Get-StatusRow "serviceAccount-test.json (QA)" "OK ✅" "green"
} else {
    $rows += Get-StatusRow "serviceAccount-test.json (QA)" "FALTANTE ❌" "red"
}

try {
    $firebaseVersion = firebase --version
    $rows += Get-StatusRow "Firebase CLI" "v$firebaseVersion ✅" "green"
} catch {
    $rows += Get-StatusRow "Firebase CLI" "No detectada ❌" "red"
}

$html = @"
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>TAXIA CIMCO - Estado de Entornos</title>
<style>
body { font-family: Arial; background:#f4f7fa; color:#222; margin:40px; }
h1 { color:#0078D7; }
table { border-collapse:collapse; width:80%; margin-top:20px; }
th, td { padding:10px; border-bottom:1px solid #ddd; text-align:left; }
tr:hover { background:#f1f1f1; }
.status-ok { color:green; }
.status-error { color:red; }
.footer { margin-top:30px; font-size:12px; color:#666; }
</style>
</head>
<body>
<h1>🚀 TAXIA CIMCO - Verificación de Entornos</h1>
<p>Reporte generado automáticamente el $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")</p>

<table>
<tr><th>Componente</th><th>Estado</th></tr>
$($rows -join "`n")
</table>

<div class="footer">
<hr>
<p>Centro de Innovación y Movilidad - CIMCO<br>
Infraestructura: Firebase Functions + Firestore<br>
Autor: Carlos Mario Fuentes García</p>
</div>
</body>
</html>
"@

$html | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "✅ Reporte HTML generado correctamente:" -ForegroundColor Green
Write-Host "   $outputFile" -ForegroundColor Cyan
Start-Process $outputFile
