# =================================================================
# SCRIPT DE ORGANIZACIÓN Y CONFIGURACIÓN DE FIREBASE (PowerShell)
# Autor: CIMCO-AI
# Fecha: 2025-11-27
# Este script:
# 1. Crea una carpeta de backup de la configuración antigua.
# 2. Reemplaza firebase-config.js con la versión unificada PROD/PILOTO.
# 3. Reemplaza firebase-loader.js con la versión que maneja los emuladores en modo PILOTO.
#
# Uso: Ejecutar desde la raíz 'frontend\public'
# =================================================================

# --- CONFIGURACIÓN DE RUTAS ---
$FirebaseDir = "js\firebase"
$ConfigPath = "$FirebaseDir\firebase-config.js"
$LoaderPath = "$FirebaseDir\firebase-loader.js"
$BackupDir = "backup_config_$(Get-Date -Format yyyyMMdd_HHmmss)"

Write-Host "Iniciando la organización de archivos de configuración de Firebase..." -ForegroundColor Cyan

# --- 1. CREAR COPIA DE SEGURIDAD ---
Write-Host "Creando copia de seguridad de la configuración antigua en $BackupDir..." -ForegroundColor Yellow
New-Item -Path $BackupDir -ItemType Directory -ErrorAction SilentlyContinue
Copy-Item -Path $ConfigPath -Destination $BackupDir
Copy-Item -Path $LoaderPath -Destination $BackupDir
Write-Host "Backup completado." -ForegroundColor Green

# --- 2. FIREBASE-CONFIG.JS (VERSIÓN UNIFICADA PROD/PILOTO) ---
Write-Host "Reemplazando $ConfigPath con la versión unificada..." -ForegroundColor Yellow
@'
// =================================================================
// ARCHIVO DE CONFIGURACIÓN UNIFICADA DE FIREBASE
// Contiene la configuración para entornos de Producción (PROD) y Piloto/Local (PILOTO).
// =================================================================

// -----------------------------------------------------------------
// CONFIGURACIÓN DE PRODUCCIÓN (PROD) - APP PASAJERO
// Proyecto: pelagic-chalice-467818-e1
// -----------------------------------------------------------------
const FIREBASE_CONFIG_PROD = {
    apiKey: "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
    authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
    projectId: "pelagic-chalice-467818-e1",
    storageBucket: "pelagic-chalice-467818-e1.firebasestorage.app",
    messagingSenderId: "191106268804",
    appId: "1:191106268804:web:8b2aa9689abaa35c880cd1",
    measurementId: "G-CPWSCLGKP2"
};

// -----------------------------------------------------------------
// CONFIGURACIÓN DE PILOTO / DESARROLLO (DEV / EMULADOR)
// Usamos credenciales PROD pero el loader apuntará a los emuladores.
// -----------------------------------------------------------------
const FIREBASE_CONFIG_PILOTO = {
    apiKey: "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
    authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
    projectId: "pelagic-chalice-467818-e1",
    storageBucket: "pelagic-chalice-467818-e1.firebasestorage.app",
    messagingSenderId: "191106268804",
    appId: "1:191106268804:web:8b2aa9689abaa35c880cd1",
    measurementId: "G-CPWSCLGKP2"
};


// -----------------------------------------------------------------
// DETERMINAR MODO DE ENTORNO
// La variable global 'ENTORNO_ACTIVO' debe ser definida en el HTML
// antes de cargar este script (e.g., 'PROD' o 'PILOTO').
// -----------------------------------------------------------------
let firebaseConfig;

if (typeof ENTORNO_ACTIVO === 'undefined' || ENTORNO_ACTIVO === 'PROD') {
    firebaseConfig = FIREBASE_CONFIG_PROD;
    console.log("Firebase: Usando configuración de PRODUCCIÓN.");
} else if (ENTORNO_ACTIVO === 'PILOTO') {
    firebaseConfig = FIREBASE_CONFIG_PILOTO;
    console.log("Firebase: Usando configuración de PILOTO (Emulador).");
} else {
    firebaseConfig = FIREBASE_CONFIG_PROD;
    console.warn("Firebase: ENTORNO_ACTIVO no definido o desconocido. Usando PROD por defecto.");
}

export { firebaseConfig };
'@ | Set-Content -Path $ConfigPath -Encoding UTF8
Write-Host "Firebase Config actualizado." -ForegroundColor Green


# --- 3. FIREBASE-LOADER.JS (MANEJO DE EMULADORES) ---
Write-Host "Reemplazando $LoaderPath para incluir el manejo de emuladores..." -ForegroundColor Yellow
@'
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js'; // Importa la configuración unificada

// Inicializar la aplicación con la configuración seleccionada (PROD o PILOTO)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let isEmulatorMode = false;

// -----------------------------------------------------------------
// CONFIGURACIÓN DE EMULADORES (SOLO EN MODO PILOTO)
// -----------------------------------------------------------------
if (typeof ENTORNO_ACTIVO !== 'undefined' && ENTORNO_ACTIVO === 'PILOTO') {
    console.warn("*************************************************");
    console.warn("!!! MODO PILOTO (EMULADORES) ACTIVO !!!");
    console.warn("Conectando Firebase a: http://127.0.0.1:9099 (Auth) y http://127.0.0.1:8080 (Firestore)");
    console.warn("*************************************************");
    
    // Conectar a los emuladores
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    isEmulatorMode = true;
}

// -----------------------------------------------------------------
// EXPORTAR INSTANCIAS GLOBALES
// -----------------------------------------------------------------
window.app = app;
window.auth = auth;
window.db = db;
window.isEmulatorMode = isEmulatorMode;
window.ENTORNO_ACTIVO = ENTORNO_ACTIVO || 'PROD'; // Asegurar que sea global

console.log(`Firebase Loader finalizado. Entorno: ${window.ENTORNO_ACTIVO}`);

// Este archivo NO DEBE EXPORTAR NADA, solo poblar el objeto window.
// Para usarlo, simplemente se incluye con una etiqueta <script src="..."> en el HTML.
'@ | Set-Content -Path $LoaderPath -Encoding UTF8
Write-Host "Firebase Loader para emuladores actualizado." -ForegroundColor Green

Write-Host "Organización de Firebase completada. Asegúrate de que tus HTML definan la variable 'ENTORNO_ACTIVO'." -ForegroundColor Cyan
# --- FIN DEL SCRIPT ---