// Versión Arquitectura: V25.0 - Servicio Billetera Digital Aislado de Mutaciones Multimedia (CIMCO-WALLET-SERVICE)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\services\walletService.js
 * Misión: Gestión de saldos, recargas, historial de transacciones y transferencias entre cuentas mediante la instancia centralizada de Axios con interceptores JWT.
 */

import api from '@/config/api';

const WALLET_BASE = '/billetera';

export const walletService = {
    /**
     * Consulta el saldo actual y estado de la billetera digital garantizando el paso por interceptores JWT
     * @param {AbortSignal} [signal] - Control de cancelación HTTP
     */
    async getSaldo(signal = null) {
        try {
            const config = {};
            if (signal) config.signal = signal;
            const response = await api.get(`${WALLET_BASE}/saldo`, config);
            return response?.data || { saldo: 0, activo: true };
        } catch (error) {
            console.error('🚨 [CIMCO-WALLET] Error al obtener saldo:', error);
            throw error;
        }
    },

    /**
     * Obtiene el historial detallado de movimientos de la billetera
     * @param {Object} params - Paginación o filtros
     * @param {AbortSignal} [signal]
     */
    async getTransacciones(params = {}, signal = null) {
        try {
            const config = { params: params && typeof params === 'object' ? params : {} };
            if (signal) config.signal = signal;
            const response = await api.get(`${WALLET_BASE}/transacciones`, config);
            return response?.data || [];
        } catch (error) {
            console.error('🚨 [CIMCO-WALLET] Error al obtener transacciones:', error);
            throw error;
        }
    },

    /**
     * Solicita una recarga de saldo mediante pasarela de pagos
     * @param {Object} recargaPayload - { monto, metodo, referencia }
     */
    async solicitarRecarga(recargaPayload) {
        if (!recargaPayload || typeof recargaPayload !== 'object' || !recargaPayload.monto || Number(recargaPayload.monto) <= 0) {
            throw new Error('El monto de la recarga es requerido y debe ser mayor a cero.');
        }
        try {
            const response = await api.post(`${WALLET_BASE}/recargar`, recargaPayload);
            return response?.data || {};
        } catch (error) {
            console.error('🚨 [CIMCO-WALLET] Error al solicitar recarga:', error);
            throw error;
        }
    },

    /**
     * Ejecuta una transferencia de saldo entre usuarios del ecosistema
     * @param {Object} transferPayload - { destinatarioId, monto, concepto }
     */
    async transferir(transferPayload) {
        if (!transferPayload || typeof transferPayload !== 'object') {
            throw new Error('Los datos de transferencia son requeridos.');
        }
        if (!transferPayload.destinatarioId || typeof transferPayload.destinatarioId !== 'string') {
            throw new Error('El ID del destinatario es obligatorio.');
        }
        if (!transferPayload.monto || Number(transferPayload.monto) <= 0) {
            throw new Error('El monto a transferir debe ser mayor a cero.');
        }
        try {
            const response = await api.post(`${WALLET_BASE}/transferir`, transferPayload);
            return response?.data || {};
        } catch (error) {
            console.error('🚨 [CIMCO-WALLET] Error al ejecutar transferencia:', error);
            throw error;
        }
    }
};

export default walletService;