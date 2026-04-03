/**
 * src/modules/admin/services/admin.service.js
 * Lógica de negocio para administración de usuarios (Firebase Auth + Firestore)
 */

// Importamos las instancias ya configuradas desde nuestro punto central
import { db, auth } from "../../../firebase/firebase-admin.js";

/**
 * Servicio de Administración
 */
class AdminService {
  /**
   * Lista todos los usuarios registrados en Firebase Auth
   * @returns {Promise<Array>}
   */
  static async listUsers() {
    try {
      // Usamos la instancia 'auth' centralizada
      const result = await auth.listUsers(1000);
      return result.users;
    } catch (error) {
      console.error("❌ Error listando usuarios:", error);
      throw new Error("No se pudieron listar los usuarios");
    }
  }

  /**
   * Asigna un rol a un usuario usando Custom Claims
   * y lo persiste en Firestore para consultas internas
   *
   * @param {string} uid - UID del usuario
   * @param {string} role - Rol a asignar (admin, driver, user, etc.)
   */
  static async setUserRole(uid, role) {
    if (!uid || !role) {
      throw new Error("UID y role son obligatorios");
    }

    try {
      // 1. Custom Claims (Auth) - Usando instancia centralizada
      await auth.setCustomUserClaims(uid, { role });

      // 2. Persistencia en Firestore - Usando instancia centralizada
      await db.collection("users").doc(uid).set(
        {
          role,
          roleUpdatedAt: new Date(),
        },
        { merge: true }
      );

      return { uid, role };
    } catch (error) {
      console.error("❌ Error asignando rol:", error);
      throw new Error("No se pudo asignar el rol al usuario");
    }
  }
}

export default AdminService;