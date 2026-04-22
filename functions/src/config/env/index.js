// Versión Arquitectura: V1.5 - Unified Environment Config
/**
 * src/config/env/index.js
 * Punto único de acceso a variables de entorno estandarizado.
 */

import { loadEnv } from "./env.loader.js";

const env = loadEnv();

/**
 * Objeto de configuración unificado.
 */
export const ENV = {
  PROJECT_ID: env.PROJECT_ID,
  NODE_ENV: env.NODE_ENV || "development",

  FIREBASE: {
    SERVICE_ACCOUNT_KEY: env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}",
    DATABASE_URL: env.FIREBASE_DATABASE_URL,
    WEB_API_KEY: env.FIREBASE_WEB_API_KEY, 
    MESSAGING_SENDER_ID: env.FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: env.FIREBASE_APP_ID,
    MEASUREMENT_ID: env.FIREBASE_MEASUREMENT_ID,
    PROJECT_ID: env.PROJECT_ID 
  },

  PORT: parseInt(env.PORT || "8080", 10),
  IS_PRODUCTION: env.NODE_ENV === "production"
};

if (ENV.NODE_ENV !== 'production') {
  console.log(`[Config] Entorno '${ENV.NODE_ENV}' cargado para el proyecto: ${ENV.PROJECT_ID}`);
}

export default ENV;