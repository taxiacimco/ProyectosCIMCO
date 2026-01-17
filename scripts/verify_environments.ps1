Write-Host "==================================================="
Write-Host " 🚦 TAXIA CIMCO - VERIFICACIÓN DE ENTORNOS (PRODUCCIÓN + QA)"
Write-Host "==================================================="

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Get-Item "$root\..").FullName
$functions = "$projectRoot\functions"
$functionsQA = "$projectRoot\functions-piloto"

Write-Host "`n📂 Directorio principal del proyecto: $projectRoot"
Write-Host "📂 Directorio PRODUCCIÓN (functions): $functions"
Write-Host "📂 Directorio QA/TEST (functions-piloto): $functionsQA"

# --- Verificar Firebase CLI ----------------------------------------------------
Write-Host "`n🔍 Verificando Firebase CLI..."
$firebase = firebase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase CLI NO detectada. Instala con: npm install -g firebase-tools"
    exit
}
Write-Host "✅ Firebase CLI detectada ($firebase)"

# --- Verificar sesión ----------------------------------------------------------
Write-Host "🔐 Verificando sesión activa..."
$auth = firebase projects:list 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ No hay sesión abierta. Ejecuta: firebase login"
    exit
}
Write-Host "✅ Sesión activa detectada."

# --- Verificar archivos de entorno para PRODUCCIÓN ----------------------------
Write-Host "`n📦 Verificando archivos de entorno en /functions (PRODUCCIÓN)..."

$prodFiles = @(
    ".env",
    ".env.production",
    "serviceAccountKey.json"
)

foreach ($f in $prodFiles) {
    $path = Join-Path $functions $f
    if (Test-Path $path) {
        Write-Host "✅ $f encontrado."
    } else {
        Write-Host "❌ $f NO encontrado."
    }
}

# --- Verificar archivos de entorno para QA (si existe) ------------------------
if (Test-Path $functionsQA) {
    Write-Host "`n🧪 Verificando archivos de QA en /functions-piloto..."

    $qaFiles = @(
        ".env.test",
        "serviceAccountKey-test.json"
    )

    foreach ($f in $qaFiles) {
        $path = Join-Path $functionsQA $f
        if (Test-Path $path) {
            Write-Host "✅ $f encontrado."
        } else {
            Write-Host "❌ $f NO encontrado."
        }
    }
} else {
    Write-Host "`n⚠️ Carpeta functions-piloto NO encontrada. (QA desactivado)"
}

# --- Verificar proyectos Firebase ----------------------------------------------
Write-Host "`n📡 Verificando acceso a Firebase projects..."
$projects = firebase projects:list

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Proyectos listados correctamente."
} else {
    Write-Host "❌ Error listando proyectos."
}

# --- Verificar Firestore -------------------------------------------------------
Write-Host "`n🧠 Verificando Firestore..."

$test = firebase firestore:databases:list 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Conexión a Firestore correcta."
} else {
    Write-Host "⚠️ No se pudo conectar a Firestore (quizás falta serviceAccount)"
}

Write-Host "`n==================================================="
Write-Host " ✅ VERIFICACIÓN FINALIZADA"
Write-Host "==================================================="
