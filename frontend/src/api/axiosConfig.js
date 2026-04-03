/**
 * frontend/src/api/axiosConfig.js
 * ARQUITECTURA TAXIA CIMCO - Instancia de Axios Dinámica
 * Misión: Asegurar comunicación estable entre Celular y PC en Red Local.
 */
import axios from "axios";
import { getAuth } from "firebase/auth";

/**
 * 🌐 CONFIGURACIÓN DE URL BASE
 * Se prioriza la IP de red local (192.168.100.34) definida en el .env
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://192.168.100.34:5001/pelagic-chalice-467818-e1/us-central1/api";

console.log(`🚀 [CIMCO-NETWORK] Intentando conectar a: ${API_BASE_URL}`);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  // 30s es correcto, pero añadimos lógica de detección de latencia
  timeout: 30000, 
});

/**
 * 🛡️ INTERCEPTOR DE SALIDA (Request)
 * Inyecta el Token de Seguridad de Firebase en cada petición.
 */
api.interceptors.request.use(
  async (config) => {
    if (import.meta.env.DEV) {
      console.log(`📡 [OUT] ${config.method.toUpperCase()} -> ${config.url}`);
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      try {
        // Obtenemos el token fresco del usuario logueado
        const token = await user.getIdToken(false);
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error("🚨 [AUTH-ERROR] No se pudo obtener el Token para la petición.");
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 📥 INTERCEPTOR DE ENTRADA (Response)
 * Manejo de errores adaptado para depuración en dispositivos móviles.
 */
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error("⌛ [TIMEOUT] La conexión tardó demasiado. Revisa si tu PC y Celular están en la misma red.");
    }

    if (error.response) {
      const { status } = error.response;
      // Mapeo de errores de seguridad de TAXIA CIMCO
      const errorMap = {
        401: "🚫 Sesión expirada o Token inválido.",
        403: "🚫 No tienes permisos de Conductor/Admin.",
        404: "❓ El servicio solicitado no existe en el backend.",
        500: "🔥 Error crítico en el servidor local."
      };
      console.error(errorMap[status] || `🚨 Error ${status}: Fallo en la comunicación.`);
    } else if (error.request) {
      // Este es el error más común en Wi-Fi
      console.error("🌐 [RED] Imposible conectar con el Backend. Verifica que el firewall de tu PC permita el puerto 5001.");
    }

    return Promise.reject(error);
  }
);

export default api;