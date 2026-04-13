/**
 * src/config/env/env.loader.js
 * Carga de variables de entorno ultra-robusta.
 */
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

export function loadEnv() {
  const rootPath = process.cwd();
  const possiblePaths = [
    path.resolve(rootPath, ".env"),
    path.resolve(rootPath, "functions", ".env")
  ];

  let isLoaded = false;
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const result = dotenv.config({ path: envPath });
      if (!result.error) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`✅ [CIMCO CONFIG] .env cargado exitosamente desde: ${envPath}`);
        }
        isLoaded = true;
        break; 
      }
    }
  }

  if (!isLoaded && process.env.NODE_ENV !== 'production') {
    console.warn("⚠️ [CIMCO CONFIG] No se encontró el archivo .env.");
  }
  return process.env;
}

// SE ELIMINÓ LA LLAMADA AUTOMÁTICA AQUÍ PARA EVITAR EL COLAPSO DE LA FUNCIÓN
export default loadEnv;