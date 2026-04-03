/**
 * PROYECTO: TAXIA CIMCO - Configuración Maestra Firebase (Backend)
 * Misión: Centralización de credenciales para el contexto del proyecto.
 * Arquitectura: Capa de Configuración (Node.js/ESM).
 */

import { ENV } from "./env/index.js";

// ------------------------------------------------------------
// 1. CONFIGURACIÓN DEL CLIENTE WEB (PARA CONTEXTO DE ADMIN SDK)
// ------------------------------------------------------------

/**
 * Configuración pública del cliente Firebase para el Backend.
 * Nota: El Backend utiliza process.env vía el cargador de ENV interno.
 */
export const clientConfig = {
  // Credenciales fundamentales extraídas del entorno seguro
  apiKey: process.env.FIREBASE_WEB_API_KEY || ENV.FIREBASE?.WEB_API_KEY || "",
  projectId: process.env.CIMCO_PROJECT_ID || ENV.PROJECT_ID || "pelagic-chalice-467818-e1",

  // Dominios generados dinámicamente según las reglas de Firebase
  authDomain: `${process.env.CIMCO_PROJECT_ID || ENV.PROJECT_ID}.firebaseapp.com`,
  storageBucket: `${process.env.CIMCO_PROJECT_ID || ENV.PROJECT_ID}.firebasestorage.app`,

  // Identificadores de mensajería y analítica
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || ENV.FIREBASE?.MESSAGING_SENDER_ID || "",
  appId: process.env.FIREBASE_APP_ID || ENV.FIREBASE?.APP_ID || "",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || ENV.FIREBASE?.MEASUREMENT_ID || "",
};

// 🔍 Validación de Arquitectura en Desarrollo
if (process.env.NODE_ENV === 'development' && !clientConfig.apiKey) {
  console.warn("⚠️ [ALERTA ARQUITECTO] Backend: No se detectó WEB_API_KEY en las variables de entorno.");
}

export { ENV };