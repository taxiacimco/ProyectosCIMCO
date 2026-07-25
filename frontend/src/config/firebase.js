// Versión Arquitectura: V15.1 - Stabilization, Long-Polling & Anti-HMR
/**
 * Ubicación: frontend\src\config\firebase.js
 * Misión: Orquestador central de Firebase con soporte Long-Polling para emuladores locales,
 *         prevención de re-inicializaciones bajo Vite HMR y exposición de FIRESTORE_PATHS.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 🛡️ Prevenir re-inicializaciones múltiples en Hot Module Replacement (Vite HMR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// 🛡️ Estabilización de Firestore con Long Polling para erradicar errores ERR_NETWORK_CHANGED / 400
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// 🛡️ CONSTANTES DE RUTAS DE PRODUCCIÓN HOMOLOGADAS (Ancladas a MongoDB Atlas / Firestore)
export const FIRESTORE_PATHS = {
  usuarios: import.meta.env.VITE_FIRESTORE_PATH_USUARIOS || 'usuarios',
  users: import.meta.env.VITE_FIRESTORE_PATH_USUARIOS || 'usuarios',           
  conductores: import.meta.env.VITE_FIRESTORE_PATH_CONDUCTORES || 'conductores',  
  viajes: import.meta.env.VITE_FIRESTORE_PATH_VIAJES || 'viajes',            
  rides: import.meta.env.VITE_FIRESTORE_PATH_VIAJES || 'viajes',             
  notifications: 'driver_notifications',
  wallets: 'wallets',
  chats: 'chats',
  transacciones: 'transacciones',
  historial_saldo: 'historial_saldo'
};

// 🛡️ DETECTOR DE RED PERIMETRAL SEGURO PARA DESPLIEGUE (Soporte Ngrok, Redes Locales y Emuladores)
const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("192.168.") || hostname.includes("ngrok-free.dev");
const usarEmulador = import.meta.env.VITE_FIREBASE_EMULATOR === 'true';

// Solo levanta emuladores si estamos en desarrollo local, explícitamente se solicita y NO es producción
if (import.meta.env.DEV && isLocal && usarEmulador && !import.meta.env.PROD) {
  const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || import.meta.env.VITE_HOST_IP || '127.0.0.1';
  
  console.warn(`⚡ [FIREBASE-EMULATOR] Enlazado a emuladores locales en host: http://${emulatorHost}`);
  
  // Auth Emulator (Puerto estándar 9099)
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  
  // Firestore Emulator (Puerto estándar 8085 / 8080 configurable)
  const firestorePort = Number(import.meta.env.VITE_FIREBASE_EMULATOR_PORT) || 8085;
  connectFirestoreEmulator(db, emulatorHost, firestorePort);
} else {
  console.log("🚀 [CIMCO-ARCHITECTURE] Conectado exitosamente al nodo central de Firebase en la Nube.");
}

export { app };
export default app;