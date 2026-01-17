// ============================================================
// 🚀 TAXI A CIMCO - Admin SDK Centralizado
// Ubicación: /lib/adminSDK.js
// ============================================================

import admin from "firebase-admin";
import fs from "fs";

// ============================================================
// 🧩 Inicialización con serviceAccountKey.json
// ============================================================

const serviceAccountPath = "./serviceAccountKey.json";

if (!admin.apps.length) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Admin SDK inicializado correctamente con Service Account.");
  } else {
    console.error("❌ No se encontró el archivo serviceAccountKey.json");
    process.exit(1);
  }
}

// ============================================================
// 🔗 Exportar servicios principales
// ============================================================

const db = admin.firestore();
const auth = admin.auth();

// ============================================================
// 🔐 Funciones de gestión de roles y movimientos
// ============================================================

/**
 * 🔹 Asigna un rol específico a un usuario
 */
export async function asignarRol(uid, rol) {
  try {
    await auth.setCustomUserClaims(uid, { rol });
    console.log(`✅ Rol "${rol}" asignado a UID: ${uid}`);

    await db.collection("movimientos").add({
      tipo: "asignacion_rol",
      uid,
      rol,
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      descripcion: `Rol asignado manualmente (${rol})`,
    });

    console.log("🧾 Movimiento registrado en Firestore.\n");
  } catch (error) {
    console.error("❌ Error al asignar rol:", error);
  }
}

/**
 * 🔹 Obtiene los datos de un usuario por UID
 */
export async function obtenerUsuario(uid) {
  try {
    const user = await auth.getUser(uid);
    return user;
  } catch (error) {
    console.error("❌ Error al obtener usuario:", error);
    return null;
  }
}

/**
 * 🔹 Lee configuración global de roles desde Firestore
 */
export async function obtenerConfiguracionRoles() {
  try {
    const doc = await db.collection("config").doc("roles_config").get();
    if (doc.exists) {
      return doc.data();
    } else {
      console.warn("⚠️ No se encontró el documento roles_config. Se usará configuración por defecto.");
      return {
        ceo: ["ceo@taxiacimco.com"],
        admin: [],
        despachador: [],
        conductor: [],
      };
    }
  } catch (error) {
    console.error("❌ Error al leer configuración de roles:", error);
    return null;
  }
}

// ============================================================
// 📤 Exportaciones generales
// ============================================================

export { db, auth, admin };
