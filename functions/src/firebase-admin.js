/**
 * src/firebase-admin.js
 * Inicialización única y segura de Firebase Admin SDK.
 * Soporta modo Híbrido: Emuladores locales y Cloud Production.
 */
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import admin from "firebase-admin"; // Importación necesaria para applicationDefault
import fs from "fs";
import path from "path";

// 1. Detección de entorno
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" || !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

// 2. Inicialización Condicional
if (!getApps().length) {
  if (isEmulator) {
    // 🛠️ MODO EMULADOR
    initializeApp({
      projectId: process.env.PROJECT_ID || "pelagic-chalice-467818-e1"
    });
    console.log("🛠️ [CIMCO ADMIN] Conectado a Emuladores (Sin Service Account)");
  } else {
    // ☁️ MODO PRODUCCIÓN
    try {
      const serviceAccountPath = path.join(process.cwd(), "serviceAccount.json");
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
        initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
        console.log("🔥 [CIMCO ADMIN] Inicializado con Service Account (Producción)");
      } else {
        // Fallback usando el objeto admin principal para evitar el error de exportación
        initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.PROJECT_ID
        });
        console.log("☁️ [CIMCO ADMIN] Inicializado con Application Default Credentials");
      }
    } catch (error) {
      console.error("❌ [CIMCO ADMIN] Error crítico al inicializar Firebase Admin:", error.message);
    }
  }
}

// 3. Exportar servicios (Instancias únicas)
export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();

export default { auth, db, storage };