// ============================================================
// ✅ SCRIPT PARA ASIGNAR CUSTOM CLAIMS (ROLES) A USUARIOS
// ============================================================
// Ubicación: functions/scripts/set-custom-claim.js
// Ejecutar manualmente con:
// 1. Por UID: node ./scripts/set-custom-claim.js <UID_DEL_USUARIO> <role>
// 2. Por Email: node ./scripts/set-custom-claim.js user@example.com <role>
// ============================================================

import { initializeApp, cert } from "firebase-admin/app";
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
    console.log("Ejemplo: node ./scripts/set-custom-claim.js taxiacimco@gmail.com admin");
    console.log("------------------------------------------------------------------");
    process.exit(1);
}

// ------------------------------------------------------------
// 3. FUNCIÓN PRINCIPAL
// ------------------------------------------------------------
async function main() {
    try {
        // --- Inicialización de Firebase Admin ---
        if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
            throw new Error(`No se encontró serviceAccount.json en ${SERVICE_ACCOUNT_PATH}`);
        }
        
        const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
        
        const app = initializeApp({ 
            credential: cert(serviceAccount) 
        });
        
        const auth = getAuth(app);
        const db = getFirestore(app);

        let uid = uidOrEmail;
        let email = "";

        // Si es un email, buscar el usuario para obtener su UID
        if (uidOrEmail.includes("@")) {
            console.log(`🔍 Buscando usuario por email: ${uidOrEmail}...`);
            const userRecord = await auth.getUserByEmail(uidOrEmail);
            uid = userRecord.uid;
            email = userRecord.email;
        } else {
            // Si pasaron un UID, intentar obtener el email para el log de Firestore
            try {
                const userRecord = await auth.getUser(uid);
                email = userRecord.email;
            } catch (e) {
                console.warn("⚠️ No se pudo obtener el email del usuario para el registro en Firestore.");
            }
        }

        // --- PASO 1: Establecer el Custom Claim (Seguridad de Token) ---
        console.log(`⚙️ Asignando Claim { role: "${role}" } al UID: ${uid}`);
        await auth.setCustomUserClaims(uid, { role });

        // --- PASO 2: Sincronizar con Firestore (Persistencia en DB) ---
        console.log(`💾 Actualizando documento en Firestore: users/${uid}`);
        await db.collection("users").doc(uid).set({
            role: role,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`\n🎉 PROCESO COMPLETADO EXITOSAMENTE:`);
        console.log(`   -------------------------------------------`);
        console.log(`   ✅ USUARIO: ${email || 'UID: ' + uid}`);
        console.log(`   ✅ ROL ASIGNADO: ${role}`);
        console.log(`   ✅ TOKEN ACTUALIZADO: SÍ`);
        console.log(`   ✅ FIRESTORE ACTUALIZADO: SÍ`);
        console.log(`   -------------------------------------------\n`);
        console.log(`👉 NOTA: El usuario debe re-iniciar sesión para ver los cambios.`);
        
        process.exit(0);
    } catch (e) {
        console.error("\n❌ ERROR CRÍTICO:");
        console.error("Detalle:", e.message, "\n");
        process.exit(1);
    }
}

main();