/**
 * src/config/env/env.loader.js
 * Carga de variables de entorno ultra-robusta.
 * Soporta ejecución desde raíz o desde carpeta functions.
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";

/**
 * Busca y carga el archivo .env en las rutas más probables
 */
export function loadEnv() {
  const rootPath = process.cwd();
  
  // Definimos las rutas posibles donde podría estar el .env
  const possiblePaths = [
    path.resolve(rootPath, ".env"),           // Opción 1: En la carpeta actual
    path.resolve(rootPath, "functions", ".env") // Opción 2: Un nivel adentro (si estamos en la raíz)
  ];

  let isLoaded = false;

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const result = dotenv.config({ path: envPath });

      if (!result.error) {
        // Log solo en desarrollo para confirmar la ruta exacta
        if (process.env.NODE_ENV !== 'production') {
          console.log(`✅ [CIMCO CONFIG] .env cargado exitosamente desde: ${envPath}`);
        }
        isLoaded = true;
        break; // Detenemos la búsqueda al encontrar el primero
      } else {
        console.error(`❌ [CIMCO CONFIG] Error al leer .env en ${envPath}:`, result.error.message);
      }
    }
  }

  if (!isLoaded && process.env.NODE_ENV !== 'production') {
    console.warn("⚠️ [CIMCO CONFIG] No se encontró el archivo .env en ninguna ruta conocida.");
  }

  return process.env;
}

export default loadEnv;