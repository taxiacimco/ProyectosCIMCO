// firebase-loader.js - Cargador Centralizado TaxiA-CIMCO
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, query, onSnapshot, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
  authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
  projectId: "pelagic-chalice-467818-e1",
  storageBucket: "pelagic-chalice-467818-e1.appspot.com",
  messagingSenderId: "191106268804",
  appId: "1:191106268804:web:8b2aa9689abaa35c880cd1"
};

// Inicialización
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exponer a la ventana global para que los otros scripts los usen sin importar rutas
window.firebaseApp = app;
window.auth = auth;
window.db = db;
window.firebaseUtils = { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    addDoc, 
    query, 
    onSnapshot, 
    orderBy, 
    limit, 
    serverTimestamp 
};

console.log("🚀 Firebase TaxiA-CIMCO cargado correctamente");