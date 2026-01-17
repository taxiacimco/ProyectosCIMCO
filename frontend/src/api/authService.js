/**
 * frontend/src/api/authService.js
 * Sincronización de sesión usando la instancia centralizada de Axios.
 * Este servicio comunica el estado de Firebase con el Backend de TAXIA CIMCO.
 */
import api from './axiosConfig';

// Detección de entorno para el Bypass (Modo Desarrollo)
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

/**
 * ✅ Sincroniza el usuario con el Backend de TAXIA CIMCO.
 * @param {string} idToken - El ID Token obtenido de Firebase Auth.
 */
export const syncUserWithBackend = async (idToken) => {
  if (!idToken) {
    console.error("❌ [AuthService] No se proporcionó un idToken para la sincronización.");
    return null;
  }

  try {
    /**
     * 1. INTENTO DE CONEXIÓN REAL
     * Enviamos el token al endpoint de login/sync.
     * El interceptor de axiosConfig ya maneja la URL base y el retorno de data.
     */
    const data = await api.post('/auth/login', { idToken }, {
      // Refuerzo manual de cabecera para la sincronización inicial
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    console.log("✅ [CIMCO] Backend sincronizado con éxito.");
    return data;

  } catch (error) {
    /**
     * 2. LÓGICA DE RESILIENCIA (Bypass en Desarrollo)
     * Si el backend de Spring Boot no está corriendo o hay errores de red en local,
     * permitimos que el desarrollador siga trabajando.
     */
    if (isLocal) {
      console.warn("⚠️ [CIMCO DEV] Error de conexión con API (Posible Backend apagado). Activando Bypass...");
      
      // Simulamos una respuesta exitosa del servidor para desarrollo
      return { 
        success: true, 
        message: "Bypass activado",
        user: { 
          role: 'conductor', // Ajustado a conductor para las pruebas de Mototaxi
          status: 'active', 
          uid: 'dev-id-001',
          displayName: 'Usuario Demo (Modo Dev)',
          email: 'demo@cimco.com',
          saldo: 25000 
        } 
      };
    }

    // En producción (cuando el hostname no es localhost), el error es crítico.
    console.error("❌ [CIMCO] Error crítico de autenticación:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * ✅ Ejemplo: Cerrar sesión en el backend (si aplica)
 */
export const logoutFromBackend = async () => {
  try {
    return await api.post('/auth/logout');
  } catch (error) {
    console.warn("⚠️ [AuthService] No se pudo notificar el logout al servidor.");
  }
};

export default {
  syncUserWithBackend,
  logoutFromBackend
};