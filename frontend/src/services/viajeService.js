// Versión Arquitectura: V24.2 - Servicio Centralizado de Gestión de Viajes con Transición PATCH de Estado (CIMCO-VIAJE-SERVICE)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\services\viajeService.js
 * Misión: Control centralizado de solicitudes, despachos, asignaciones, cambios de estado y carreras.
 */

import api, { VIAJES_ENDPOINTS } from '@/config/api';

export const viajeService = {
    /**
     * Solicita una nueva carrera o servicio de transporte
     * @param {Object} viajeData - Payload con origen, destino, tipo de vehículo
     */
    async solicitar(viajeData) {
        if (!viajeData || typeof viajeData !== 'object') {
            throw new Error('Los datos del viaje son requeridos.');
        }
        const response = await api.post(VIAJES_ENDPOINTS.solicitar, viajeData);
        return response?.data || {};
    },

    /**
     * Permite a un conductor aceptar un viaje asignado o disponible
     * @param {string} viajeId 
     */
    async aceptar(viajeId) {
        if (!viajeId || typeof viajeId !== 'string') {
            throw new Error('El ID del viaje es obligatorio.');
        }
        const response = await api.post(VIAJES_ENDPOINTS.aceptar, { viajeId: viajeId.trim() });
        return response?.data || {};
    },

    /**
     * Marca un viaje en curso como finalizado
     * @param {string} viajeId 
     * @param {Object} detalles - Métrica final, costo, método de pago
     */
    async completar(viajeId, detalles = {}) {
        if (!viajeId || typeof viajeId !== 'string') {
            throw new Error('El ID del viaje es obligatorio.');
        }
        const safeDetalles = (detalles && typeof detalles === 'object') ? detalles : {};
        const response = await api.post(VIAJES_ENDPOINTS.completar, { viajeId: viajeId.trim(), ...safeDetalles });
        return response?.data || {};
    },

    /**
     * Despacho directo desde consola administrativa o despachador de nodo
     * @param {Object} despachoData 
     */
    async despachar(despachoData) {
        if (!despachoData || typeof despachoData !== 'object') {
            throw new Error('Los datos de despacho son requeridos.');
        }
        const response = await api.post(VIAJES_ENDPOINTS.despachar, despachoData);
        return response?.data || {};
    },

    /**
     * Cancela una solicitud de viaje por parte del cliente, conductor o nodo
     * @param {string} viajeId 
     * @param {string} motivo 
     */
    async cancelar(viajeId, motivo = '') {
        if (!viajeId || typeof viajeId !== 'string') {
            throw new Error('El ID del viaje es obligatorio para cancelar.');
        }
        const response = await api.post(VIAJES_ENDPOINTS.cancelar, {
            viajeId: viajeId.trim(),
            motivo: typeof motivo === 'string' ? motivo.trim() : ''
        });
        return response?.data || {};
    },

    /**
     * Actualiza el estado del viaje mediante consumo del endpoint PATCH
     * @param {string} viajeId 
     * @param {string} nuevoEstado 
     * @param {string|null} motivoCancelacion 
     */
    async cambiarEstadoViaje(viajeId, nuevoEstado, motivoCancelacion = null) {
        if (!viajeId || typeof viajeId !== 'string') {
            throw new Error('El ID del viaje es obligatorio para cambiar el estado.');
        }
        if (!nuevoEstado || typeof nuevoEstado !== 'string') {
            throw new Error('El nuevo estado es obligatorio.');
        }
        const response = await api.patch(`/viajes/${viajeId.trim()}/estado`, {
            nuevoEstado: nuevoEstado.trim(),
            motivoCancelacion: typeof motivoCancelacion === 'string' ? motivoCancelacion.trim() : motivoCancelacion
        });
        return response?.data || {};
    },

    /**
     * Obtiene el historial de carreras del usuario o conductor
     * @param {Object} params - Filtros opcionales
     * @param {AbortSignal} [signal]
     */
    async getHistorial(params = {}, signal = null) {
        const config = { params: params && typeof params === 'object' ? params : {} };
        if (signal) config.signal = signal;
        const response = await api.get(VIAJES_ENDPOINTS.historial, config);
        return response?.data || [];
    },

    /**
     * Obtiene la cola activa de carreras asignadas a la consola del despachador
     * @param {AbortSignal} [signal]
     */
    async getDespachosNodo(signal = null) {
        const config = {};
        if (signal) config.signal = signal;
        const response = await api.get(VIAJES_ENDPOINTS.despachador, config);
        return response?.data || [];
    }
};

export const cambiarEstadoViaje = viajeService.cambiarEstadoViaje;

export default viajeService;