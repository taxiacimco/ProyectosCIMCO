import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// ====================================================================
// PASO 1: DEFINICIÓN DE CONFIGURACIONES POR ENTORNO
// ====================================================================

// --- CONFIGURACIÓN DE PRODUCCIÓN (PROD) ---
// Proyecto: pelagic-chalice-467818-e1 (Tu proyecto principal de Taxia)
const PROD_CONFIG = {
    // Valores originales del entorno de Producción
    apiKey: "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
    authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
    projectId: "pelagic-chalice-467818-e1",
    storageBucket: "pelagic-chalice-467818-e1.firebasestorage.app",
    messagingSenderId: "191106268804",
    appId: "1:191106268804:web:8b2aa9689abaa35c880cd1",
    measurementId: "G-CPWSCLGKP2"
};

// --- CONFIGURACIÓN DE DESARROLLO/PRUEBAS (DEV/TEST) ---
// Proyecto: pelagic-chalice-467818-e1-test (Tu proyecto de pruebas)
// ¡VALORES CONFIGURADOS CORRECTAMENTE POR EL USUARIO!
const DEV_CONFIG = {
    apiKey: "AIzaSyDl3czwpd9Kwewzlg3w2bEMQSKt-qxZzhk",
    authDomain: "pelagic-chalice-467818-e1-test.firebaseapp.com",
    projectId: "pelagic-chalice-467818-e1-test",
    storageBucket: "pelagic-chalice-467818-e1-test.firebasestorage.app",
    messagingSenderId: "455172635189",
    appId: "1:455172635189:web:2bb702fb36b785988b0f7c"
};


// ====================================================================
// PASO 2: LÓGICA DE INICIALIZACIÓN CENTRALIZADA
// ====================================================================

/**
 * Función central para obtener la configuración y los servicios de Firebase.
 * Determina qué configuración usar basándose en la variable global APP_ENV, 
 * que debe ser inyectada en el HTML.
 */
function getFirebaseServices() {
    // Lee APP_ENV, el valor por defecto es 'dev' si no está definido
    const environment = typeof window.APP_ENV !== 'undefined' ? window.APP_ENV : 'dev'; 

    const config = (environment === 'prod') ? PROD_CONFIG : DEV_CONFIG;

    console.log(`[Firebase Manager] Inicializando en modo: ${environment}`);
    console.log(`[Firebase Manager] Proyecto ID: ${config.projectId}`);
    
    // Verificación de API Key no válida
    if (config.apiKey.length < 20) {
         console.error(`[Firebase Manager] ERROR CRÍTICO: La API Key para el entorno '${environment}' parece ser incompleta o incorrecta.`);
         document.body.innerHTML = `<div style="padding: 20px; background: #fee; border: 1px solid #f00; color: #333; font-family: sans-serif;">
            <p><strong>Error Crítico de Conexión:</strong> La clave API para el modo <strong>${environment}</strong> parece ser inválida.</p>
            <p>Revise el valor de 'apiKey' en el archivo 'firebase-config-manager.mjs'.</p>
        </div>`;
        throw new Error("Fallo en la inicialización de Firebase por API Key incorrecta.");
    }


    try {
        // Inicializar la aplicación con el objeto de configuración correcto
        const app = initializeApp(config);

        // Inicializar servicios comunes
        const auth = getAuth(app);
        const db = getFirestore(app);

        return {
            app: app,
            auth: auth,
            db: db,
            config: config
        };
    } catch (error) {
        console.error("Error al inicializar Firebase. Revise las credenciales y el estado del entorno:", error);
        // Muestra un mensaje de error visible si la inicialización falla
        document.body.innerHTML = `<div style="padding: 20px; background: #fee; border: 1px solid #f00; color: #333; font-family: sans-serif;">
            <p><strong>Error Crítico de Conexión:</strong> No se pudo conectar a Firebase en el modo <strong>${environment}</strong>.</p>
            <p>Revise el error en la consola para más detalles.</p>
        </div>`;
        // Detiene el resto de los scripts si falla
        throw new Error("Fallo en la inicialización de Firebase."); 
    }
}

// Inicializamos los servicios una única vez
const services = getFirebaseServices();

// Exportamos los objetos para que los 'loaders' puedan importarlos y usarlos
export const firebaseApp = services.app;
export const firebaseAuth = services.auth;
export const firebaseDB = services.db;
export const currentConfig = services.config;