import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";

// 1. Cargamos el archivo JSON directamente para evitar errores de "Copy-Paste"
const keyPath = resolve("serviceAccountKey.json");
const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 2. IMPORTANTE: Pon aquí tu correo exacto de la App
const adminEmail = "taxiacimco@gmail.com"; 

async function grantAdminRole(email) {
  try {
    console.log(`⏳ Intentando elevar a ${email}...`);
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    console.log("--------------------------------------------------");
    console.log(`🚀 ¡ÉXITO TOTAL! Ya eres ADMIN.`);
    console.log("--------------------------------------------------");
    process.exit(0);
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    process.exit(1);
  }
}

grantAdminRole(adminEmail);