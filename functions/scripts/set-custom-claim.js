// ============================================================
// ✅ SCRIPT PARA ASIGNAR CUSTOM CLAIMS (ROLES) A USUARIOS
// ============================================================
// Ubicación: functions/scripts/set-custom-claim.js
// ============================================================

import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// ------------------------------------------------------------
// 1. MANEJO DE RUTAS Y CONFIGURACIÓN DE ENTORNO
// ------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FUNCTIONS_ROOT = path.resolve(SCRIPT_DIR, '..'); 

const SERVICE_ACCOUNT_PATH = path.join(FUNCTIONS_ROOT, "serviceAccount.json");
dotenv.config({ path: path.join(FUNCTIONS_ROOT, ".env.production") });

// ------------------------------------------------------------
// 2. VALIDACIÓN DE ARGUMENTOS
// ------------------------------------------------------------
const [ , , uidOrEmail, role] = process.argv;

if (!uidOrEmail || !role) {
    console.log("------------------------------------------------------------------");
    console.log("❌ ERROR: Faltan argumentos.");
    console.log("Uso: node ./scripts/set-custom-claim.js <uid|email> <role>");
    console.log("------------------------------------------------------------------");
    process.exit(1);
}

// ------------------------------------------------------------
// 3. FUNCIÓN PRINCIPAL
// ------------------------------------------------------------
async function main() {
    try {
        // --- 🛡️ INICIALIZACIÓN BLINDADA (Protección contra Duplicidad) ---
        let app;
        if (getApps().length === 0) {
            if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
                throw new Error(`No se encontró serviceAccount.json en ${SERVICE_ACCOUNT_PATH}`);
            }
            const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
            app = initializeApp({ 
                credential: cert(serviceAccount) 
            });
            console.log("✅ [CIMCO CLAIMS] Firebase inicializado para script.");
        } else {
            app = getApp();
            console.log("♻️ [CIMCO CLAIMS] Usando instancia existente.");
        }
        
        // Vinculamos servicios a la instancia única
        const auth = getAuth(app);
        const db = getFirestore(app);

        let uid = uidOrEmail;
        let email = "";

        if (uidOrEmail.includes("@")) {
            console.log(`🔍 Buscando usuario por email: ${uidOrEmail}...`);
            const userRecord = await auth.getUserByEmail(uidOrEmail);
            uid = userRecord.uid;
            email = userRecord.email;
        } else {
            try {
                const userRecord = await auth.getUser(uid);
                email = userRecord.email;
            } catch (e) {
                console.warn("⚠️ No se pudo obtener el email del usuario.");
            }
        }

        // --- PASO 1: Establecer el Custom Claim ---
        console.log(`⚙️ Asignando Claim { role: "${role}" } al UID: ${uid}`);
        await auth.setCustomUserClaims(uid, { role });

        // --- PASO 2: Sincronizar con Firestore ---
        console.log(`💾 Sincronizando en: users_profile/${email || uid}`);
        // Nota: Ajustado a la ruta que configuramos en Firestore anteriormente
        await db.collection("artifacts").doc("taxiacimco-app")
                .collection("public").doc("data")
                .collection("users_profile").doc(email || uid).set({
            role: role,
            esAdmin: role === 'admin',
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`\n🎉 PROCESO COMPLETADO EXITOSAMENTE PARA EL CEO`);
        console.log(`✅ USUARIO: ${email || uid}`);
        console.log(`✅ ROL: ${role}`);
        
        process.exit(0);
    } catch (e) {
        console.error("\n❌ ERROR CRÍTICO:", e.message);
        process.exit(1);
    }
}

main();