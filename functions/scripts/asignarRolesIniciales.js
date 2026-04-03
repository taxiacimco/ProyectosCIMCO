// ============================================================
// 🚀 TaxiA-CIMCO: Script de asignación inicial de roles
// Ubicación: functions/scripts/asignarRolesIniciales.js
// ============================================================

import { getApps, initializeApp, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// 1. Manejo de rutas para encontrar el Service Account
const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FUNCTIONS_ROOT = path.resolve(SCRIPT_DIR, '..'); 
const SERVICE_ACCOUNT_PATH = path.join(FUNCTIONS_ROOT, "serviceAccount.json");

// 🛡️ INICIALIZACIÓN CORREGIDA
let app;
try {
    if (getApps().length === 0) {
        if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
            throw new Error(`No se encontró el archivo serviceAccount.json en: ${SERVICE_ACCOUNT_PATH}`);
        }
        const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
        
        app = initializeApp({
            credential: cert(serviceAccount)
        });
        console.log("🚀 [CIMCO] Conexión establecida con Service Account.");
    } else {
        app = getApp();
    }
} catch (error) {
    console.error("❌ Error al inicializar Firebase:", error.message);
    process.exit(1);
}

const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================
// ✅ Configurar rol a un usuario por UID o Email
// ============================================================
async function asignarRol(identificador, rol) {
  try {
    let uid = identificador;

    if (identificador.includes("@")) {
        console.log(`🔍 Buscando UID para el correo: ${identificador}...`);
        const userRecord = await auth.getUserByEmail(identificador);
        uid = userRecord.uid;
    }

    // Paso 1: Establecer el Custom Claim (Poder en el Token)
    await auth.setCustomUserClaims(uid, { role: rol });
    console.log(`✅ Permiso "${rol}" inyectado en el Token de ${uid}`);

    // Paso 2: Sincronizar con la ruta de perfil de la App
    const userRef = db.collection("artifacts").doc("taxiacimco-app")
                      .collection("public").doc("data")
                      .collection("users_profile").doc(identificador);

    await userRef.set({
      rol: rol,
      esAdmin: true,
      email: identificador,
      ultimaActualizacion: FieldValue.serverTimestamp()
    }, { merge: true });

    // Paso 3: Registro de auditoría
    await db.collection("movimientos").add({
      tipo: "asignacion_rol_ceo",
      usuario: identificador,
      rol: rol,
      fecha: FieldValue.serverTimestamp()
    });

    console.log(`✨ ¡Todo listo! Perfil de ${rol} activado en Firestore.\n`);
  } catch (error) {
    console.error(`❌ Fallo con ${identificador}:`, error.message);
  }
}

async function main() {
  console.log("🛠️  Iniciando configuración de acceso de alto nivel...");
  
  // AQUÍ SE ASIGNA TU RANGO
  await asignarRol("taxiacimco@gmail.com", "admin");

  console.log("🎉 Proceso finalizado. El CEO ya tiene las llaves del sistema.");
  process.exit(0);
}

main();