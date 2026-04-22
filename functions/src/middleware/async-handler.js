// Versión Arquitectura: V1.3 - Manejador de Promesas (Clean Code)
/**
 * functions/src/middleware/async-handler.js
 * PROYECTO: TAXIA CIMCO
 * Misión: Envolver controladores asíncronos para capturar errores sin bloques try-catch repetitivos.
 */

/**
 * Encapsula la ejecución de funciones asíncronas y redirige errores al middleware global.
 * @param {Function} fn - Controlador (req, res, next)
 * @returns {Function}
 */
export const asyncHandler = (fn) => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};