/**
 * src/config/env/index.js
 * Punto único de acceso a variables de entorno estandarizado.
 */

import { loadEnv } from "./env.loader.js";

// Cargamos el entorno físicamente a través de tu cargador personalizado
const env = loadEnv();

/**
 * Objeto de configuración unificado.
 * Se han añadido los campos necesarios para el Client SDK de Firebase.
 */
export const ENV = {
  PROJECT_ID: env.PROJECT_ID,
  NODE_ENV: env.NODE_ENV || "development",

  // Firebase: Se expande para cubrir Backend (Admin) y Frontend (Client)
  FIREBASE: {
    // Admin SDK / Backend
    SERVICE_ACCOUNT_KEY: env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}",
    DATABASE_URL: env.FIREBASE_DATABASE_URL,
    
    // Client SDK / Frontend (Nuevos campos agregados para la actividad)
    WEB_API_KEY: env.FIREBASE_WEB_API_KEY, 
    MESSAGING_SENDER_ID: env.FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: env.FIREBASE_APP_ID,
    MEASUREMENT_ID: env.FIREBASE_MEASUREMENT_ID,
    
    PROJECT_ID: env.PROJECT_ID // Duplicado para facilidad de acceso interno
  },

  // Servidor
  PORT: parseInt(env.PORT || "8080", 10),
  
  // Helpers de utilidad
  IS_PRODUCTION: env.NODE_ENV === "production"
};

// Log de verificación para depuración (seguro para entornos controlados)
if (ENV.NODE_ENV !== 'production') {
  console.log(`[Config] Entorno '${ENV.NODE_ENV}' cargado para el proyecto: ${ENV.PROJECT_ID}`);
}

// Mantenemos el export default por compatibilidad
export default ENV;