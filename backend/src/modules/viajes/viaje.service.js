// Versión Arquitectura: V1.0 - Servicio Centralizado de Lógica de Negocio de Viajes
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.service.js
 * Misión: Abstraer la lógica contable centralizada, reglas de negocio y cálculo de comisiones para el subsistema de viajes.
 */

export const calcularComision = (valorReferencia) => {
    if (!valorReferencia || isNaN(valorReferencia)) return 0;
    // Regla de negocio: 10% de comisión estandarizada
    return Math.round(parseFloat(valorReferencia) * 0.10);
};

const viajeService = {
    calcularComision
};

export default viajeService;