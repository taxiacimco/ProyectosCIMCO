// Versión Arquitectura: V1.1 - Configuración Centralizada de Servicios Nucleares
/**
 * functions/src/firebase/firebase-admin.js
 * CONFIGURACIÓN CENTRALIZADA DE FIREBASE ADMIN (BACKEND)
 * Arquitectura TAXIA CIMCO - Backend (Node.js 20 / ESM)
 */

import admin from "firebase-admin";

// 1. Inicializar la aplicación (Evitando duplicados de instancia)
if (!admin.apps.length) {
    // En Cloud Functions, esto usa automáticamente las credenciales del entorno
    admin.initializeApp();
}

// 2. Exportar Instancias de Servicios Nucleares para el Backend
// Se exportan con nombres claros para facilitar su uso en la capa de servicios
export const db = admin.firestore();
export const auth = admin.auth();
export const messaging = admin.messaging(); // Integrado para Push Notifications (FCM)
export const storage = admin.storage();

// ============================================================================
// 🚀 DETECCIÓN DE ENTORNO: EMULADORES LOCALES
// ============================================================================
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

if (isEmulator) {
    console.log("🛠️ [CIMCO ADMIN] Modo Emulador detectado. Conexión local activa.");
}

export default admin;