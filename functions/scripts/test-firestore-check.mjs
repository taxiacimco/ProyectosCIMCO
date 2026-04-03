// ============================================================
// ✅ TEST AUTOMÁTICO DE CONEXIÓN A FIRESTORE (Producción)
// ============================================================
// Ubicación esperada: functions/scripts/test-firestore-check.mjs
// ============================================================

import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from 'url';

// ------------------------------------------------------------
// 1. MANEJO DE RUTAS EN ES MODULES
// ------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FUNCTIONS_ROOT = path.resolve(SCRIPT_DIR, '..'); 

// ------------------------------------------------------------
// 2. CONFIGURACIÓN DE RUTAS
// ------------------------------------------------------------
const LOG_DIR = path.join(FUNCTIONS_ROOT, "logs");
const LOG_FILE = path.join(LOG_DIR, "firestore-check.log");
const SERVICE_ACCOUNT_PATH = path.join(FUNCTIONS_ROOT, "serviceAccount.json");

dotenv.config({ path: path.join(FUNCTIONS_ROOT, ".env.production") });

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const timestamp = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });

async function main() {
    let logEntry;
    
    try {
        // --- 🛡️ INICIALIZACIÓN BLINDADA (Protección contra Duplicidad) ---
        let app;
        if (getApps().length === 0) {
            if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
                throw new Error("No se encontró el archivo serviceAccount.json en la carpeta 'functions/'.");
            }

            const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));

            app = initializeApp({
                credential: cert(serviceAccount),
            });
            console.log(chalk.blue("ℹ️ [CIMCO CHECK] Creando nueva instancia de Firebase..."));
        } else {
            // Si ya existe una instancia (por ejemplo, en el emulador o ejecución paralela)
            app = getApp();
            console.log(chalk.yellow("♻️ [CIMCO CHECK] Usando instancia de Firebase ya existente."));
        }

        // Vinculamos Firestore estrictamente a la instancia 'app' única
        const db = getFirestore(app);
        
        // Intentar listar colecciones para verificar la conexión y permisos
        const collections = await db.listCollections();

        logEntry = `[${timestamp}] ✅ Conexión correcta — ${collections.length} colecciones detectadas.\n`;
        fs.appendFileSync(LOG_FILE, logEntry);
        console.log(chalk.greenBright(logEntry.trim()));
        
        process.exit(0);

    } catch (error) {
        logEntry = `[${timestamp}] ❌ Error crítico: ${error.message}\n`;
        fs.appendFileSync(LOG_FILE, logEntry);
        console.error(chalk.redBright(logEntry.trim()));
        
        process.exit(1);
    }
}

main();