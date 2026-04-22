// Versión Arquitectura: V3.1 - Refactor de Resolución de Rutas de Entorno
/**
 * functions/src/config/env/env.loader.js
 * Misión: Carga de variables de entorno con resolución de ruta simplificada
 * para evitar bloqueos de I/O durante el Discovery.
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";

export function loadEnv() {
  const rootPath = process.cwd();
  
  // 🎯 Resolución Quirúrgica: Priorizamos el archivo local al proceso actual
  const envPath = fs.existsSync(path.join(rootPath, '.env')) 
                  ? path.join(rootPath, '.env') 
                  : path.join(rootPath, 'functions', '.env');

  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    
    if (!result.error && process.env.NODE_ENV !== 'test') {
      console.log(`✅ [CIMCO CONFIG] Entorno cargado exitosamente: ${envPath}`);
    }
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.warn("⚠️ [CIMCO CONFIG] No se detectó archivo .env en las rutas estándar.");
    }
  }
  
  return process.env;
}

export default loadEnv;