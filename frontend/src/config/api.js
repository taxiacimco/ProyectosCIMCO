// Versión Arquitectura: V5.3 - Ajuste de Puerto Homologado Express a Puerto 3000
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\api.js
 * Misión: Configurar el cliente Axios centralizado (CIMCO-NEXUS) para peticiones perimetrales al backend.
 * Ajuste: Sincronización exacta con el puerto 3000 según reporte de telemetría de consola industrial.
 */

import axios from 'axios';

// 📡 [CIMCO-NEXUS] Canal Único activado para la infraestructura del clúster
// Ajustado al puerto 3000 de acuerdo al despliegue real del backend Express
const API_URL = "http://localhost:3000/api"; 

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000, // 🛡️ Guarda de Seguridad: Rompe peticiones colgadas tras 15 segundos
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true // Habilita el transporte seguro de cookies de sesión si el backend lo requiere
});

// 🔄 INTERCEPTOR PERIMETRAL DE SALIDA: Inyección automática de firmas digitales JWT
api.interceptors.request.use(
    (config) => {
        // 🛡️ Guarda de Seguridad Anti-Undefined: Validación de acceso al localStorage local
        try {
            const token = localStorage.getItem('token');
            if (token) {
                // Inyecta el token sanitizado bajo el estándar Bearer en la cabecera de la petición
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (storageError) {
            console.error("⚠️ [CIMCO-NEXUS-STORAGE] Error al leer el token del ecosistema local:", storageError);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 🔍 INTERCEPTOR DE ENTRADA: Diagnóstico de Errores Críticos y Caídas de Sesión
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Guarda global de auditoría en consola de desarrollo
        if (error.response) {
            console.error(`🚨 [CIMCO-NEXUS-RESPONSE] Error de Servidor [${error.response.status}]:`, error.response.data);
            
            if (error.response.status === 401) {
                console.warn("🔒 [CIMCO-SEGURIDAD] Token inválido o expirado. Se sugiere redirección a Consola de Acceso.");
            }
        } else if (error.request) {
            console.error("🚨 [CIMCO-NEXUS-TIMEOUT] El servidor Express no responde. Verifique el estado del nodo de backend.");
        } else {
            console.error("🚨 [CIMCO-NEXUS-FATAL] Error de configuración en la trama de red:", error.message);
        }
        return Promise.reject(error);
    }
);

export default api;