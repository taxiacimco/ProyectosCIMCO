// firebase-mode-manager-ceo.js - Utilidades para gestionar y alternar entre modo PILOTO y PRODUCCIÓN
// Específico para el Panel de CEO/Administración.
// IMPORTANTE: Este script debe cargarse antes de cualquier 'firebase-loader-*.js' para establecer window.APP_ENV.

const STORAGE_KEY = 'ceoFirebaseMode';

/**
 * Obtiene el modo de Firebase actual ('prod' o 'piloto') desde localStorage.
 * Por defecto es 'prod'.
 * @returns {string} 'prod' o 'piloto'.
 */
export function getCurrentMode() {
    return localStorage.getItem(STORAGE_KEY) || 'prod';
}

/**
 * Establece el modo de Firebase en localStorage.
 * @param {string} mode - 'prod' o 'piloto'.
 */
export function setFirebaseMode(mode) {
    const validModes = ['prod', 'piloto'];
    if (validModes.includes(mode.toLowerCase())) {
        localStorage.setItem(STORAGE_KEY, mode.toLowerCase());
        console.log(`[Manager CEO] Modo establecido a: ${mode.toUpperCase()}`);
    } else {
        localStorage.setItem(STORAGE_KEY, 'prod');
    }
}

/**
 * Alterna entre los modos 'prod' y 'piloto' y recarga la página para que el loader
 * de Firebase aplique el nuevo entorno (emuladores vs. producción).
 */
export function toggleFirebaseMode() {
    const currentMode = getCurrentMode();
    const newMode = currentMode === 'prod' ? 'piloto' : 'prod';
    setFirebaseMode(newMode);
    
    // Mensaje de recarga sin usar alert()
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 bg-slate-900/90 flex items-center justify-center z-[100]";
    modal.innerHTML = `
        <div class="bg-slate-800 p-6 rounded-lg shadow-xl border border-cyan-500 text-center">
            <p class="text-white text-lg font-semibold mb-3">Cambiando a modo ${newMode.toUpperCase()}. Recargando...</p>
            <div class="h-6 w-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto"></div>
        </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => {
        window.location.reload();
    }, 1500);
}

/**
 * Establece window.APP_ENV antes de cargar los loaders de Firebase y espera a que
 * las instancias globales (auth, db) estén disponibles.
 * @returns {Promise<{auth: firebaseAuth, db: firebaseDb}>} Instancias de Firebase.
 */
export async function loadFirebaseEnvironment() {
    // 1. Establecer la variable de entorno global.
    window.APP_ENV = getCurrentMode();
    
    // 2. Esperar a que el loader (cargado en el HTML) inicialice las instancias globales.
    let attempts = 0;
    const maxAttempts = 50; 
    const delay = 100; 

    while ((!window.firebaseAuth || !window.firebaseDb) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;
    }

    if (!window.firebaseAuth || !window.firebaseDb) {
        console.error("[Manager CEO] Error: Las instancias de Firebase (auth/db) no se cargaron correctamente.");
    }
    
    // 3. Devolver las instancias globales
    return { 
        auth: window.firebaseAuth, 
        db: window.firebaseDb 
    };
}