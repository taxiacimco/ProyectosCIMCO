// Versión Arquitectura: V4.5 - Sincronización Estricta de Puertos e Inyección de Guardas del Emulador 8085
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\config\firebase.js
 * Misión: Configuración y acoplamiento táctico del Firebase Admin SDK con soporte para emuladores locales.
 */

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

// 🛡️ CONTROLADORES DE ENTORNO (ANTI-UNDEFINED)
const esEntornoDesarrollo = process.env.NODE_ENV === 'development' || process.env.FIRESTORE_EMULATOR_HOST;

if (esEntornoDesarrollo) {
    // 🚀 Alineación de variables en memoria para interceptar llamadas salientes de Firebase Admin SDK
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

    app = initializeApp({
        projectId: process.env.CIMCO_PROJECT_ID || "pelagic-chalice-467818-e1"
    });

    console.log("🔥 [CIMCO-CONFIG] Firebase Admin SDK conectado al Emulador Local en Puerto 8085.");
} else {
    // 🔒 PRODUCCIÓN REAL: Consumo de credenciales criptográficas del Service Account
    const serviceAccountPath = join(__dirname, '..', '..', 'serviceAccountKey.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    app = initializeApp({
        credential: cert(serviceAccount)
    });
}

// 📡 Instanciación e Inyección de la base de datos
export const db = getFirestore(app);
export const dbFirestore = db;

// ⚡ Configuración de red del cliente Firestore local para anular SSL hacia el emulador
if (esEntornoDesarrollo) {
    db.settings({
        host: "127.0.0.1:8085",
        ssl: false
    });
}