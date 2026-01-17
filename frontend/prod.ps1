<#
 prod.ps1
 Script de despliegue preparatorio para PRODUCCIÓN.
 - Crea backups de public/ y dist/ (si existen)
 - Crea/actualiza public/js/firebase/firebase-config.js (producción)
 - Crea/actualiza public/js/firebase/firebase-loader.js (producción)
 - Copia esos archivos también a public/admin/js/firebase (si existe)
 - Opcional: npm run build (si -SkipBuild no está presente)
 - Opcional: firebase deploy --only hosting (si -SkipDeploy no está presente)
 
 NOTA IMPORTANTE: Se ha corregido el firebase-loader.js generado para asegurar
 compatibilidad con los scripts HTML que esperan que las instancias de Firebase
 (app, auth, db) se establezcan como variables globales en 'window'.
 
 Parametros:
   -SkipBuild  : omite "npm run build"
   -SkipDeploy : omite "firebase deploy --only hosting"
#>

param(
  [switch]$SkipBuild,
  [switch]$SkipDeploy
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Rutas base
$cwd = (Get-Location).Path
$publicDir = Join-Path $cwd "public"
$distDir   = Join-Path $cwd "dist"
$ts = (Get-Date).ToString("yyyyMMdd_HHmmss")

# Backup folders
$backupRoot = Join-Path $publicDir "backup_prod_$ts"
New-Item -Path $backupRoot -ItemType Directory -Force | Out-Null

Write-Host "== prod.ps1: Iniciando (ruta de trabajo: $cwd) ==" -ForegroundColor Cyan
Write-Host "Creando backup en: $backupRoot" -ForegroundColor Green

# Función para copiar con backup
function Backup-And-Copy {
    param(
        [string]$sourceFile,
        [string]$destFile
    )
    if (-not (Test-Path $sourceFile)) {
        Write-Host "Aviso: archivo fuente no existe: $sourceFile" -ForegroundColor Yellow
        return
    }

    $relDest = $destFile.Substring($cwd.Length).TrimStart('\')
    $backupPath = Join-Path $backupRoot ($relDest -replace '[\\/]','_')
    $backupDir = Split-Path $backupPath -Parent
    if (-not (Test-Path $backupDir)) { New-Item -Path $backupDir -ItemType Directory -Force | Out-Null }
    
    # Solo respaldar si el destino existe
    if (Test-Path $destFile) {
        Copy-Item -Path $destFile -Destination $backupPath -Force
        Write-Host "Backed up: $destFile -> $backupPath"
    } else {
        Write-Host "Creating new file, no backup needed: $destFile" -ForegroundColor Yellow
    }

    $destDir = Split-Path $destFile -Parent
    if (-not (Test-Path $destDir)) { New-Item -Path $destDir -ItemType Directory -Force | Out-Null }
    Copy-Item -Path $sourceFile -Destination $destFile -Force
    Write-Host "Copied: $sourceFile -> $destFile"
}

# === Contenido firebase-config.js (PRODUCCIÓN) ===
# Se mantiene igual, esto es solo la configuración
$firebaseConfigContent = @'
export const firebaseConfig = {
  apiKey: "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
  authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
  projectId: "pelagic-chalice-467818-e1",
  storageBucket: "pelagic-chalice-467818-e1.firebasestorage.app",
  messagingSenderId: "191106268804",
  appId: "1:191106268804:web:8b2aa9689abaa35c880cd1",
  measurementId: "G-CPWSCLGKP2"
};
'@

# === Contenido firebase-loader.js (PRODUCCIÓN CORREGIDO) ===
# Versión de Producción que establece variables globales (window.app, window.auth, etc.)
# para asegurar compatibilidad con todos los archivos HTML existentes (A, B, C).
$firebaseLoaderContent = @'
// firebase-loader.js - PRODUCCIÓN REAL (Generado por prod.ps1)

// Cargar módulos Firebase desde CDN oficial (Usando 11.6.1 para consistencia)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Importar configuración de producción
import { firebaseConfig } from './firebase-config.js'; 

// Inicializar la app de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// -----------------------------------------------------------------
// EXPORTAR INSTANCIAS GLOBALES (CRÍTICO para compatibilidad HTML)
// Se exponen en 'window' para que los scripts cargados posteriormente
// (p.ej., el pasajero-login.js) puedan acceder a ellas directamente.
// -----------------------------------------------------------------
window.app = app;
window.auth = auth;
window.db = db;
window.storage = storage; 
window.isEmulatorMode = false;
window.ENTORNO_ACTIVO = 'PROD';

console.log(`[Firebase Loader] Producción cargada correctamente. Entorno: ${window.ENTORNO_ACTIVO}`);
'@

# Rutas destino
$destFirebasePublic = Join-Path $publicDir "js\firebase"
$destFirebaseAdmin  = Join-Path $publicDir "admin\js\firebase"

# Asegurar carpetas
if (-not (Test-Path $destFirebasePublic)) { New-Item -Path $destFirebasePublic -ItemType Directory -Force | Out-Null }
if (-not (Test-Path $destFirebaseAdmin))  { New-Item -Path $destFirebaseAdmin -ItemType Directory -Force | Out-Null }

# Archivos temporales para escribir contenido y luego copiar (evita problemas de permisos)
$tmpConfig = Join-Path $env:TEMP "firebase-config.$ts.js"
$tmpLoader = Join-Path $env:TEMP "firebase-loader.$ts.js"

$firebaseConfigContent | Out-File -FilePath $tmpConfig -Encoding utf8 -Force
$firebaseLoaderContent | Out-File -FilePath $tmpLoader -Encoding utf8 -Force

# Copiar al sitio público
$destConfigPublic = Join-Path $destFirebasePublic "firebase-config.js"
$destLoaderPublic = Join-Path $destFirebasePublic "firebase-loader.js"
Backup-And-Copy -sourceFile $tmpConfig -destFile $destConfigPublic
Backup-And-Copy -sourceFile $tmpLoader -destFile $destLoaderPublic

# Copiar también al admin (si existe)
$destConfigAdmin = Join-Path $destFirebaseAdmin "firebase-config.js"
$destLoaderAdmin = Join-Path $destFirebaseAdmin "firebase-loader.js"
Backup-And-Copy -sourceFile $tmpConfig -destFile $destConfigAdmin
Backup-And-Copy -sourceFile $tmpLoader -destFile $destLoaderAdmin

# Limpieza temporal
Remove-Item $tmpConfig -ErrorAction SilentlyContinue
Remove-Item $tmpLoader -ErrorAction SilentlyContinue

Write-Host "✔ firebase config + loader instalados en:"
Write-Host "   - $destConfigPublic"
Write-Host "   - $destLoaderPublic"
Write-Host "   - $destConfigAdmin"
Write-Host "   - $destLoaderAdmin"

# (Opcional) Ejecutar npm run build si existe package.json y no se pidió SkipBuild
if (-not $SkipBuild) {
    if (Test-Path (Join-Path $cwd "package.json")) {
        Write-Host "Ejecutando 'npm run build'..." -ForegroundColor Cyan
        npm run build
        Write-Host "Build completado."
    } else {
        Write-Host "package.json no encontrado en $cwd, se salta build." -ForegroundColor Yellow
    }
} else {
    Write-Host "SkipBuild activo, se omite 'npm run build'." -ForegroundColor Yellow
}

# (Opcional) firebase deploy --only hosting
if (-not $SkipDeploy) {
    # Verificar que firebase-tools esté disponible
    $fv = & firebase --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: No se encontró 'firebase' CLI en PATH. Instala firebase-tools antes de deploy." -ForegroundColor Red
    } else {
        Write-Host "Iniciando firebase deploy --only hosting ..." -ForegroundColor Cyan
        firebase deploy --only hosting
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✔ Deploy completado." -ForegroundColor Green
        } else {
            Write-Host "❌ Deploy falló. Revisa la salida anterior." -ForegroundColor Red
        }
    }
} else {
    Write-Host "SkipDeploy activo, se omite 'firebase deploy'." -ForegroundColor Yellow
}

Write-Host "== prod.ps1: finalizado. Backups en: $backupRoot ==" -ForegroundColor Green