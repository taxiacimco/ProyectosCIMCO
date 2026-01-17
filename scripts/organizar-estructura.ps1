# =============================================
# Script: organizar-estructura.ps1
# Autor: ChatGPT & Carlos Mario
# Descripción:
#   Organiza la estructura profesional del proyecto CIMCO
#   - Ordena .env
#   - Renombra .env.production → .env
#   - Ubica Service Accounts en la raíz
# =============================================

Write-Host "🔧 Iniciando organización de estructura..." -ForegroundColor Cyan
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# Crear función de respaldo seguro
function Backup-IfExists {
    param($filePath)

    if (Test-Path $filePath) {
        $timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
        $backup = "$filePath.bak-$timestamp"
        Move-Item $filePath $backup -Force
        Write-Host "  ✔ Respaldo creado: $backup" -ForegroundColor Yellow
    }
}

# =========================
# 1️⃣ ORGANIZAR ARCHIVOS .env
# =========================

Write-Host "`n📦 Organizando archivos .env ..." -ForegroundColor Cyan

# Renombrar .env.production a .env
if (Test-Path ".env.production") {
    if (Test-Path ".env") {
        Write-Host "⚠ .env ya existe, creando respaldo antes de reemplazar..."
        Backup-IfExists ".env"
    }
    Move-Item ".env.production" ".env"
    Write-Host "  ✔ Renombrado: .env.production → .env"
}

# Mover envs desde frontend o functions si existen
$envPaths = @(
    ".env",
    ".env.development",
    ".env.test",
    "frontend/.env",
    "frontend/.env.local",
    "frontend/.env.piloto",
    "frontend/.env.test",
    "functions/.env",
    "functions/.env.local",
    "functions/.env.test"
)

foreach ($path in $envPaths) {
    if (Test-Path $path) {
        $target = Split-Path $path -Leaf
        if ($path -ne $target) {
            Backup-IfExists $target
            Move-Item $path $target -Force
            Write-Host "  ✔ Movido a la raíz: $path"
        }
    }
}

# =========================
# 2️⃣ ORGANIZAR SERVICE ACCOUNTS
# =========================

Write-Host "`n🔐 Organizando Service Accounts..." -ForegroundColor Cyan

$serviceFiles = @(
    "serviceAccountKey.json",
    "serviceAccountKey-test.json",
    "functions/serviceAccount.json",
    "functions/serviceAccountKey.json",
    "functions-piloto/serviceAccountKey.json",
    "functions-piloto/serviceAccountKey-test.json",
    "frontend/serviceAccountKey.json"
)

foreach ($file in $serviceFiles) {
    if (Test-Path $file) {
        $leaf = Split-Path $file -Leaf
        
        # Si ya existe un archivo con ese nombre en la raíz → respáldalo
        if (Test-Path $leaf -and $file -ne $leaf) {
            Backup-IfExists $leaf
        }

        if ($file -ne $leaf) {
            Move-Item $file $leaf -Force
            Write-Host "  ✔ Movido a raíz: $file → $leaf"
        }
    }
}

Write-Host "`n🎉 Organización de estructura completada exitosamente" -ForegroundColor Green
Write-Host "Puedes validar tu proyecto con:  ls -name" -ForegroundColor Cyan
