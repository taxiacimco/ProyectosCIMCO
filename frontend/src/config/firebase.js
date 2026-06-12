// Versión Arquitectura: V11.1 - Consolidación de Gobernanza de Rutas (Estándar Internacional Inglés)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\firebase.js
 * Misión: Estandarización de rutas de Firestore a inglés y mantenimiento de servicios core.
 * Integridad: Objeto FIRESTORE_PATHS homologado para evitar fugas de datos en colecciones 'viajes' obsoletas.
 */

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// 🔐 Credenciales del Proyecto (Inyectadas desde .env.local)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 🏛️ Inicialización de la Instancia Central (Guarda Anti-Undefined Delegada a Firebase)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🛡️ CONSTANTES DE RUTAS DE PRODUCCIÓN HOMOLOGADAS (Patrón de Inyección Centralizada)
export const FIRESTORE_PATHS = {
  users: 'users',
  rides: 'rides',
  notifications: 'driver_notifications',
  wallets: 'wallets',
  chats: 'chats',
  transacciones: 'transacciones'
};

// 🛡️ DETECTOR DE ENTORNO (Lógica Híbrida Modificada)
const hostname = window.location.hostname;
// Ampliamos la guarda para que cubra localhost, 127.0.0.1 y las IPs de tu red local
const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("192.168.");

// 🚀 CONFIGURACIÓN DE EMULADORES (Solo en desarrollo local para blindar la data de producción)
if (isLocal && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  console.warn("⚠️ [CIMCO-ARCHITECTURE] Emuladores de Firebase activados para entorno de prueba.");
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
}

export { app, auth, db };