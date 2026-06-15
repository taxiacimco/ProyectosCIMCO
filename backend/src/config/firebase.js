// Versión Arquitectura: V4.2 - Consolidación de Gobernanza de Rutas y Sincronización Estricta
// Ubicación: backend/src/config/firebase.js
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
export const RUTA_VIAJES_PROD = "artifacts/taxiacimco-app/public/data/viajes";

export const FIRESTORE_PATHS = {
    conductores: 'conductores',
    viajes: 'viajes',
    transacciones: 'transacciones'
};

let app;

// 🛡️ DETECCIÓN FORZADA: Inicialización en modo Emulador Local
if (process.env.FIRESTORE_EMULATOR_HOST || true) { 
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    
    app = initializeApp({
        projectId: "pelagic-chalice-467818-e1"
    });
    
    console.log("🔥 [CIMCO-CONFIG] Firebase Admin SDK inicializado exitosamente en MODO EMULADOR LOCAL.");
} else {
    // Código de Producción real
    const serviceAccountPath = join(__dirname, '..', '..', 'serviceAccountKey.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    app = initializeApp({
        credential: cert(serviceAccount)
    });
}

// 🛡️ ALIAS DE COMPATIBILIDAD ARQUITECTÓNICA
export const db = getFirestore(app);
export const dbFirestore = db;

// Configuración de puertos para el emulador
db.settings({
    host: "127.0.0.1:8080",
    ssl: false
});