// Versión Arquitectura: V4.0 - Limpieza de Raíz y Centralización de Firebase
/**
 * Archivo: frontend/src/main.jsx
 * Misión: Punto de entrada único. Inicializa Firebase y renderice el orquestador maestro App.
 * Estilo: CIMCO Core Standard.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// 1. CONFIGURACIÓN FIREBASE (CIMCO CORE)
// Extraída de variables de entorno Vite para máxima seguridad y portabilidad.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicialización Controlada (Singleton Pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// 2. CONEXIÓN A EMULADORES (Solo en entorno de Desarrollo)
if (import.meta.env.DEV) {
  if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) {
    connectAuthEmulator(auth, `http://${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST}`);
    console.log("🔥 [CIMCO] Auth Emulator: Online");
  }
  if (import.meta.env.VITE_FIRESTORE_EMULATOR_HOST) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log("🔥 [CIMCO] Firestore Emulator: Online");
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);