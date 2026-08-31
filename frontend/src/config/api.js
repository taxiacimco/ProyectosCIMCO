// Versión Arquitectura: V24.9 - Consumo Dinámico de VITE_API_URL e Interceptor JWT Blindado
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\api.js
 * Misión: Centralización de Axios, consumo de VITE_API_URL, inyección de cabeceras anti-caché, interceptores JWT multi-capa, gestión de FormData y manejo global de errores HTTP.
 */

import axios from 'axios';

// 🔌 RESOLUCIÓN ESTRICTA DE LA IP DE RED (ÚNICA FUENTE DE VERDAD GLOBAL)
export const HOST_IP = import.meta.env?.VITE_HOST_IP || '127.0.0.1';

const DETERMINAR_URL_BASE = () => {
    // 1. Prioridad Absoluta: Variable unificada desde .env / build con blindaje anti-undefined
    const envApiUrl = import.meta.env?.VITE_API_URL;
    if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim() !== '') {
        const cleanEnvUrl = envApiUrl.trim().replace(/\/+$/, '');
        if (cleanEnvUrl.endsWith('/api')) {
            return cleanEnvUrl;
        }
        return `${cleanEnvUrl}/api`;
    }
    // 2. Fallback Dinámico Seguro para Desarrollo Local
    return `http://${HOST_IP}:3000/api`;
};

export const API_CORE_URL = DETERMINAR_URL_BASE();

// 🔍 RESOLUCIÓN DE CLOUD FUNCTIONS COMPATIBLE CON PRODUCCIÓN TLS
const PROJ_ID = import.meta.env?.VITE_FIREBASE_PROJECT_ID || 'pelagic-chalice-467818-e1';
export const API_FUNCTIONS_URL = import.meta.env?.PROD 
    ? (import.meta.env?.VITE_API_FUNCTIONS_URL || `https://api-tx.taxiacimco.com/api/v1`)
    : `http://${HOST_IP}:5001/${PROJ_ID}/us-central1`;

export const api = axios.create({
    baseURL: API_CORE_URL || `http://${HOST_IP}:3000/api`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    },
    withCredentials: true
});

// 🛡️ INTERCEPTOR DE PETICIONES: INYECCIÓN MULTI-CAPA DE FIRMA JWT Y SOPORTE FORMDATA (CIMCO-GUARD)
api.interceptors.request.use(
    (config) => {
        try {
            config.headers = config.headers || {};

            // 📂 SOPORTE FORMDATA: Si el payload es un FormData, liberamos el Content-Type por defecto
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }

            if (typeof window !== 'undefined' && window.localStorage) {
                // 1. Búsqueda primaria de token dinámico en almacenamiento (cimco_token o token)
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

// 🛡️ INTERCEPTOR DE RESPUESTAS: PERSISTENCIA SÍNCRONA, PURGA DE SESIÓN Y MANEJO GLOBAL DE ERRORES (401, 429, 500)
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
    async (error) => {
        if (error && error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || 'Error en la solicitud al servidor';
            const requestUrl = error.config?.url || '';

            console.error(`🚨 [CIMCO-NEXUS-RESPONSE] Error de Servidor [${status}] en [${requestUrl}]:`, error.response.data);

            // Lista de endpoints secundarios opcionales cuyos errores 401/403 no deben expulsar al usuario
            const ENDPOINTS_SECUNDARIOS_OPCIONALES = [
                '/pasajeros/saldo',
                '/billetera/saldo',
                '/saldo'
            ];

            const esEndpointOpcional = ENDPOINTS_SECUNDARIOS_OPCIONALES.some(endpoint => requestUrl.includes(endpoint));

            // 401 / 403: No Autorizado / Prohibido - Expiración o invalidez de credenciales
            if ((status === 401 || status === 403) && !esEndpointOpcional) {
                try {
                    if (typeof window !== 'undefined' && window.localStorage) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('cimco_token');
                        localStorage.removeItem('cimco_user');
                    }

                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('cimco:auth_expired', { 
                            detail: { 
                                status, 
                                message: error.response.data?.message || 'Sesión expirada o desincronizada' 
                            } 
                        }));

                        if (window.location.pathname !== '/login') {
                            window.location.href = '/login';
                        }
                    }
                } catch (cleanupErr) {
                    console.error('🚨 [CIMCO-NEXUS-AUTH-CLEANUP] Error durante purga de credenciales:', cleanupErr);
                }
            }

            // 429: Demasiadas Peticiones (Rate Limit Exceeded)
            if (status === 429) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('cimco:rate_limit', {
                        detail: { status, message: message || 'Exceso de solicitudes al servidor. Por favor, espere un momento.' }
                    }));
                }
            }

            // 500 / 502 / 503 / 504: Alertas de Servidor / Fallo Interno
            if (status >= 500) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('cimco:server_error', {
                        detail: { status, message: message || 'Error interno en el servidor central. Intente más tarde.' }
                    }));
                }
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