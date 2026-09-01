// Versión Arquitectura: V24.2 - Servicio Centralizado de Gestión de Usuarios Híbrido FormData/JSON
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\services\userService.js
 * Misión: Abstracción CRUD para la administración de usuarios, conductores, despachadores y operadores.
 */

import api from '@/config/api';

const USUARIOS_BASE = '/usuarios';

export const userService = {
    /**
     * Obtiene la lista completa o filtrada de usuarios
     * @param {Object} params - Filtros de búsqueda (rol, estado, etc.)
     * @param {AbortSignal} [signal] - Control de cancelación HTTP
     */
    async getAll(params = {}, signal = null) {
        const config = { params: params || {} };
        if (signal) config.signal = signal;
        const response = await api.get(USUARIOS_BASE, config);
        return response?.data || [];
    },

    /**
     * Obtiene los datos detallados de un usuario por su ID
     * @param {string} id - ID del usuario
     * @param {AbortSignal} [signal]
     */
    async getById(id, signal = null) {
        if (!id || typeof id !== 'string') throw new Error('El ID de usuario es obligatorio.');
        const config = {};
        if (signal) config.signal = signal;
        const response = await api.get(`${USUARIOS_BASE}/${id.trim()}`, config);
        return response?.data || null;
    },

    /**
     * Crea un nuevo registro de usuario o conductor desde el panel
     * Soporta payloads JSON y FormData (imágenes/archivos)
     * @param {Object|FormData} userData 
     */
    async create(userData) {
        if (!userData || (typeof userData !== 'object' && !(typeof FormData !== 'undefined' && userData instanceof FormData))) {
            throw new Error('El payload de usuario es obligatorio.');
        }

        const isFormData = typeof FormData !== 'undefined' && userData instanceof FormData;
        const config = isFormData ? { headers: { 'Content-Type': undefined } } : {};

        const response = await api.post(USUARIOS_BASE, userData, config);
        return response?.data || {};
    },

    /**
     * Actualiza la información de un usuario existente en el sistema.
     * Soporta envío de JSON o FormData (para fotos de perfil, avatar y documentos).
     * Mapea automáticamente los campos hacia la API receptora (fotoPerfil, avatar, correo, nombre, telefono).
     * @param {string} id 
     * @param {Object|FormData} updateData 
     */
    async update(id, updateData) {
        if (!id || typeof id !== 'string') throw new Error('El ID de usuario es obligatorio para actualizar.');
        if (!updateData || (typeof updateData !== 'object' && !(typeof FormData !== 'undefined' && updateData instanceof FormData))) {
            throw new Error('Los datos de actualización son obligatorios.');
        }

        const isFormData = typeof FormData !== 'undefined' && updateData instanceof FormData;
        let payloadToSend = updateData;

        if (isFormData) {
            // Normalización y mapeo de alias en la instancia FormData
            const foto = updateData.get('foto') || updateData.get('foto_perfil') || updateData.get('fotoPerfil') || updateData.get('avatar');
            const correo = updateData.get('correo') || updateData.get('email');
            const nombre = updateData.get('nombre') || updateData.get('name') || updateData.get('displayName');
            const telefono = updateData.get('telefono') || updateData.get('telefonoMovil') || updateData.get('phone');

            if (foto && !updateData.has('fotoPerfil')) {
                updateData.append('fotoPerfil', foto);
            }
            if (foto && !updateData.has('avatar')) {
                updateData.append('avatar', foto);
            }
            if (correo && !updateData.has('correo')) {
                updateData.append('correo', correo);
            }
            if (nombre && !updateData.has('nombre')) {
                updateData.append('nombre', nombre);
            }
            if (telefono && !updateData.has('telefono')) {
                updateData.append('telefono', telefono);
            }
        } else if (typeof updateData === 'object') {
            // Mapeo defensivo de alias en objetos JSON
            const foto = updateData.foto || updateData.foto_perfil || updateData.fotoPerfil || updateData.avatar;
            payloadToSend = {
                ...updateData,
                nombre: updateData.nombre || updateData.name || updateData.displayName,
                correo: updateData.correo || updateData.email,
                telefono: updateData.telefono || updateData.telefonoMovil || updateData.phone,
                fotoPerfil: updateData.fotoPerfil || foto,
                avatar: updateData.avatar || foto
            };
        }

        // Si es FormData, remover forzado de Content-Type para delegar multipart/form-data al navegador
        const config = isFormData ? {
            headers: {
                'Content-Type': undefined
            }
        } : {};

        const response = await api.put(`${USUARIOS_BASE}/${id.trim()}`, payloadToSend, config);
        return response?.data || {};
    },

    /**
     * Desactiva o elimina un usuario del sistema
     * @param {string} id 
     */
    async delete(id) {
        if (!id || typeof id !== 'string') throw new Error('El ID de usuario es obligatorio para eliminar.');
        const response = await api.delete(`${USUARIOS_BASE}/${id.trim()}`);
        return response?.data || {};
    },

    /**
     * Consulta específica de la flota de conductores activos
     * @param {AbortSignal} [signal]
     */
    async getConductores(signal = null) {
        const config = {};
        if (signal) config.signal = signal;
        const response = await api.get(`${USUARIOS_BASE}/conductores`, config);
        return response?.data || [];
    }
};

export default userService;