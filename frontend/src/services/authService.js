// Versión Arquitectura: V24.4 - Persistencia de Propiedad UID en Respuestas de Autenticación (CIMCO-AUTH-SERVICE)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\services\authService.js
 * Misión: Gestor central de peticiones de inicio de sesión, registro, actualización de perfil, verificación de token y cierre de sesión con garantía de normalización de propiedad 'uid'.
 */

import api, { AUTH_ENDPOINTS } from '@/config/api';

/**
 * Normaliza la presencia persistente de la propiedad 'uid' en las respuestas de autenticación
 * para asegurar que los interceptores HTTP y servicios cliente dispongan de ella.
 */
const normalizarUidEnRespuesta = (data) => {
    if (!data || typeof data !== 'object') return data || {};
    
    const targetObj = data.user || data.usuario || data.conductor || data.pasajero || data;
    const uidEncontrado = data.uid || targetObj?.uid || targetObj?._id || targetObj?.id || data._id || data.id;

    if (uidEncontrado) {
        data.uid = uidEncontrado;
        if (data.user && typeof data.user === 'object') data.user.uid = data.user.uid || uidEncontrado;
        if (data.usuario && typeof data.usuario === 'object') data.usuario.uid = data.usuario.uid || uidEncontrado;
        if (data.conductor && typeof data.conductor === 'object') data.conductor.uid = data.conductor.uid || uidEncontrado;
        if (data.pasajero && typeof data.pasajero === 'object') data.pasajero.uid = data.pasajero.uid || uidEncontrado;
    }

    return data;
};

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
        return normalizarUidEnRespuesta(response?.data || {});
    },

    /**
     * Registra un nuevo usuario en la plataforma
     * @param {Object|FormData} userData - Datos completos del usuario (JSON o FormData)
     */
    async register(userData) {
        if (!userData) {
            throw new Error('Los datos de registro son obligatorios.');
        }
        const isFormData = typeof FormData !== 'undefined' && userData instanceof FormData;
        const config = isFormData ? { headers: { 'Content-Type': undefined } } : {};
        const response = await api.post(AUTH_ENDPOINTS.register, userData, config);
        return normalizarUidEnRespuesta(response?.data || {});
    },

    /**
     * Actualiza el perfil del usuario autenticado en la sesión activa.
     * Soporta envío de JSON o FormData (para fotos de perfil, avatar y documentos).
     * Mapea y normaliza los campos requeridos por el servidor (fotoPerfil, avatar, correo, nombre, telefono, etc.).
     * @param {FormData|Object} formDataOrObject - Objeto con atributos o instancia FormData
     */
    async updateProfile(formDataOrObject) {
        if (!formDataOrObject) {
            throw new Error('Los datos de actualización de perfil son obligatorios.');
        }

        const endpoint = AUTH_ENDPOINTS?.updateProfile || '/auth/update-profile';
        const isFormData = typeof FormData !== 'undefined' && formDataOrObject instanceof FormData;

        let payloadToSend = formDataOrObject;

        if (isFormData) {
            // Mapeo seguro en FormData para normalizar alias de campos de imagen, correo, nombre y teléfono
            const foto = formDataOrObject.get('foto') || formDataOrObject.get('foto_perfil') || formDataOrObject.get('fotoPerfil') || formDataOrObject.get('avatar');
            const correo = formDataOrObject.get('correo') || formDataOrObject.get('email');
            const nombre = formDataOrObject.get('nombre') || formDataOrObject.get('name') || formDataOrObject.get('displayName');
            const telefono = formDataOrObject.get('telefono') || formDataOrObject.get('telefonoMovil') || formDataOrObject.get('phone');

            if (foto && !formDataOrObject.has('fotoPerfil')) {
                formDataOrObject.append('fotoPerfil', foto);
            }
            if (foto && !formDataOrObject.has('avatar')) {
                formDataOrObject.append('avatar', foto);
            }
            if (correo && !formDataOrObject.has('correo')) {
                formDataOrObject.append('correo', correo);
            }
            if (nombre && !formDataOrObject.has('nombre')) {
                formDataOrObject.append('nombre', nombre);
            }
            if (telefono && !formDataOrObject.has('telefono')) {
                formDataOrObject.append('telefono', telefono);
            }
        } else if (typeof formDataOrObject === 'object') {
            // Mapeo seguro para payloads JSON convencionales
            const foto = formDataOrObject.foto || formDataOrObject.foto_perfil || formDataOrObject.fotoPerfil || formDataOrObject.avatar;
            payloadToSend = {
                ...formDataOrObject,
                nombre: formDataOrObject.nombre || formDataOrObject.name || formDataOrObject.displayName,
                correo: formDataOrObject.correo || formDataOrObject.email,
                telefono: formDataOrObject.telefono || formDataOrObject.telefonoMovil || formDataOrObject.phone,
                fotoPerfil: formDataOrObject.fotoPerfil || foto,
                avatar: formDataOrObject.avatar || foto
            };
        }

        // Si es FormData, forzar Content-Type: undefined para dejar al navegador agregar el boundary de multipart/form-data
        const config = isFormData ? {
            headers: {
                'Content-Type': undefined
            }
        } : {};

        const response = await api.put(endpoint, payloadToSend, config);
        return normalizarUidEnRespuesta(response?.data || {});
    },

    /**
     * Verifica la validez del token y obtiene el usuario autenticado actual
     */
    async verifySession() {
        const response = await api.get(AUTH_ENDPOINTS.verificar);
        return normalizarUidEnRespuesta(response?.data || {});
    },

    /**
     * Obtiene el perfil actualizado del usuario autenticado
     */
    async getProfile() {
        const response = await api.get(AUTH_ENDPOINTS.me);
        return normalizarUidEnRespuesta(response?.data || {});
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