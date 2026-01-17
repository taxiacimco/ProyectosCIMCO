// js/auth/login.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Configuración de Firebase ---
// Asegúrate de que esta configuración se carga correctamente desde tus utilidades
// o de que firebaseConfig está disponible globalmente.
const FIREBASE_CONFIG = {
    // Reemplazar con tu configuración real de Firebase
    apiKey: "YOUR_API_KEY", 
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    // ... otros campos
};

// Inicialización de la aplicación
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Elementos del DOM ---
const loginForm = document.getElementById('loginForm');
const emailOrPhoneInput = document.getElementById('emailOrPhone');
const passwordInput = document.getElementById('password');
const messageBox = document.getElementById('messageBox');
const loginButton = document.getElementById('loginButton');

// --- Mapas de Redirección por Rol (RBAC) ---
// Define a qué URL se redirigirá cada rol
const ROLE_REDIRECT_MAP = {
    'mototaxi': './mototaxi/mototaxi-panel.html',
    'motoparrillero': './motoparrillero/panel-parrillero.html',
    'motocarga': './motocarga/panel-motocarga.html',
    'intermunicipal': './interconductor/panel-interconductor.html', // Asumimos que el conductor intermunicipal también tiene un panel
    'despachador': './despachador/panel-despachador.html',
    'admin': './admin/ceo-dashboard.html',
    // Si el rol no está en el mapa, será dirigido a una página por defecto o a un error.
};

/**
 * Muestra un mensaje en la caja de estado.
 * @param {string} message El mensaje a mostrar.
 * @param {string} type Tipo de mensaje ('success', 'error', 'info').
 */
function displayMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = 'text-center p-3 rounded-lg mt-4';
    
    switch (type) {
        case 'success':
            messageBox.classList.add('bg-green-100', 'text-green-800');
            break;
        case 'error':
            messageBox.classList.add('bg-red-100', 'text-red-800');
            break;
        case 'info':
            messageBox.classList.add('bg-blue-100', 'text-blue-800');
            break;
        default:
            messageBox.classList.add('bg-gray-100', 'text-gray-800');
    }
    messageBox.classList.remove('hidden');
}

/**
 * Convierte el input (que puede ser teléfono) en un formato de email de Firebase Auth si es necesario.
 * @param {string} input El valor del campo de Teléfono/Email.
 * @returns {string} El email formateado.
 */
function formatInputToEmail(input) {
    // Si el input parece un email, lo usa directamente.
    if (input.includes('@')) {
        return input.trim();
    }
    // Si es un teléfono, usa el formato que definimos en el backend: [phone]@taxia-cimco.com
    return `${input.trim()}@taxia-cimco.com`;
}

/**
 * Procesa el inicio de sesión y maneja la redirección.
 */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginButton.disabled = true;
    displayMessage('Iniciando sesión...', 'info');

    const rawInput = emailOrPhoneInput.value;
    const email = formatInputToEmail(rawInput);
    const password = passwordInput.value;

    try {
        // 1. Iniciar sesión con Firebase Auth (usa email/contraseña)
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        displayMessage('Autenticación exitosa. Verificando estado de cuenta...', 'info');

        // 2. Obtener el perfil de Firestore para verificar el rol y la aprobación
        const driverProfileRef = doc(db, 'drivers', user.uid);
        const docSnap = await getDoc(driverProfileRef);

        if (!docSnap.exists()) {
            // Este caso es raro si el registro fue bien, pero es una buena práctica
            await auth.signOut();
            throw new Error('Perfil de conductor no encontrado. Contacte a soporte.');
        }

        const profile = docSnap.data();
        const role = profile.role;
        const approved = profile.approved;
        
        // 3. Verificar si el conductor ha sido aprobado
        if (!approved) {
            await auth.signOut(); // Cierra la sesión inmediatamente
            displayMessage('Cuenta pendiente de aprobación por el administrador.', 'error');
            return;
        }

        // 4. Redirección basada en el rol
        const redirectUrl = ROLE_REDIRECT_MAP[role];
        
        if (redirectUrl) {
            displayMessage(`Bienvenido, ${profile.fullName}. Redirigiendo a tu panel de ${role}...`, 'success');
            // Usar setTimeout para que el usuario vea el mensaje de éxito antes de redirigir
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
        } else {
            await auth.signOut();
            displayMessage(`Rol desconocido: ${role}. Contacte a soporte.`, 'error');
        }

    } catch (error) {
        let errorMessage = 'Error desconocido al iniciar sesión.';
        
        // Mapeo de errores comunes de Firebase Auth
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': // Error más genérico para credenciales inválidas
                errorMessage = 'Credenciales inválidas. Verifica tu teléfono/email y contraseña.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Demasiados intentos fallidos. Inténtalo de nuevo más tarde.';
                break;
            default:
                console.error("Firebase Auth Error:", error);
                errorMessage = `Error al iniciar sesión: ${error.message}.`;
        }
        
        displayMessage(errorMessage, 'error');

    } finally {
        loginButton.disabled = false;
    }
});