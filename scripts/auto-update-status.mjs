// ✅ auto-update-status.mjs
// Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\auto-update-status.mjs
// Descripción: Sincroniza el estado de Firebase con el panel local.
// Optimización: Control de cierre de procesos y gestión de logs circulares.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import os from "os";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ============================================================
// 🧠 CONFIGURACIÓN DE RUTAS Y ENTORNO
// ============================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargamos el .env desde la carpeta functions (Ruta absoluta segura)
dotenv.config({ path: path.join(__dirname, "../functions/.env") });

const serviceAccountPath = path.join(__dirname, "../functions/serviceAccount.json");
const statusPath = path.join(__dirname, "../panel/public/status.json");
const logDir = path.join(__dirname, "../logs");
const logPath = path.join(logDir, "auto-update-status.log");

// Asegurar existencia de carpetas
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const publicDir = path.join(__dirname, "../panel/public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// ============================================================
// 🔥 INICIALIZACIÓN DE FIREBASE ADMIN SDK
// ============================================================
let db = null;
let initStatus = "NO_INICIADO";

try {
    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Falta serviceAccount.json en: ${serviceAccountPath}`);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

    if (getApps().length === 0) {
        initializeApp({
            credential: cert(serviceAccount),
            projectId: process.env.PROJECT_ID || "pelagic-chalice-467818-e1",
        });
    }

    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true }); // Evita errores por datos vacíos
    initStatus = "OK";
} catch (error) {
    console.error("❌ Error de Inicialización:", error.message);
    initStatus = "ERROR_INIT";
}

// ============================================================
// 🧾 FUNCIÓN DE LIMPIEZA DE LOGS (Evita que el PC se llene)
// ============================================================
function rotarLogs() {
    try {
        if (fs.existsSync(logPath)) {
            const stats = fs.statSync(logPath);
            if (stats.size > 1024 * 1024) { // Si pesa más de 1MB, lo borra para empezar de cero
                fs.writeFileSync(logPath, `--- Log Reiniciado el ${new Date().toISOString()} ---\n`);
            }
        }
    } catch (e) { /* Silencio */ }
}

// ============================================================
// 🧾 FUNCIÓN PRINCIPAL
// ============================================================
async function actualizarStatus() {
    rotarLogs();
    const timestamp = new Date().toISOString();
    let estadoFirestore = "OFFLINE";

    if (initStatus === "OK" && db) {
        try {
            // Prueba de conexión ultra rápida (timeout mental)
            const testRef = db.collection("testConnection").doc("status_check");
            await testRef.set({ last_seen: timestamp }, { merge: true });
            estadoFirestore = "ONLINE";
        } catch (err) {
            estadoFirestore = "ERROR_CONN";
        }
    }

    const statusData = {
        project: "TAXIA CIMCO",
        version: "2.0.0",
        firestore: estadoFirestore,
        server_status: "RUNNING",
        updated_at: timestamp,
        pc_health: {
            hostname: os.hostname(),
            mem_free: Math.round(os.freemem() / 1024 / 1024) + " MB",
            cpu_load: os.loadavg()[0].toFixed(2)
        }
    };

    try {
        fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
        fs.appendFileSync(logPath, `[${timestamp}] Firestore: ${estadoFirestore} | RAM Libre: ${statusData.pc_health.mem_free}\n`);
        console.log(`✅ Status Sincronizado: ${estadoFirestore}`);
    } catch (err) {
        console.error("❌ Error escribiendo status:", err.message);
    }
}

// Ejecución con cierre forzado para no dejar procesos colgando
actualizarStatus().then(() => {
    // Cerramos el proceso 1 segundo después para asegurar escritura
    setTimeout(() => process.exit(0), 1000);
}).catch(err => {
    console.error("❌ Fallo crítico:", err);
    process.exit(1);
});