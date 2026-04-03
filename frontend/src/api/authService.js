/**
 * frontend/src/api/authService.js
 * Sincronización de sesión usando la instancia centralizada de Axios.
 * ARQUITECTURA: TAXIA CIMCO - Integración Quirúrgica V3
 */
import api from './axiosConfig';

// Detectamos si estamos en red local o localhost para activar herramientas de dev
const isDevelopment = 
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1" || 
  window.location.hostname.startsWith("192.168."); 

/**
 * ✅ Sincroniza el usuario con el Backend de TAXIA CIMCO.
 */
export const syncUserWithBackend = async (idToken) => {
  if (!idToken) {
    console.error("❌ [AuthService] No se proporcionó un idToken.");
    return null;
  }

  try {
    // Intento de conexión al Backend Real
    const data = await api.post('/auth/login', { idToken });
    console.log("✅ [CIMCO] Backend sincronizado con éxito.");
    return data;

  } catch (error) {
    // LÓGICA DE RESILIENCIA PARA CARLOS (Modo Desarrollo en Red Local)
    if (isDevelopment || import.meta.env.DEV) {
      console.warn("⚠️ [CIMCO DEV] Error de API (Backend posiblemente apagado o IP bloqueada). Activando Bypass...");
      
      return { 
        success: true, 
        message: "Bypass activado para pruebas en red local",
        user: { 
          role: 'conductor', 
          status: 'active', 
          uid: 'dev-id-001',
          displayName: 'Carlos Fuentes (Dev)',
          email: 'admin@taxiacimco.com',
          saldo: 50000 
        } 
      };
    }

    console.error("❌ [CIMCO] Error crítico de autenticación:", error.response?.data || error.message);
    throw error;
  }
};

export const logoutFromBackend = async () => {
  try {
    return await api.post('/auth/logout');
  } catch (error) {
    console.warn("⚠️ [AuthService] No se pudo notificar el logout al servidor.");
  }
};

export default { syncUserWithBackend, logoutFromBackend };