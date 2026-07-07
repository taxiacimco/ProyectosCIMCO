// Versión Arquitectura: V1.2 - Resolución Dinámica de Llaves de Infraestructura
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\functions\setAdmin.js
 * Misión: Elevación privilegiada de roles corporativos (Custom Claims) en Firebase Auth de forma segura.
 */

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// 📐 Resolución estricta de rutas basada en el módulo, no en la posición de la terminal
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const keyPath = resolve(__dirname, "serviceAccountKey.json");
let serviceAccount;

try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
} catch (error) {
  console.error("❌ ERROR CRÍTICO: No se encontró el archivo serviceAccountKey.json en la ruta raíz de functions.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Correo objetivo a elevar como administrador del sistema
const adminEmail = "taxiacimco@gmail.com"; 

async function grantAdminRole(email) {
  try {
    console.log(`⏳ [CIMCO-AUTH-ELEVATION] Intentando elevar a: ${email}...`);
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    console.log("--------------------------------------------------");
    console.log(`🚀 ¡ÉXITO TOTAL! Las credenciales de ADMIN han sido consolidadas.`);
    console.log("--------------------------------------------------");
    process.exit(0);
  } catch (error) {
    console.error("❌ ERROR OPERATIVO:", error.message);
    process.exit(1);
  }
}

grantAdminRole(adminEmail);