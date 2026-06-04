// Versión Arquitectura: V10.8 - Reconexión de Emuladores Locales (Cierre de Bypass)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\firebase.js
 * Misión: Gestionar la conectividad de TAXIA CIMCO.
 * Lógica:
 * - Se reactivan los emuladores locales para sincronizar el clúster local y evitar
 * bloqueos por invalid-credential en el entorno de producción.
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

// 🏛️ Inicialización de la Instancia Central
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🛡️ DETECTOR DE ENTORNO (Lógica Híbrida Modificada)
const hostname = window.location.hostname;
// Ampliamos la guarda para que cubra localhost, 127.0.0.1 y las IPs de tu red local en La Jagua
const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("192.168.");

if (isLocal) {
    // 💻 MODO DESARROLLO CON EMULADORES LOCALES ACTIVOS
    console.log("📡 [CIMCO-INTERNAL] Entorno local detectado. Enlazando con Emuladores Firebase (Auth/Firestore)...");
    
    // 🛡️ REGLA INQUEBRANTABLE: Conexión atómica a los puertos de tu Terminal 1
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export { app, auth, db };