// Versión Arquitectura: V4.0 - Mapeo de Seguridad de Integridad
/**
 * functions/src/config/env/env.config.js
 * Misión: Mapeo estático de variables de entorno.
 */

export const ENV = {
  PROJECT_NAME: process.env.PROJECT_NAME || 'taxia-cimco-backend',
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_PORT: process.env.APP_PORT || 5001,
  FIREBASE_PROJECT_ID: process.env.CIMCO_PROJECT_ID || 'pelagic-chalice-467818-e1',
  
  // Seguridad JWT
  JWT_SECRET: process.env.JWT_SECRET || 'taxia_cimco_secure_token_2025',
  
  // Pasarela Wompi
  WOMPI: {
    PUBLIC_KEY: process.env.WOMPI_PUBLIC_KEY,
    INTEGRITY_KEY: process.env.WOMPI_INTEGRITY_KEY,
    EVENTS_SECRET: process.env.WOMPI_EVENTS_SECRET
  },

  // Firestore Path Sagrado
  FIRESTORE_BASE_PATH: 'artifacts/taxiacimco-app/public/data/'
};