import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js'; // Importa la configuración unificada

// Inicializar la aplicación con la configuración seleccionada (PROD o PILOTO)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let isEmulatorMode = false;

// -----------------------------------------------------------------
// CONFIGURACIÓN DE EMULADORES (SOLO EN MODO PILOTO)
// -----------------------------------------------------------------
if (typeof ENTORNO_ACTIVO !== 'undefined' && ENTORNO_ACTIVO === 'PILOTO') {
    console.warn("*************************************************");
    console.warn("!!! MODO PILOTO (EMULADORES) ACTIVO !!!");
    console.warn("Conectando Firebase a: http://127.0.0.1:9099 (Auth) y http://127.0.0.1:8080 (Firestore)");
    console.warn("*************************************************");
    
    // Conectar a los emuladores
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    isEmulatorMode = true;
}

// -----------------------------------------------------------------
// EXPORTAR INSTANCIAS GLOBALES
// -----------------------------------------------------------------
window.app = app;
window.auth = auth;
window.db = db;
window.isEmulatorMode = isEmulatorMode;
window.ENTORNO_ACTIVO = ENTORNO_ACTIVO || 'PROD'; // Asegurar que sea global

console.log(`Firebase Loader finalizado. Entorno: ${window.ENTORNO_ACTIVO}`);

// Este archivo NO DEBE EXPORTAR NADA, solo poblar el objeto window.
// Para usarlo, simplemente se incluye con una etiqueta <script src="..."> en el HTML.
