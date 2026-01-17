// ==================================================
//  Script para asignar Custom Claim (rol de admin)
// ==================================================
import admin from "firebase-admin";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ⚙️ CORREO del usuario que creaste en Authentication
const email = "taxiacimco@gmail.com"; // cámbialo por el tuyo
const rol = "admin"; // o "corporativo_admin"

async function asignarRolAdmin() {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: rol });
    console.log(`✅ Rol '${rol}' asignado correctamente a ${email}`);
  } catch (error) {
    console.error("❌ Error al asignar rol:", error);
  }
}

asignarRolAdmin();
