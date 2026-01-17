// Archivo: public/js/auth-guard.js
import { auth } from "./firebase/firebase-loader.js";
import { onAuthStateChanged, signOut } from "./firebase/firebase-loader.js";

/**
 * 🛠️ CONFIGURACIÓN DE RUTAS POR ROL
 * Mapeo exacto basado en la estructura de carpetas de TAXIA CIMCO
 */
const ROLE_REDIRECT_MAP = {
    'pasajero': '/pasajero/panel-pasajero.html',
    'mototaxi': '/mototaxi/mototaxi-panel.html',
    'motoparrillero': '/motoparrillero/panel-parrillero.html',
    'motocarga': '/motocarga/panel-motocarga.html',
    'interconductor': '/interconductor/panel-interconductor.html',
    'despachador': '/despachador/panel-despachador.html',
    'admin': '/admin/ceo-panel.html',
    'ceo': '/admin/ceo-panel.html'
};

const LOGIN_PAGE = '/login.html';
const ERROR_PAGE = '/404.html'; // Usamos tu 404 como fallback

/**
 * Verifica la identidad y el rol del usuario.
 * @param {string} requiredRole - El rol necesario para ver la página actual.
 */
export async function checkAuthAndRedirect(requiredRole) {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            
            // 1. SI NO HAY USUARIO
            if (!user) {
                console.log("🔒 Acceso denegado: Usuario no autenticado.");
                if (!window.location.pathname.includes(LOGIN_PAGE)) {
                    window.location.replace(LOGIN_PAGE);
                }
                return resolve(false);
            }

            try {
                // 2. OBTENER CLAIMS (Forzar refresco para asegurar que el rol esté actualizado)
                const idTokenResult = await user.getIdTokenResult(true);
                const userRole = (idTokenResult.claims.role || idTokenResult.claims.rolePrincipal || '').toLowerCase();

                // 3. EXPOSICIÓN GLOBAL (Para que tus otros JS consuman el rol)
                window.currentUser = {
                    uid: user.uid,
                    role: userRole,
                    email: user.email
                };

                // 4. LÓGICA DE REDIRECCIÓN SI ESTÁ EN LOGIN
                if (window.location.pathname.includes(LOGIN_PAGE)) {
                    if (userRole && ROLE_REDIRECT_MAP[userRole]) {
                        window.location.replace(ROLE_REDIRECT_MAP[userRole]);
                    }
                    return resolve(true);
                }

                // 5. VALIDACIÓN DE ROL REQUERIDO
                if (requiredRole === 'ANY') return resolve(true); // Para páginas compartidas

                if (userRole === requiredRole.toLowerCase()) {
                    console.log(`✅ Acceso concedido para rol: ${userRole}`);
                    return resolve(true);
                } else {
                    console.error(`🚫 Conflicto de roles. Usuario: ${userRole}, Requerido: ${requiredRole}`);
                    
                    // Si el usuario intenta entrar a un panel que no le pertenece,
                    // lo mandamos a su panel correcto automáticamente.
                    const correctPath = ROLE_REDIRECT_MAP[userRole] || LOGIN_PAGE;
                    window.location.replace(correctPath);
                    return resolve(false);
                }

            } catch (error) {
                console.error("❌ Error en la verificación de seguridad:", error);
                await signOut(auth);
                window.location.replace(LOGIN_PAGE);
                return resolve(false);
            }
        });
    });
}