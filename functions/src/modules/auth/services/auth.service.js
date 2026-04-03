/**
 * src/modules/auth/services/auth.service.js
 * Lógica de negocio con Custom Claims (Nivel Bancario)
 */
import { auth, db } from "../../../firebase/firebase-admin.js";

// ID del artefacto principal según la Estructura Sagrada
const appId = 'taxiacimco-app';

export const verifyIdToken = async (idToken) => {
  try {
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error("❌ [Auth Service] Error verificando token:", error.message);
    throw new Error("Token inválido.");
  }
};

export const loginService = async (idToken) => {
  try {
    const decodedToken = await verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    // Búsqueda en el Path Sagrado: artifacts/taxiacimco-app/public/data/usuarios/[uid]
    const userRef = db.collection("artifacts").doc(appId)
                      .collection("public").doc("data")
                      .collection("usuarios").doc(uid);
                      
    const userDoc = await userRef.get();

    // ALERTA: Si el usuario no existe en Firestore, lanzamos error controlado
    if (!userDoc.exists) {
      console.error(`❌ [CIMCO] Usuario ${uid} no encontrado en la ruta sagrada.`);
      throw new Error("El usuario no está registrado en el sistema CIMCO.");
    }

    const userData = userDoc.data();
    const userRole = userData.rol || userData.role || "pasajero"; 
    
    // Sincronización de Custom Claims (Roles en Firebase Auth)
    const userRecord = await auth.getUser(uid);
    const currentClaims = userRecord.customClaims || {};

    if (currentClaims.role !== userRole) {
      await auth.setCustomUserClaims(uid, { role: userRole });
    }

    return {
      uid,
      email,
      role: userRole,
      nombre: userData.nombre || "Usuario CIMCO",
      estado: userData.estado || "activo"
    };
  } catch (error) {
    throw error;
  }
};