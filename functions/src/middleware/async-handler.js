/**
 * src/middleware/async-handler.js
 *
 * Middleware que envuelve funciones asíncronas de Express (controladores)
 * para capturar automáticamente errores y promesas rechazadas,
 * enviándolos al manejador global de errores de Express.
 */

/**
 * Envuelve un controlador async y captura errores.
 *
 * @param {Function} fn - Controlador async (req, res, next)
 * @returns {Function} Middleware de Express
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise
    .resolve(fn(req, res, next))
    .catch(next);
};
