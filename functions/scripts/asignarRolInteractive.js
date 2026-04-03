/**
 * Ubicación Recomendada: functions/scripts/asignarRolInteractive.js
 * Propósito: Asignación de roles interactiva para TAXIA CIMCO.
 */

import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FUNCTIONS_ROOT = path.resolve(SCRIPT_DIR, '..'); 
const SERVICE_ACCOUNT_PATH = path.join(FUNCTIONS_ROOT, "serviceAccount.json");

async function main() {
    try {
        // 🛡️ PROTECCIÓN CRÍTICA CONTRA DUPLICIDAD
        let app;
        if (getApps().length === 0) {
            if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
                throw new Error("No se encontró serviceAccount.json. Verifica la ruta.");
            }
            const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
            app = initializeApp({
                credential: cert(serviceAccount)
            });
            console.log("✅ [CIMCO INTERACTIVE] Firebase inicializado.");
        } else {
            app = getApp();
            console.log("♻️ [CIMCO INTERACTIVE] Usando instancia existente.");
        }

        const auth = getAuth(app);
        const db = getFirestore(app);

        console.log("🚀 Sistema de asignación interactiva listo.");
        // Aquí sigue tu lógica de interacción...
        
    } catch (error) {
        console.error("❌ Error en el script interactivo:", error.message);
        process.exit(1);
    }
}

main();