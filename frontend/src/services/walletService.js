// Versión Arquitectura: V25.2 - Sincronización de Endpoint Historial de Movimientos (/billetera/historial) en Billetera (CIMCO-WALLET-SERVICE)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\services\walletService.js
 * Misión: Gestión de saldos, consulta de historial de transacciones y transferencias entre cuentas mediante la instancia centralizada de Axios con interceptores JWT, resiliencia ante fallos de red y reintentos silenciosos.
 */

import api from '@/config/api';

const WALLET_BASE = '/billetera';

export const walletService = {
    /**
     * Consulta el saldo actual y estado de la billetera digital garantizando el paso por interceptores JWT
     * e implementando tiempo límite de respuesta (10s) y reintentos automáticos con retardo exponencial.
     * @param {AbortSignal} [signal] - Control de cancelación HTTP
     * @param {number} [retries=2] - Número máximo de reintentos silenciosos
     * @param {number} [delay=1000] - Tiempo base de espera en ms para exponential backoff
     */
    async getSaldo(signal = null, retries = 2, delay = 1000) {
        const config = { timeout: 10000 };
        if (signal) config.signal = signal;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await api.get(`${WALLET_BASE}/saldo`, config);
                return response?.data || { saldo: 0, activo: true };
            } catch (error) {
                const isCanceled = error?.name === 'CanceledError' || error?.message === 'canceled';
                const isTimeoutOrNetwork = (error?.code === 'ECONNABORTED' || !error?.response) && !isCanceled;

                if (isTimeoutOrNetwork && attempt < retries) {
                    await new Promise((res) => setTimeout(res, delay * (attempt + 1)));
                    continue;
                }

                console.error('🚨 [CIMCO-WALLET] Error al obtener saldo:', error);
                throw error;
            }
        }
    },

    /**
     * Obtiene el historial detallado de movimientos de la billetera (Sincronizado con GET /billetera/historial)
     * @param {Object} params - Paginación o filtros
     * @param {AbortSignal} [signal]
     */
    async getTransacciones(params = {}, signal = null) {
        try {
            const config = { params: params && typeof params === 'object' ? params : {} };
            if (signal) config.signal = signal;
            const response = await api.get(`${WALLET_BASE}/historial`, config);
            return response?.data || [];
        } catch (error) {
            console.error('🚨 [CIMCO-WALLET] Error al obtener transacciones/historial:', error);
            throw error;
        }
    },

    /**
     * Alias de getTransacciones para mantener coherencia semántica con el endpoint /billetera/historial
     * @param {Object} params - Paginación o filtros
     * @param {AbortSignal} [signal]
     */
    async getHistorial(params = {}, signal = null) {
        return this.getTransacciones(params, signal);
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