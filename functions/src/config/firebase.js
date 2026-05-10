// Versión Arquitectura: V1.2 - Firebase Admin Singleton (Backend)
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Inicializa el modo administrativo
const app = initializeApp();

export const db = getFirestore(app);
export const auth = getAuth(app);

// Configuración para evitar errores con valores nulos
db.settings({ ignoreUndefinedProperties: true });

export default app;