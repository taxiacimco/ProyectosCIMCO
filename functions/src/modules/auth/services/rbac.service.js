import { auth, db } from "../../../firebase/firebase-admin.js";
import admin from "firebase-admin"; // Necesario para FieldValue

/**
 * Asigna roles (Custom Claims) a un usuario en Firebase Auth y registra el evento.
 */
export const asignarRol = async (uid, rol) => {
  try {
    // 1. Establecer el claim en Firebase Auth
    // Esto es lo que permite usar 'request.auth.token.rol' en las reglas de Firestore
    await auth.setCustomUserClaims(uid, { rol });
    
    // 2. Registrar en la colección 'movimientos' para auditoría
    await db.collection("movimientos").add({
      tipo: "asignacion_rol",
      uid,
      rol,
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      descripcion: `Rol '${rol}' asignado exitosamente via RBAC Service.`
    });

    console.log(`✅ Rol [${rol}] asignado correctamente al UID: ${uid}`);
    return { success: true, message: `Rol ${rol} asignado.` };
  } catch (error) {
    console.error("❌ Error en RBAC Service:", error);
    throw new Error("No se pudo asignar el rol: " + error.message);
  }
};