// firebase-loader.js - PRODUCCIÓN (APP CEO)

// Cargar módulos Firebase desde CDN oficial
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";

// IMPORTAR CONFIGURACIÓN CORRECTA PARA ADMIN
import { firebaseConfig } from "/admin/js/firebase/firebase-config.js";

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("[Firebase Loader] CEO Producción cargado correctamente");
