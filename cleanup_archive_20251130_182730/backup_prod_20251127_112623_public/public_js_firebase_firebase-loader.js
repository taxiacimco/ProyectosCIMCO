// firebase-loader.js - PRODUCCIÓN REAL (App-pasajero)

// Cargar módulos Firebase desde CDN oficial
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";

// Importar configuración de producción
import { firebaseConfig } from "/js/firebase/firebase-config.js";

// Inicializar la app de Firebase
export const app = initializeApp(firebaseConfig);

// Servicios disponibles
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("[Firebase Loader] Producción cargada correctamente.");
