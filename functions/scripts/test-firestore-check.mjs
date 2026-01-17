// ============================================================
// ✅ TEST AUTOMÁTICO DE CONEXIÓN A FIRESTORE (Producción)
// ============================================================
// Ubicación esperada: functions/scripts/test-firestore-check.mjs
// Ejecutar manualmente con: node ./scripts/test-firestore-check.mjs
// ============================================================

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from 'url'; // Importaciones necesarias para manejar ES Modules

// ------------------------------------------------------------
// 1. MANEJO DE RUTAS EN ES MODULES
// ------------------------------------------------------------
// Obtenemos la ruta del script y definimos la raíz del proyecto (functions/)
const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FUNCTIONS_ROOT = path.resolve(SCRIPT_DIR, '..'); // Un nivel arriba de /scripts

// ------------------------------------------------------------
// 2. CONFIGURACIÓN DE RUTAS
// ------------------------------------------------------------
// Rutas relativas a la raíz de 'functions/'
const LOG_DIR = path.join(FUNCTIONS_ROOT, "logs");
const LOG_FILE = path.join(LOG_DIR, "firestore-check.log");
const SERVICE_ACCOUNT_PATH = path.join(FUNCTIONS_ROOT, "serviceAccount.json");

// Cargar variables desde .env.production (opcional si necesitas variables de entorno)
dotenv.config({ path: path.join(FUNCTIONS_ROOT, ".env.production") });

// Crear carpeta logs si no existe
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Fecha y hora actuales
const timestamp = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });

async function main() {
    let logEntry;
    
    try {
        if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
            throw new Error("No se encontró el archivo serviceAccount.json en la carpeta 'functions/'.");
        }

        const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));

        // Inicializar la aplicación de Firebase Admin
        initializeApp({
            credential: cert(serviceAccount),
        });

        const db = getFirestore();
        
        // Intentar listar colecciones para verificar la conexión y permisos
        const collections = await db.listCollections();

        logEntry = `[${timestamp}] ✅ Conexión correcta — ${collections.length} colecciones detectadas.\n`;
        fs.appendFileSync(LOG_FILE, logEntry);
        console.log(chalk.greenBright(logEntry.trim()));
        
        // Éxito: Salir con código 0
        process.exit(0);

    } catch (error) {
        logEntry = `[${timestamp}] ❌ Error crítico: ${error.message}\n`;
        fs.appendFileSync(LOG_FILE, logEntry);
        console.error(chalk.redBright(logEntry.trim()));
        
        // Fallo: Salir con código 1
        process.exit(1);
    }
}

main();