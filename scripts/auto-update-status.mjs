// ✅ auto-update-status.mjs
// Actualiza el archivo status.json del Panel TAXIA CIMCO con datos reales de Firebase.
// Compatible con entorno de producción y ejecución automática por PowerShell o Node Scheduler.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import os from "os";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ============================================================
// 🧠 CARGAR VARIABLES DE ENTORNO (.env.production)
// ============================================================
dotenv.config({ path: "./functions/.env.production" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// 📂 RUTAS DE ARCHIVOS
// ============================================================
const serviceAccountPath = path.join(__dirname, "../functions/serviceAccount.json");
const statusPath = path.join(__dirname, "../panel/public/status.json");
const logPath = path.join(__dirname, "../logs/auto-update-status.log");

// ============================================================
// 🔥 INICIALIZACIÓN DE FIREBASE ADMIN SDK
// ============================================================
let db = null;
let initStatus = "NO_INICIADO";

try {
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error("No se encuentra el archivo serviceAccount.json");
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.PROJECT_ID || "pelagic-chalice-467818-e1",
  });

  db = getFirestore();
  initStatus = "OK";
  console.log("✅ Firebase Admin SDK inicializado correctamente.");
} catch (error) {
  console.error("❌ Error al inicializar Firebase Admin SDK:", error.message);
  initStatus = "ERROR_INIT";
}

// ============================================================
// 🔎 FUNCIÓN: Verificar conexión con Firestore
// ============================================================
async function verificarFirestore() {
  if (initStatus !== "OK") return "ERROR";

  try {
    const testRef = db.collection("testConnection").doc("status_check");
    const doc = await testRef.get();

    if (doc.exists) {
      return "OK";
    } else {
      // Si no existe, creamos el documento la primera vez
      await testRef.set({ checkedAt: new Date().toISOString() });
      return "CREADO";
    }
  } catch (err) {
    console.error("⚠️ Error de conexión a Firestore:", err.message);
    return "ERROR";
  }
}

// ============================================================
// 🔐 FUNCIÓN: Verificar estado del Auth
// ============================================================
function verificarAuth() {
  return initStatus === "OK" ? "OK" : "ERROR";
}

// ============================================================
// 🧾 FUNCIÓN: Actualizar el archivo status.json
// ============================================================
async function actualizarStatus() {
  const estadoFirestore = await verificarFirestore();
  const estadoAuth = verificarAuth();
  const timestamp = new Date().toISOString();

  const statusData = {
    project: "TAXIA CIMCO",
    firestore: estadoFirestore,
    auth: estadoAuth,
    updated_at: timestamp,
    init_status: initStatus,
    host: os.hostname(),
    env: process.env.NODE_ENV || "production",
  };

  try {
    // 1. Escribir el status.json (público)
    fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));

    // 2. Escribir el log de historial (privado)
    fs.appendFileSync(logPath, `[${timestamp}] Actualizado: ${JSON.stringify(statusData)}\n`);

    // ==========================================================
    // INICIO: NUEVA LÓGICA PARA COPIAR EL LOG AL HOSTING PÚBLICO
    // (Paso 2 de la actividad solicitada)
    // ==========================================================
    try {
        // La ruta pública debe ser relativa a la carpeta 'taxia_cimco_backend/scripts'
        // Nos movemos dos niveles arriba (..) para llegar a ProyectosCIMCO, luego entramos a panel/public/
        const publicLog = path.join(__dirname, "../panel/public/auto-update-status.log");
        
        // Escribimos el mismo registro en la ubicación pública
        fs.appendFileSync(publicLog, `[${timestamp}] Actualizado: ${JSON.stringify(statusData)}\n`);
        
        console.log(`✅ Log de estado copiado a la ruta pública: ${publicLog}`);
    } catch(e) { 
        console.error(`⚠️ Advertencia: No se pudo escribir el log en la ruta pública: ${e.message}`);
        // Se ignora el error si no se puede escribir el log público (se cumple Opción B)
    }
    // ==========================================================
    // FIN: NUEVA LÓGICA
    // ==========================================================
    
    console.log("✅ status.json y logs actualizados correctamente.");
  } catch (err) {
    console.error("❌ Error al escribir los archivos:", err.message);
  }
}

// ============================================================
// 🕒 EJECUCIÓN PRINCIPAL
// ============================================================
await actualizarStatus();