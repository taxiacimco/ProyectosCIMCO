/**
 * frontend/src/api/axiosConfig.js
 * Configuración centralizada de Axios para TAXIA CIMCO.
 * Incluye Interceptor de Firebase Auth para seguridad con Spring Boot.
 */
import axios from "axios";
import { getAuth } from "firebase/auth";

// 🔍 Verificamos si estamos en entorno local
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

/**
 * ✅ CONFIGURACIÓN DE BASE URL
 * Local: Incluye la doble 'api/api' detectada en la cadena de mando.
 * Producción: Apunta a la URL de Cloud Functions o tu Backend en Java.
 */
const API_BASE_URL = isLocal 
  ? "http://localhost:5001/pelagic-chalice-467818-e1/us-central1/api/api" 
  : (import.meta.env.VITE_API_BASE_URL || "https://us-central1-pelagic-chalice-467818-e1.cloudfunctions.net/api/api");

// ⚡ Creación de la instancia
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Vital para el manejo de sesiones y cookies
  timeout: 15000,
});

// 🛡️ Interceptor de salida: Inyecta el Firebase ID Token dinámicamente
api.interceptors.request.use(
  async (config) => {
    // 🔑 Obtenemos la instancia de autenticación de Firebase
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      try {
        /**
         * getIdToken(true) fuerza el refresco si está cerca de expirar.
         * Esto es lo que recibirá tu SecurityConfig.java en el backend.
         */
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        
        if (import.meta.env.DEV) {
          console.log("🔑 [AUTH] Token de Firebase inyectado correctamente.");
        }
      } catch (error) {
        console.error("🚨 [AUTH] Error al obtener el Token de Firebase:", error);
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn("⚠️ [AUTH] No hay usuario autenticado. La petición viajará sin token.");
      }
    }

    if (import.meta.env.DEV) {
      console.log(`🚀 [TAXIA API] Llamando: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 📥 Interceptor de entrada: Centraliza la gestión de respuestas y errores
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ [TAXIA API] Respuesta de: ${response.config.url}`, response.data);
    }
    // Retornamos directamente .data para simplificar los componentes
    return response.data; 
  },
  (error) => {
    // Manejo de errores de autenticación (401 o 403)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error("🚫 [AUTH] Error de permisos. El token es inválido o expiró.");
      // Aquí podrías redirigir al login si fuera necesario: window.location.href = '/login';
    }

    if (import.meta.env.DEV) {
      if (!error.response) {
        console.error("🚨 [TAXIA API] Error de Red/CORS. ¡Revisa que los Emuladores o el Backend estén encendidos!");
      } else {
        console.error(`❌ [TAXIA API Error ${error.response.status}]`, error.response.data);
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;