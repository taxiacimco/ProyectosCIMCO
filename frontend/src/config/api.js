// Versión Arquitectura: V5.3 - Fusión Atómica: Homologación de Bus de Tokens y Redirección Local Indexada
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\api.js
 * Misión: Proveer el punto único de verdad para conexiones HTTP, telemetría de red y sincronización IP.
 * Resolución: Preserva las constantes nominales nativas (HOST_IP, API_URL, API_CORE_URL) requeridas por
 * los paneles de control, aplicando un fallback de seguridad para el bus de tokens ('token').
 */

import axios from 'axios';

// 📡 DECLARACIÓN DE VARIABLES DE ENTORNO OPERATIVO (Named Exports Sincronizados)
export const HOST_IP = '192.168.100.34'; // IP de red local activa en La Jagua de Ibirico
export const API_FUNCTIONS_URL = `http://${HOST_IP}:5000`; // Nodo Backend Central (Puertos de procesamiento)
export const API_CORE_URL = `http://${HOST_IP}:3000`;      // Fallback Core de datos en producción local

// 🛡️ API_URL UNIFICADA: Apuntando al módulo de conductores según dictamen de infraestructura original
export const API_URL = `${API_FUNCTIONS_URL}/api/conductores`;

console.log(`📡 [CIMCO-NEXUS] Enrutamiento de red unificado en:`, { API_CORE_URL, API_URL, API_FUNCTIONS_URL });

// 🛡️ CREACIÓN DE LA INSTANCIA AXIOS COMPILADA (Default Export)
const api = axios.create({
  baseURL: API_CORE_URL, // Se mantiene apuntando a la base Core para preservar Login.jsx (api.post('/login'))
  timeout: 15000,        // Timeout industrial de 15s para evitar colapsos de red
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔒 INTERCEPTOR DE SEGURIDAD OPERATIVA: Inyecta el JWT conservando el bus unificado
api.interceptors.request.use(
  (config) => {
    // 🛡️ GUARDA DE SEGURIDAD (Anti-Undefined): Doble verificación matricial de claves de sesión
    // Sincroniza tanto 'token' (Login.jsx/useAuth.jsx) como el fallback 'cimco_token'
    const token = localStorage.getItem('token') || localStorage.getItem('cimco_token');
    
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("❌ [CIMCO-NEXUS-ERROR] Fallo de red pre-petición:", error);
    return Promise.reject(error);
  }
);

export default api;