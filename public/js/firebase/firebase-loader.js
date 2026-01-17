// firebase-loader.js
// Configuración centralizada de Firebase para todo el frontend

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 Tu configuración REAL de Firebase (copiada tal como me la diste)
const firebaseConfig = {
  apiKey: "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
  authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
  projectId: "pelagic-chalice-467818-e1",
  storageBucket: "pelagic-chalice-467818-e1.firebasestorage.app",
  messagingSenderId: "191106268804",
  appId: "1:191106268804:web:8b2aa9689abaa35c880cd1",
  measurementId: "G-CPWSCLGKP2"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exportamos instancias globales
export const auth = getAuth(app);
export const db = getFirestore(app);
