// Versión Arquitectura: V16.0 - Inyección Transparente JWT y Mapeo Dinámico de Tokens Anti-401
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\api.js
 * Misión: Centralización de Axios, inyección de cabeceras anti-caché e interceptores JWT con resiliencia.
 */

import axios from 'axios';

// 🔌 RESOLUCIÓN ESTRICTA DE LA IP DE RED (ÚNICA FUENTE DE VERDAD GLOBAL)
export const HOST_IP = import.meta.env.VITE_HOST_IP || '127.0.0.1';

const DETERMINAR_URL_BASE = () => {
    // 1. Prioridad Absoluta: Variable unificada desde .env / build
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // 2. Fallback Seguro para Desarrollo Local
    return `http://${HOST_IP}:3000/api`;
};

export const API_CORE_URL = DETERMINAR_URL_BASE();

// 🔍 RESOLUCIÓN DE CLOUD FUNCTIONS COMPATIBLE CON PRODUCCIÓN TLS
const PROJ_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pelagic-chalice-467818-e1';
export const API_FUNCTIONS_URL = import.meta.env.PROD 
    ? import.meta.env.VITE_API_FUNCTIONS_URL || `https://api-tx.taxiacimco.com/api/v1`
    : `http://${HOST_IP}:5001/${PROJ_ID}/us-central1`;

export const api = axios.create({
    baseURL: API_CORE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    },
    withCredentials: true
});

// 🛡️ INTERCEPTOR DE PETICIONES: INYECCIÓN MULTI-CAPA DE FIRMA JWT (CIMCO-GUARD)
api.interceptors.request.use(
    (config) => {
        try {
            config.headers = config.headers || {};

            if (typeof window !== 'undefined' && window.localStorage) {
                // 1. Búsqueda primaria de token en almacenamiento
                let token = localStorage.getItem('cimco_token') || localStorage.getItem('token');

                // 2. Fallback de resiliencia: Extracción desde objeto de usuario persistido
                if (!token) {
                    const storedUser = localStorage.getItem('cimco_user');
                    if (storedUser) {
                        try {
                            const parsedUser = JSON.parse(storedUser);
                            token = parsedUser?.token || parsedUser?.accessToken || parsedUser?.stsTokenManager?.accessToken || null;
                        } catch (parseErr) {
                            // Ignorar error de parseo y continuar
                        }
                    }
                }

                // 3. Sanitización e inyección estandarizada en cabecera HTTP
                if (token) {
                    const cleanToken = String(token).replace(/^"|"$/g, '').trim();
                    if (cleanToken) {
                        config.headers['Authorization'] = `Bearer ${cleanToken}`;
                    }
                }
            }
            return config;
        } catch (error) {
            console.error('🚨 [CIMCO-NEXUS-REQ] Fallo al inyectar firma JWT:', error);
            return config;
        }
    },
    (error) => Promise.reject(error)
);

// 🛡️ INTERCEPTOR DE RESPUESTAS: PERSISTENCIA SÍNCRONA Y AUTO-CLEANUP
api.interceptors.response.use(
    (response) => {
        try {
            if (response && response.data) {
                const payload = response.data;
                if (payload.token) {
                    localStorage.setItem('token', payload.token);
                    localStorage.setItem('cimco_token', payload.token);
                }
                if (payload.usuario) {
                    localStorage.setItem('cimco_user', JSON.stringify(payload.usuario));
                } else if (payload.user) {
                    localStorage.setItem('cimco_user', JSON.stringify(payload.user));
                }
            }
        } catch (storageError) {
            console.error('🚨 [CIMCO-NEXUS-STORAGE] Error de escritura en almacenamiento local:', storageError);
        }
        return response;
    },
    (error) => {
        if (error && error.response) {
            console.error(`🚨 [CIMCO-NEXUS-RESPONSE] Error de Servidor [${error.response.status}]:`, error.response.data);
            
            if (error.response.status === 401 || error.response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('cimco_token');
                localStorage.removeItem('cimco_user');
            }
        } else if (error && error.request) {
            console.error('🚨 [CIMCO-NEXUS-NETWORK] Sin respuesta del nodo central. Verifique conectividad o estado del Backend.');
        } else {
            console.error('🚨 [CIMCO-NEXUS-FATAL] Quiebre estructural en la transmisión HTTP.');
        }
        return Promise.reject(error);
    }
);

// 📡 GOBERNANZA DE ENDPOINTS CENTRALIZADOS
export const AUTH_ENDPOINTS = {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    me: '/auth/me',
    verificar: '/auth/verificar'
};

export const VIAJES_ENDPOINTS = {
    solicitar: '/viajes/solicitar',
    aceptar: '/viajes/aceptar',
    completar: '/viajes/completar',
    despachar: '/viajes/despachar',
    cancelar: '/viajes/cancelar',
    historial: '/viajes/historial',
    despachador: '/viajes/despachador'
};

export default api;