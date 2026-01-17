Write-Host "=== Verificando configuración del entorno ===" -ForegroundColor Cyan

# --- JAVA ---
try {
    $javaVersion = java -version 2>&1
    Write-Host "`n[Java] Encontrado" -ForegroundColor Green
    Write-Host $javaVersion
} catch {
    Write-Host "`n[Java] NO está configurado" -ForegroundColor Red
}

if ($env:JAVA_HOME) {
    Write-Host "[JAVA_HOME] Configurado en: $env:JAVA_HOME" -ForegroundColor Green
} else {
    Write-Host "[JAVA_HOME] No configurado" -ForegroundColor Red
}

# Verificar si PATH contiene el bin de JAVA_HOME
if ($env:JAVA_HOME -and $env:Path -match [Regex]::Escape("$env:JAVA_HOME\bin")) {
    Write-Host "[PATH] Incluye JAVA_HOME\bin" -ForegroundColor Green
} else {
    Write-Host "[PATH] NO incluye JAVA_HOME\bin" -ForegroundColor Red
}

# --- NODE ---
try {
    $nodeVersion = node -v
    Write-Host "`n[Node.js] Encontrado $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "`n[Node.js] NO está configurado" -ForegroundColor Red
}

# --- NPM ---
try {
    $npmVersion = npm -v
    Write-Host "[NPM] Encontrado $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[NPM] NO está configurado" -ForegroundColor Red
}

# --- FIREBASE ---
try {
    $firebaseVersion = firebase --version
    Write-Host "`n[Firebase CLI] Encontrado $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "`n[Firebase CLI] NO está configurado" -ForegroundColor Red
}

Write-Host "`n=== Comprobación finalizada ===" -ForegroundColor Cyan
