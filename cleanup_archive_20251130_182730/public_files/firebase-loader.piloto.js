// firebase-loader.piloto.js
// Loader para entorno de pruebas internas (PILOTO)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

window.APP_ENV = "piloto";

const firebaseConfig = {
  apiKey: "PILOTO_API_KEY",
  authDomain: "PILOTO_AUTH_DOMAIN",
  projectId: "PILOTO_PROJECT_ID",
  storageBucket: "PILOTO_STORAGE_BUCKET",
  messagingSenderId: "PILOTO_SENDER_ID",
  appId: "PILOTO_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("[Firebase Loader] Ambiente PILOTO cargado");
