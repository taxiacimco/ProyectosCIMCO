import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { envSchema } from "./env.schema.js"; // Importamos el validador

export function loadEnv() {
  const rootPath = process.cwd();
  const nodeEnv = process.env.NODE_ENV || 'development';

  // 🎯 Estrategia de Carga Priorizada:
  // 1. .env.local (Para desarrollo)
  // 2. .env (Genérico)
  const envFiles = [
    path.join(rootPath, `.env.${nodeEnv}.local`),
    path.join(rootPath, `.env.local`),
    path.join(rootPath, `.env`)
  ];

  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file });
      if (nodeEnv !== 'test') {
        console.log(`✅ [CIMCO CONFIG] Archivo cargado: ${file}`);
      }
      break; // Detenerse en el primer archivo encontrado con mayor prioridad
    }
  }

  // 🛡️ VALIDACIÓN DE INTEGRIDAD CON ZOD[cite: 39]
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("❌ [ALERTA DE ARQUITECTURA] Variables de entorno inválidas:");
    console.error(JSON.stringify(error.format(), null, 2));
    if (nodeEnv === 'production') process.exit(1);
    return process.env;
  }
}

export default loadEnv;