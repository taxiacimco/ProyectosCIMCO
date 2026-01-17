// firebase-loader-admin.js

// Importamos los servicios de Firebase y la configuración del nuevo gestor modular.
// CRÍTICO: Asegúrate de que esta ruta sea correcta con respecto a este archivo.
import { firebaseAuth, firebaseDB } from './firebase-config-manager.mjs';

import { 
    signInAnonymously, 
    onAuthStateChanged, 
    signInWithCustomToken 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';

// Importaciones de Firestore
import { 
    setLogLevel
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Habilitar logs de depuración de Firestore (útil para desarrollo)
setLogLevel('debug');

// Exportamos los servicios ya inicializados
export const auth = firebaseAuth;
export const db = firebaseDB;
export let userId = null;

// ====================================================================
// FUNCIÓN CRÍTICA: AUTENTICACIÓN Y ESTABLECIMIENTO DEL USUARIO
// ====================================================================

/**
 * Inicializa la autenticación, esperando el token de inicio de sesión.
 * Exporta una Promesa que resuelve una vez que la autenticación está lista.
 */
export const authReadyPromise = new Promise(async (resolve) => {
    // 1. Obtener la referencia de autenticación
    const authInstance = firebaseAuth;

    // 2. Definir la lógica de cambio de estado de autenticación
    onAuthStateChanged(authInstance, (user) => {
        if (user) {
            // Usuario autenticado (con token personalizado o de forma anónima)
            userId = user.uid;
            console.log(`[Firebase Admin Loader] Usuario autenticado. UID: ${userId}`);
        } else {
            // Usuario desconectado
            userId = null;
            console.log("[Firebase Admin Loader] Usuario desconectado.");
            
            // NOTA: Aquí podrías añadir una redirección a la página de login
            // si un usuario no autorizado intenta acceder a un panel de administración.
        }
        
        // Resolvemos la promesa una vez que el estado inicial se ha cargado.
        resolve(authInstance);
    });

    // 3. Lógica de inicio de sesión inicial (usando token si está disponible)
    try {
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (initialAuthToken) {
            // Si hay un token personalizado (ambiente Canvas), úsalo
            await signInWithCustomToken(authInstance, initialAuthToken);
            console.log("[Firebase Admin Loader] Sesión iniciada con token personalizado.");
        } else {
            // Si no hay token, inicia sesión anónimamente (para desarrollo local)
            await signInAnonymously(authInstance);
            console.log("[Firebase Admin Loader] Sesión iniciada anónimamente.");
        }
    } catch (error) {
        console.error("[Firebase Admin Loader] Error al iniciar sesión:", error);
    }
});