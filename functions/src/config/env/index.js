import { loadEnv } from "./env.loader.js";

// Cargamos y validamos las variables
const validatedEnv = loadEnv();

export const ENV = {
  // ✅ Usamos la variable estandarizada
  PROJECT_ID: validatedEnv.CIMCO_PROJECT_ID || validatedEnv.PROJECT_ID, 
  NODE_ENV: validatedEnv.NODE_ENV || "development",

  FIREBASE: {
    // Usamos el objeto validado por Zod para mayor seguridad
    SERVICE_ACCOUNT_KEY: validatedEnv.FIREBASE_SERVICE_ACCOUNT_KEY || "{}",
    DATABASE_URL: validatedEnv.FIREBASE_DATABASE_URL,
    WEB_API_KEY: validatedEnv.WEB_API_KEY, // Sincronizado con env.schema.js[cite: 39]
    MESSAGING_SENDER_ID: validatedEnv.FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: validatedEnv.FIREBASE_APP_ID,
    MEASUREMENT_ID: validatedEnv.FIREBASE_MEASUREMENT_ID,
    PROJECT_ID: validatedEnv.CIMCO_PROJECT_ID 
  },

  PORT: parseInt(validatedEnv.APP_PORT || "5001", 10), // Usamos APP_PORT del esquema[cite: 39]
  IS_PRODUCTION: validatedEnv.NODE_ENV === "production"
};

export default ENV;