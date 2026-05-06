// Versión Arquitectura: V9.2 - Protocolo de Tolerancia a Fallos + Host Dinámico
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage"; 
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 🧠 Inicialización del núcleo único
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 🔧 Órganos principales (Siempre disponibles)
export const auth = getAuth(app);
export const db = getFirestore(app);

// 🛡️ Inicialización protegida de Storage 
let storageInstance;
try {
    storageInstance = getStorage(app);
} catch (e) {
    console.warn("⚠️ [CIMCO] Storage en modo standby.");
}
export const storage = storageInstance;

// 🛡️ Inicialización protegida de Messaging
let messagingInstance = null;
try {
    messagingInstance = getMessaging(app);
} catch (e) {
    console.warn("📢 [CIMCO] Messaging no disponible en este entorno local. Continuando sin notificaciones.");
}
export const messaging = messagingInstance;

// 📡 Sincronización Dinámica con el Cerebro Local
const host = window.location.hostname;
const isLocal = host === "localhost" || host.startsWith("192.168.");

if (isLocal) {
  console.log(`📡 [CIMCO CENTRAL] Conectando órganos a Emuladores en: ${host}`);
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  
  if (storage) {
    connectStorageEmulator(storage, host, 9199); 
  }
}

export default app;