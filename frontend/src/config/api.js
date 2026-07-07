// Versión Arquitectura: V11.9.2 - Resolución Estricta con Soporte de Retrocompatibilidad de Rutas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\api.js
 * Misión: Centralización de Axios e inyección de puente de compatibilidad API_CORE_URL para componentes hijos.
 */

import axios from 'axios';

// 🔌 CONFIGURACIÓN ESTRICTA DEL NODO CENTRAL (Apunta directamente al puerto 3000)
export const HOST_IP = import.meta.env.VITE_HOST_IP || '192.168.100.34';
export const API_CORE_LOCAL = `http://${HOST_IP}:3000/api`;

// 🚀 PUENTE DE RETROCOMPATIBILIDAD EXTERNA (Requerido por PerfilPasajero.jsx y otros componentes)
// Retorna la URL base dinámica resuelta para que los componentes que usen fetch no queden en el aire.
export const API_CORE_URL = import.meta.env.VITE_API_BASE_URL || API_CORE_LOCAL;

// 🔍 RESOLUCIÓN DINÁMICA DEL ID DE PROYECTO (Cloud Functions)
const PROJ_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pelagic-chalice-467818-e1';
export const API_FUNCTIONS_URL = `http://${HOST_IP}:5001/${PROJ_ID}/us-central1`;

// 🔍 RESOLUCIÓN DINÁMICA DE LA URL BASE DE LA API PARA AXIOS
const DETERMINAR_URL_BASE = () => {
    try {
        if (import.meta.env.VITE_API_BASE_URL) {
            return import.meta.env.VITE_API_BASE_URL;
        }
        return API_CORE_LOCAL;
    } catch (e) {
        console.error('🚨 [CIMCO-NEXUS-RESOLUTION] Fallo en análisis perimetral de red:', e);
        return API_CORE_LOCAL;
    }
};

export const api = axios.create({
    baseURL: DETERMINAR_URL_BASE(),
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

// 🛡️ INTERCEPTOR DE PETICIONES: INYECCIÓN DE FIRMA JWT
api.interceptors.request.use(
    (config) => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const token = localStorage.getItem('token') || localStorage.getItem('cimco_token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
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

// 🛡️ INTERCEPTOR DE RESPUESTAS: PERSISTENCIA AUTOMÁTICA
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
                    localStorage.setItem('user', JSON.stringify(payload.usuario));
                } else if (payload.user) {
                    localStorage.setItem('user', JSON.stringify(payload.user));
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
                localStorage.removeItem('user');
            }
        } else if (error && error.request) {
            console.error('🚨 [CIMCO-NEXUS-NETWORK] Sin respuesta del nodo central. Verifique que el Backend (Puerto 3000) esté encendido.');
        } else {
            console.error('🚨 [CIMCO-NEXUS-FATAL] Quiebre estructural en la transmisión HTTP.');
        }
        return Promise.reject(error);
    }
);

// 📡 GOBERNANZA DE ENDPOINTS
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
    historial: '/viajes/historial'
};

export default api;