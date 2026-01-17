/**
 * TAXIA CIMCO - GESTOR DE CONEXIÓN MAESTRO
 * Sincronizado con Emuladores: Auth (9099), Firestore (8080), Storage (9199)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// 1. Importar credenciales
import { firebaseConfig } from './firebase-config.js'; 

// 2. Determinar entorno
const savedMode = localStorage.getItem('env_mode');
const isLocal = savedMode === 'local' || (savedMode === null && window.location.hostname === "localhost");

// 3. Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let isEmulatorMode = false;

// 4. Conexión a Emuladores (Ajustada según tus errores de consola)
if (isLocal) {
    try {
        // Forzamos el uso de 127.0.0.1 para evitar problemas de resolución de 'localhost' en Chrome
        connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
        connectFirestoreEmulator(db, "127.0.0.1", 8080);
        connectStorageEmulator(storage, "127.0.0.1", 9199);
        
        isEmulatorMode = true;
        console.warn("🚀 [SISTEMA] Conectado exitosamente a Emuladores locales (Puerto 8080)");
    } catch (err) {
        console.error("❌ [SISTEMA] Error al vincular emuladores:", err.message);
    }
}

// 5. Exportación Global para compatibilidad con tus archivos .html y .js
window.firebaseApp = app;
window.auth = auth;
window.db = db;
window.storage = storage;
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseIsEmulator = isEmulatorMode;

export { app, auth, db, storage, isEmulatorMode };