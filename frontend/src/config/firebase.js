// Versión Arquitectura: V6.5 - Unificación de Singleton y Conexión a Emuladores
/**
 * src/config/firebase.js
 * Misión: Singleton central de Firebase. Gestiona la conexión a emuladores locales
 * y carga las credenciales reales del proyecto TAXIA CIMCO.
 */
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// 🔐 Credenciales Reales del Proyecto: pelagic-chalice-467818-e1
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 🏛️ Inicialización de la instancia de Firebase
const app = initializeApp(firebaseConfig);

// 🛡️ Inicialización de Servicios Core
const auth = getAuth(app);
const db = getFirestore(app);

// 🚀 Lógica de Conexión a Emuladores (Solo en desarrollo local)
if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) {
  const authUrl = `http://${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST}`;
  connectAuthEmulator(auth, authUrl);
  console.log("🛡️ Auth: Conectado al Emulador");
}

if (import.meta.env.VITE_FIRESTORE_EMULATOR_HOST) {
  const [host, port] = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(db, host, parseInt(port));
  console.log("🔥 Firestore: Conectado al Emulador");
}

export { auth, db };
export default app;