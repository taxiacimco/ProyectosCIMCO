// --- FIX TS2305 (Importación de ENV) ---
/**
 * Configuración de variables de entorno.
 * Accede directamente a process.env y proporciona valores por defecto 
 * para el desarrollo si las variables no están definidas.
 */
export const ENV = {
  // Clave secreta para la generación y validación de JSON Web Tokens (JWT).
  // Se usa 'your-secret-key-development' como valor por defecto en desarrollo.
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-development',
  
  // ID del proyecto de Firebase.
  // Se usa 'taxia-cimco-default' como valor por defecto en desarrollo.
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'taxia-cimco-default',

  // Puedes añadir más variables de entorno aquí según las necesites.
};