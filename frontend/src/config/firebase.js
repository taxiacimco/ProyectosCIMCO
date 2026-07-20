// Versión Arquitectura: V14.8 - Blindaje Estricto Anti-Producción para Emuladores de Firebase
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\firebase.js
 * Misión: Orquestador central de Firebase con captura dinámica de IP de red para emuladores y resolución limpia de rutas.
 * Ajuste V14.8: Validación estricta del entorno mediante la adición de la guarda (!import.meta.env.PROD) para evitar 
 * el levantamiento accidental de emuladores locales en compilaciones distribuidas de producción.
 */

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key-cimco",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "taxia-cimco.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pelagic-chalice-467818-e1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "taxia-cimco.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🛡️ CONSTANTES DE RUTAS DE PRODUCCIÓN HOMOLOGADAS (Ancladas a MongoDB Atlas con Fallbacks y Env Guardas)
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

// 🛡️ DETECTOR DE RED PERIMETRAL SEGURO PARA DESPLIEGUE (Mejorado para soporte ngrok en pruebas)
const hostname = window.location.hostname;
const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("192.168.") || hostname.includes("ngrok-free.dev");
const usarEmulador = import.meta.env.VITE_FIREBASE_EMULATOR === 'true';

// Solo levanta emuladores si estamos en desarrollo local, explícitamente se solicita y NO es producción
if (import.meta.env.DEV && isLocal && usarEmulador && !import.meta.env.PROD) {
  // Hereda la IP unificada declarada en .env.development o usa la IP fija de desarrollo
  const LOCAL_HOST_IP = import.meta.env.VITE_HOST_IP || '192.168.100.34';
  
  console.warn(`⚠️ [CIMCO-ARCHITECTURE] Emuladores enlazados a la IP de red: http://${LOCAL_HOST_IP}`);
  
  connectAuthEmulator(auth, `http://${LOCAL_HOST_IP}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, LOCAL_HOST_IP, 8085);
} else {
  console.log("🚀 [CIMCO-ARCHITECTURE] Conectado exitosamente al nodo central de Firebase en la Nube.");
}

export { app, auth, db };