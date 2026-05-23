// Versión Arquitectura: V10.6 - Enrutamiento Forzado a Cloud Real (Bypass de Emuladores)
/**
 * src/config/firebase.js
 * Misión: Gestionar la conectividad de TAXIA CIMCO.
 * Lógica:
 * - Se comentan los emuladores locales para obligar al Login a usar la infraestructura real en la nube.
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

if (isLocal) {
    // 💻 MODO DESARROLLO CON REDIRECCIÓN A CLOUD
    console.log("📡 [CIMCO-INTERNAL] Bypass de emuladores activo. Conectando a Firebase Cloud Real...");
    
    /* ⚠️ CONTROL DE ARQUITECTURA: Bloque de Emuladores Desactivado temporalmente
       Para volver a usar emuladores locales en el futuro, remueve los comentarios '//' de abajo:
       
       connectAuthEmulator(auth, "http://127.0.0.1:9099");
       connectFirestoreEmulator(db, "127.0.0.1", 8080);
    */
}

export { app, auth, db };