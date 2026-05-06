// Versión Arquitectura: V9.0 - Refactor de Sincronización Backend
/**
 * frontend/src/api/authService.js
 * Sincronización de sesión y validación de Custom Claims.
 * ARQUITECTURA: Capa de Infraestructura (Adaptador de Red)
 */

import api from './axiosConfig';

// Configuración de entorno
const isDevelopment = 
  window.location.hostname === "localhost" || 
  window.location.hostname.startsWith("192.168."); 

/**
 * Sincroniza el usuario autenticado con el servidor de TAXIA CIMCO.
 */
export const syncUserWithBackend = async (idToken) => {
  if (!idToken) {
    console.error("❌ [AuthService] idToken inexistente.");
    return null;
  }

  try {
    const data = await api.post('/auth/login', { idToken });
    console.log("✅ [CIMCO-API] Backend validado correctamente.");
    return data;
  } catch (error) {
    // Mantenemos Lógica de Resiliencia para Carlos Fuentes (Desarrollo)
    if (isDevelopment) {
      console.warn("⚠️ [CIMCO-DEV] Servidor local offline. Activando Bypass para pruebas de UI...");
      return { 
        success: true, 
        mock: true,
        user: { role: 'admin', displayName: 'Carlos (DevMode)' } 
      };
    }
    
    console.error("❌ [CIMCO-API] Fallo crítico de autenticación:", error.message);
    throw error;
  }
};