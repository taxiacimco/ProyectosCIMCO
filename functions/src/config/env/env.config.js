/**
 * src/config/env/env.config.js
 * Configuración centralizada de TAXIA CIMCO.
 */
import "./env.loader.js";

export const ENV = {
  // Configuración Básica
  PROJECT_NAME: process.env.PROJECT_NAME || 'taxia-cimco-backend',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Puertos
  PORT: process.env.PORT || 3000,
  APP_PORT: process.env.APP_PORT || 5001,
  
  // Firebase / CIMCO
  FIREBASE_PROJECT_ID: process.env.CIMCO_PROJECT_ID || 'pelagic-chalice-467818-e1',
  FUNCTIONS_REGION: process.env.FUNCTIONS_REGION || 'us-central1',
  
  // Seguridad
  JWT_SECRET: process.env.JWT_SECRET || 'taxia_cimco_secure_token_2025',
  INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET || 'taxia_cimco_secure_token_2025',
  
  // URLs de Integración
  API_BASE_URL: process.env.API_BASE_URL || 'http://192.168.100.34:5001/pelagic-chalice-467818-e1/us-central1',
  FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL || 'http://192.168.100.34:5173',

  // Regla de Oro: Path Sagrado de Firestore
  FIRESTORE_PATH: 'artifacts/taxiacimco-app/public/data'
};

export default ENV;