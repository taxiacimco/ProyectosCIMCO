/**
 * PROYECTO: TAXIA CIMCO - Configuración Maestra Firebase (Frontend)
 * Misión: Inicialización del SDK con persistencia de AuthDomain original.
 * Arquitectura: Cliente de Infraestructura (Vite/React).
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

// 1. Configuración dinámica con Variables de Entorno y Fallbacks de seguridad
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pelagic-chalice-467818-e1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pelagic-chalice-467818-e1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pelagic-chalice-467818-e1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "191106268804",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:191106268804:web:1bb4a7c7c8077b60880cd1"
};

// 2. Inicialización de la App (Singleton Pattern para evitar duplicados en HMR de Vite)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 3. Exportación de Instancias de Servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 4. Identificador de Aplicación para rutas sagradas de Firestore
export const appId = "pelagic-chalice-467818-e1";

// 5. Configuración de Mensajería con Guardrail para Navegadores/SSR
export const messaging = async () => {
  if (typeof window !== 'undefined') {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
  }
  return null;
};

export default app;