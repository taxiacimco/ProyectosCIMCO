/**
 * src/modules/auth/services/auth.service.js
 * * Este servicio maneja la lógica de negocio para la autenticación,
 * integrando Firebase Admin SDK y validaciones de roles.
 */

import { auth, db } from "../../../config/firebase.config.js";
import { APP_ROLES } from "../../../config/app.roles.js";

/**
 * Verifica un ID Token enviado desde el cliente (Frontend)
 * @param {string} idToken 
 * @returns {Promise<Object>} Decoded Token
 */
export const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Error al verificar token en auth.service:", error.message);
    throw new Error("Token de autenticación inválido o expirado.");
  }
};

/**
 * Lógica de inicio de sesión (Login)
 * Verifica el token y valida que el usuario exista en Firestore con el rol correcto.
 * * @param {string} idToken 
 * @returns {Promise<Object>} Datos del usuario y claims
 */
export const loginService = async (idToken) => {
  try {
    // 1. Validar el token con Firebase Auth
    const decodedToken = await verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    // 2. Buscar datos adicionales en Firestore (colección 'users')
    // Nota: El path de la colección depende de tu implementación de Firestore
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      throw new Error("El usuario no está registrado en la base de datos de CIMCO.");
    }

    const userData = userDoc.data();

    // 3. Validar si el usuario tiene un rol asignado válido según config/app.roles.js
    const userRole = userData.role || APP_ROLES.USER;
    
    // Opcional: Podrías asignar Custom Claims aquí si es necesario
    // await auth.setCustomUserClaims(uid, { role: userRole });

    return {
      uid,
      email,
      role: userRole,
      displayName: userData.displayName || "Usuario",
      photoURL: userData.photoURL || ""
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener perfil de usuario por UID
 * @param {string} uid 
 */
export const getUserProfile = async (uid) => {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) throw new Error("Perfil no encontrado.");
    return userDoc.data();
  } catch (error) {
    throw new Error("Error al obtener perfil: " + error.message);
  }
};