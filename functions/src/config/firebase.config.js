/**
 * src/config/firebase.config.js
 * Configuración central de Firebase (NO inicializa Admin SDK)
 * Este archivo centraliza las credenciales del Cliente Web.
 */

import { ENV } from "./env/index.js";

// ------------------------------------------------------------
// 1. CONFIGURACIÓN DEL CLIENTE WEB (FRONTEND / CLIENT SDK)
// ------------------------------------------------------------

/**
 * Configuración pública del cliente Firebase.
 * Se utiliza para inicializar Firebase en el lado del cliente o 
 * para utilidades que requieran el contexto del proyecto.
 */
export const clientConfig = {
  // Credenciales fundamentales
  apiKey: ENV.FIREBASE?.WEB_API_KEY || "",
  projectId: ENV.PROJECT_ID,

  // Dominios generados dinámicamente según el ID del proyecto
  authDomain: `${ENV.PROJECT_ID}.firebaseapp.com`,
  storageBucket: `${ENV.PROJECT_ID}.appspot.com`,

  // Identificadores opcionales para servicios específicos
  messagingSenderId: ENV.FIREBASE?.MESSAGING_SENDER_ID || "",
  appId: ENV.FIREBASE?.APP_ID || "",
  measurementId: ENV.FIREBASE?.MEASUREMENT_ID || "",
};

// 🔍 Validación rápida en desarrollo
if (ENV.NODE_ENV === 'development' && !clientConfig.apiKey) {
  console.warn("⚠️ Firebase Client: Falta WEB_API_KEY. Algunas funciones de cliente podrían fallar.");
}

export { ENV };