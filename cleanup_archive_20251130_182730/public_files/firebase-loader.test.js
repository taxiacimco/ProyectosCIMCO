// firebase-loader.test.js
// Loader exclusivo para ambiente QA / Test

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

window.APP_ENV = "test";

const firebaseConfig = {
  apiKey: "TEST_API_KEY",
  authDomain: "TEST_AUTH_DOMAIN",
  projectId: "TEST_PROJECT_ID",
  storageBucket: "TEST_STORAGE_BUCKET",
  messagingSenderId: "TEST_SENDER_ID",
  appId: "TEST_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("[Firebase Loader] Ambiente TEST cargado");
