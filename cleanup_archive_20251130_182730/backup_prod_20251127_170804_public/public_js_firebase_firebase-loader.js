// firebase-loader.js - PRODUCCIÓN REAL (Generado por prod.ps1)

// Cargar módulos Firebase desde CDN oficial (Usando 11.6.1 para consistencia)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Importar configuración de producción
import { firebaseConfig } from './firebase-config.js'; 

// Inicializar la app de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// -----------------------------------------------------------------
// EXPORTAR INSTANCIAS GLOBALES (CRÍTICO para compatibilidad HTML)
// Se exponen en 'window' para que los scripts cargados posteriormente
// (p.ej., el pasajero-login.js) puedan acceder a ellas directamente.
// -----------------------------------------------------------------
window.app = app;
window.auth = auth;
window.db = db;
window.storage = storage; 
window.isEmulatorMode = false;
window.ENTORNO_ACTIVO = 'PROD';

console.log(`[Firebase Loader] Producción cargada correctamente. Entorno: ${window.ENTORNO_ACTIVO}`);
