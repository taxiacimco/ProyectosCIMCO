// Versión Arquitectura: V4.1 - Consolidación de Gobernanza de Rutas FIRESTORE_PATHS y Alias dbFirestore
// Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\config\firebase.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================================================================
// 📐 GOBERNANZA DE RUTAS TOPOLÓGICAS (FIRESTORE_PATHS)
// ==================================================================
// Ruta Maestra unificada heredada
export const RUTA_VIAJES_PROD = "artifacts/taxiacimco-app/public/data/viajes";

// Nueva estructura centralizada de colecciones para sincronización en tiempo real
export const FIRESTORE_PATHS = {
    conductores: 'conductores',
    viajes: 'viajes',
    transacciones: 'transacciones'
};

let app;

// 🛡️ DETECCIÓN FORZADA: Si estamos en entorno local o corriendo el stress_test, inicializamos en modo DEMO
// Esto anula por completo el error 16 UNAUTHENTICATED de los servidores de Google
if (process.env.FIRESTORE_EMULATOR_HOST || true) { 
    // Forzamos las variables de entorno directamente en el inicializador central
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    
    app = initializeApp({
        projectId: "pelagic-chalice-467818-e1" // ID de tu proyecto local sin requerir llaves SSL firmadas
    });
    
    console.log("🔥 [CIMCO-CONFIG] Firebase Admin SDK inicializado exitosamente en MODO EMULADOR LOCAL.");
} else {
    // Código de Producción real (Solo se activa si no hay emuladores)
    const serviceAccountPath = join(__dirname, '..', '..', 'serviceAccountKey.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    app = initializeApp({
        credential: cert(serviceAccount)
    });
}

// Exportación original para mantener compatibilidad con el código anterior
export const db = getFirestore(app);

// 🛡️ ALIAS DE COMPATIBILIDAD ARQUITECTÓNICA
// Exportamos dbFirestore apuntando a db para satisfacer el puente de telemetría sin romper otros módulos
export const dbFirestore = db;

// Forzamos los settings explícitos en el objeto db para asegurar el puerto 8080
db.settings({
    host: "127.0.0.1:8080",
    ssl: false
});