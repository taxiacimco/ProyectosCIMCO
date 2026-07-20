// Versión Arquitectura: V4.3 - Acoplamiento Atómico y Reutilización de Configuración
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\secondaryAuth.js
 * Misión: Proveer una instancia de autenticación secundaria aislada para registro de sub-usuarios sin romper la sesión activa del CEO.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// 🔌 Configuración unificada simulada idéntica a la gobernanza principal
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key-cimco",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "taxia-cimco.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pelagic-chalice-467818-e1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "taxia-cimco.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Inicializamos la app secundaria con un espacio de nombres único
const secondaryApp = initializeApp(firebaseConfig, "SecondaryAuthApp");
export const secondaryAuth = getAuth(secondaryApp);

// 🛡️ ENLACE PERIMETRAL AL EMULADOR DE AUTH SECUNDARIO
const hostname = window.location.hostname;
const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("192.168.") || hostname.includes("ngrok-free.dev");

if (import.meta.env.DEV && isLocal && import.meta.env.VITE_FIREBASE_EMULATOR === 'true') {
  const LOCAL_HOST_IP = import.meta.env.VITE_HOST_IP || '192.168.100.34';
  connectAuthEmulator(secondaryAuth, `http://${LOCAL_HOST_IP}:9099`, { disableWarnings: true });
  console.log("🤖 Emulador de Autenticación Secundaria Vinculado con Éxito.");
}

export default secondaryAuth;