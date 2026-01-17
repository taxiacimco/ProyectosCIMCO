// =================================================================
// ARCHIVO DE CONFIGURACIÓN UNIFICADA DE FIREBASE
// Contiene la configuración para entornos de Producción (PROD) y Piloto/Local (PILOTO).
// Usa el puerto 8080 para Firestore en modo PILOTO.
// =================================================================

// -----------------------------------------------------------------
// CONFIGURACIÓN DE PRODUCCIÓN (PROD) - APP PASAJERO
// Proyecto: pelagic-chalice-467818-e1
// -----------------------------------------------------------------
const FIREBASE_CONFIG_PROD = {
    apiKey: "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
    authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
    projectId: "pelagic-chalice-467818-e1",
    storageBucket: "pelagic-chalice-467818-e1.firebasestorage.app",
    messagingSenderId: "191106268804",
    appId: "1:191106268804:web:8b2aa9689abaa35c880cd1",
    measurementId: "G-CPWSCLGKP2"
};

// -----------------------------------------------------------------
// CONFIGURACIÓN DE PILOTO / DESARROLLO (DEV / EMULADOR)
// Apunta a la instancia local de Firebase (127.0.0.1)
// -----------------------------------------------------------------
const FIREBASE_CONFIG_PILOTO = {
    // Usamos las credenciales de PROD pero apuntamos a los emuladores
    apiKey: "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
    authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
    projectId: "pelagic-chalice-467818-e1",
    storageBucket: "pelagic-chalice-467818-e1.firebasestorage.app",
    messagingSenderId: "191106268804",
    appId: "1:191106268804:web:8b2aa9689abaa35c880cd1",
    measurementId: "G-CPWSCLGKP2"
    // Nota: Los emuladores se configurarán en firebase-loader.js
};


// -----------------------------------------------------------------
// DETERMINAR MODO DE ENTORNO
// La variable global 'ENTORNO_ACTIVO' debe ser definida en el HTML
// antes de cargar este script (e.g., 'PROD' o 'PILOTO').
// -----------------------------------------------------------------
let firebaseConfig;

// Verificar si estamos en PROD por defecto
if (typeof ENTORNO_ACTIVO === 'undefined' || ENTORNO_ACTIVO === 'PROD') {
    firebaseConfig = FIREBASE_CONFIG_PROD;
    console.log("Firebase: Usando configuración de PRODUCCIÓN.");
} else if (ENTORNO_ACTIVO === 'PILOTO') {
    firebaseConfig = FIREBASE_CONFIG_PILOTO;
    console.log("Firebase: Usando configuración de PILOTO (Emulador).");
} else {
    // Fallback seguro a PROD si el entorno es desconocido
    firebaseConfig = FIREBASE_CONFIG_PROD;
    console.warn("Firebase: ENTORNO_ACTIVO no definido o desconocido. Usando PROD por defecto.");
}

// Exportar la configuración seleccionada
export { firebaseConfig };