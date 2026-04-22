// Versión Arquitectura: V1.2 - Estabilización de Instancias Nucleares
/**
 * functions/src/firebase/firebase-admin.js
 * CONFIGURACIÓN CENTRALIZADA DE FIREBASE ADMIN
 * Misión: Proveer instancias de servicios sin ejecuciones bloqueantes.
 */

import admin from "firebase-admin";

// 1. Inicialización Atómica
if (!admin.apps.length) {
    admin.initializeApp();
}

// 2. Exportación de Servicios (Ruta Sagrada Protegida)
export const db = admin.firestore();
export const auth = admin.auth();
export const messaging = admin.messaging();
export const storage = admin.storage();

/**
 * 🛠️ DETECCIÓN DE ENTORNO
 * Se utiliza el flag del sistema para configurar comportamientos locales.
 */
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

if (isEmulator && process.env.NODE_ENV !== 'test') {
    // Log minimalista para no saturar el Discovery
    console.log("🛠️ [CIMCO ADMIN] Conexión local activa.");
}

export default admin;