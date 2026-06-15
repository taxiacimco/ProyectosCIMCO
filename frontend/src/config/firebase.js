// Versión Arquitectura: V11.2 - Consolidación de Gobernanza de Rutas (Estándar Internacional Inglés)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\firebase.js
 */

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🛡️ CONSTANTES DE RUTAS DE PRODUCCIÓN HOMOLOGADAS
export const FIRESTORE_PATHS = {
  users: 'users',
  rides: 'rides',
  viajes: 'rides', // Alias de retrocompatibilidad temporal
  conductores: 'conductores', // Inyectado para la malla operativa
  notifications: 'driver_notifications',
  wallets: 'wallets',
  chats: 'chats',
  transacciones: 'transacciones'
};

const hostname = window.location.hostname;
const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("192.168.");

if (isLocal && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  console.warn("⚠️ [CIMCO-ARCHITECTURE] Emuladores de Firebase activados para entorno de prueba.");
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
}

export { app, auth, db };