// Versión Arquitectura: V24.2 - Servicio Centralizado de Autenticación con UpdateProfile Híbrido (CIMCO-AUTH-SERVICE)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\services\authService.js
 * Misión: Gestor central de peticiones de inicio de sesión, registro, actualización de perfil, verificación de token y cierre de sesión.
 */

import api, { AUTH_ENDPOINTS } from '@/config/api';

export const authService = {
    /**
     * Inicia sesión con credenciales (email/teléfono y contraseña)
     * @param {Object} credentials - { email, password }
     */
    async login(credentials) {
        if (!credentials || typeof credentials !== 'object') {
            throw new Error('Las credenciales de acceso son obligatorias.');
        }
        const response = await api.post(AUTH_ENDPOINTS.login, credentials);
        return response?.data || {};
    },

    /**
     * Registra un nuevo usuario en la plataforma
     * @param {Object} userData - Datos completos del usuario (JSON o FormData)
     */
    async register(userData) {
        if (!userData) {
            throw new Error('Los datos de registro son obligatorios.');
        }
        const response = await api.post(AUTH_ENDPOINTS.register, userData);
        return response?.data || {};
    },

    /**
     * Actualiza el perfil del usuario autenticado en la sesión activa.
     * Soporta envío de JSON o FormData (para fotos de perfil y documentos).
     * @param {FormData|Object} formDataOrObject - Objeto con atributos o instancia FormData
     */
    async updateProfile(formDataOrObject) {
        if (!formDataOrObject) {
            throw new Error('Los datos de actualización de perfil son obligatorios.');
        }

        const endpoint = AUTH_ENDPOINTS?.updateProfile || '/auth/update-profile';
        const isFormData = typeof FormData !== 'undefined' && formDataOrObject instanceof FormData;

        // Si es FormData, se delega a Axios el establecimiento automático del header multipart/form-data con su boundary
        const config = isFormData ? {
            headers: {
                'Content-Type': undefined
            }
        } : {};

        const response = await api.put(endpoint, formDataOrObject, config);
        return response?.data || {};
    },

    /**
     * Verifica la validez del token y obtiene el usuario autenticado actual
     */
    async verifySession() {
        const response = await api.get(AUTH_ENDPOINTS.verificar);
        return response?.data || {};
    },

    /**
     * Obtiene el perfil actualizado del usuario autenticado
     */
    async getProfile() {
        const response = await api.get(AUTH_ENDPOINTS.me);
        return response?.data || {};
    },

    /**
     * Cierra la sesión activa en el servidor y limpia almacenamiento local
     */
    async logout() {
        try {
            await api.post(AUTH_ENDPOINTS.logout);
        } catch (error) {
            console.warn('⚠️ [AUTH-SERVICE] Error al notificar cierre de sesión al backend:', error?.message || error);
        } finally {
            if (typeof window !== 'undefined' && window.localStorage) {
                try {
                    localStorage.removeItem('token');
                    localStorage.removeItem('cimco_token');
                    localStorage.removeItem('cimco_user');
                } catch (storageErr) {
                    console.error('🚨 [AUTH-SERVICE] Error al limpiar almacenamiento local:', storageErr);
                }
            }
        }
    }
};

export default authService;