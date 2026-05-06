// Versión Arquitectura: V9.1 - Detección Dinámica de Red (CIMCO Smart Gateway)
/**
 * ARCHIVO: axiosConfig.js
 * Misión: Proveer un cliente HTTP que se adapte automáticamente al entorno de red (Local vs IP Fija).
 */

import axios from "axios";
import { getAuth } from "firebase/auth";

// 🌐 Lógica de Detección Dinámica para evitar errores de red en emuladores
const API_BASE_URL = window.location.hostname === "localhost" 
  ? "http://localhost:5001/pelagic-chalice-467818-e1/us-central1/api"
  : "http://192.168.100.34:5001/pelagic-chalice-467818-e1/us-central1/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  timeout: 15000, 
});

// Interceptor Quírurgico para Inyección de Bearer Token
api.interceptors.request.use(async (config) => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("🚨 [AXIOS] Error al obtener ID Token de Firebase.");
    }
  }
  return config;
}, (error) => Promise.reject(error));

export default api;