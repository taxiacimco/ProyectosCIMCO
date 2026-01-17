// ==================================================================
// 🧠 FIRESTORE HEALTH CHECK - TAXI A CIMCO
// ------------------------------------------------------------------
// Este script realiza una verificación automática semanal o manual
// para confirmar que Firestore está accesible, operativo y con
// permisos válidos. Registra los resultados en /logs/firestore-check.log
// ==================================================================

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// ============================================================
// 🔧 CONFIGURACIONES INICIALES
// ============================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables del entorno de producción
dotenv.config({ path: path.resolve(__dirname, "../functions/.env.production") });

// Directorio y archivo de logs
const logsDir = path.resolve(__dirname, "../logs");
const logFile = path.join(logsDir, "firestore-check.log");

// Crear carpeta de logs si no existe
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// Función para escribir en el log
function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, line);
  console.log(message);
}

// ============================================================
// 🚀 INICIALIZACIÓN DE FIREBASE
// ============================================================
try {
  const serviceAccount = await import("../functions/serviceAccount.json", {
    assert: { type: "json" },
  });

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount.default),
    });
  }

  log("✅ Firebase inicializado correctamente.");
} catch (error) {
  log(`❌ Error inicializando Firebase: ${error.message}`);
  process.exit(1);
}

const db = admin.firestore();

// ============================================================
// 🔍 PRUEBA DE LECTURA Y ESCRITURA TEMPORAL
// ============================================================
const testCollection = "testConnection";
const testDocId = `health_${Date.now()}`;
const testData = {
  check: "ok",
  entorno: process.env.NODE_ENV || "production",
  timestamp: new Date().toISOString(),
};

try {
  // 🟢 1. Crear documento temporal
  await db.collection(testCollection).doc(testDocId).set(testData);
  log(`📤 Documento temporal creado: ${testCollection}/${testDocId}`);

  // 🟣 2. Leer documento
  const docSnap = await db.collection(testCollection).doc(testDocId).get();
  if (docSnap.exists) {
    log("📥 Lectura correcta del documento temporal.");
  } else {
    log("⚠️ Documento no encontrado tras la creación.");
  }

  // 🔴 3. Eliminar documento
  await db.collection(testCollection).doc(testDocId).delete();
  log("🗑️ Documento temporal eliminado correctamente.");

  log("✅ Verificación Firestore completada sin errores.");
} catch (error) {
  log(`❌ Error en Firestore Health Check: ${error.message}`);
  process.exit(1);
}
