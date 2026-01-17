// ============================================================
// 🚀 TaxiA-CIMCO: Script de asignación inicial de roles
// Ubicación: functions/scripts/asignarRolesIniciales.js
// ============================================================

import admin from "firebase-admin";
import { db } from "../lib/adminSDK.js"; // conexión centralizada

// ============================================================
// ✅ Configurar rol a un usuario por UID
// ============================================================
async function asignarRol(uid, rol) {
  try {
    await admin.auth().setCustomUserClaims(uid, { rol });
    console.log(`✅ Rol "${rol}" asignado correctamente al usuario: ${uid}`);

    // Registrar movimiento
    await db.collection("movimientos").add({
      tipo: "asignacion_rol",
      uid,
      rol,
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      descripcion: `Rol asignado automáticamente: ${rol}`,
    });

    console.log("🧾 Movimiento registrado correctamente en Firestore.\n");
  } catch (error) {
    console.error("❌ Error al asignar rol:", error);
  }
}

// ============================================================
// 👑 Asignar roles iniciales (modifica los UIDs reales aquí)
// ============================================================
async function main() {
  // 🔹 CEO principal (tu cuenta)
  await asignarRol("UID_DEL_CEO_AQUI", "ceo");

  // 🔹 Ejemplos adicionales (puedes agregar más)
  // await asignarRol("UID_ADMIN", "admin");
  // await asignarRol("UID_DESPACHADOR", "despachador");
  // await asignarRol("UID_CONDUCTOR", "conductor");

  console.log("✅ Proceso de asignación inicial completado.");
  process.exit(0);
}

// Ejecutar
main();
