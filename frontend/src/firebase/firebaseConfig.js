import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCm0Gb8KxhgnHe3W5P8p8hAn68VfuvvTs",
  authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
  projectId: "pelagic-chalice-467818-e1",
  storageBucket: "pelagic-chalice-467818-e1.firebasestorage.app",
  messagingSenderId: "191455248884",
  appId: "1:191455248884:web:beec361b7e7ab77ed5b60d",
  measurementId: "G-HT5L0XG5CH"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ DETECCIÓN DE ENTORNO PROFESIONAL
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

if (isLocal) {
  console.warn("🚀 [CIMCO] Conectando a los Emuladores Locales de Firebase...");
  
  /**
   * NOTA: Usamos 'localhost' preferentemente para evitar conflictos de CORS 
   * con el motor de búsqueda del navegador.
   */
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
  connectStorageEmulator(storage, "localhost", 9199);
  
  // Guardamos en el objeto global para debugging si es necesario
  window.firebaseAuth = auth;
  window.firebaseDb = db;
}

// Exportaciones consistentes
export { auth, db, storage };
export default app;