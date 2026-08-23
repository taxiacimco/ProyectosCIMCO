// Versión Arquitectura: V24.1 - Servicio Centralizado de Gestión de Usuarios (CIMCO-USER-SERVICE)
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
     * @param {Object} userData 
     */
    async create(userData) {
        if (!userData || typeof userData !== 'object') throw new Error('El payload de usuario es obligatorio.');
        const response = await api.post(USUARIOS_BASE, userData);
        return response?.data || {};
    },

    /**
     * Actualiza la información de un usuario existente
     * @param {string} id 
     * @param {Object} updateData 
     */
    async update(id, updateData) {
        if (!id || typeof id !== 'string') throw new Error('El ID de usuario es obligatorio para actualizar.');
        if (!updateData || typeof updateData !== 'object') throw new Error('Los datos de actualización son obligatorios.');
        const response = await api.put(`${USUARIOS_BASE}/${id.trim()}`, updateData);
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