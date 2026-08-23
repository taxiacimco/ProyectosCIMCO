// Versión Arquitectura: V24.1 - Middleware Global de Manejo de Errores Express (Estructura Unificada CIMCO-RESPONSE)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\middleware\error.middleware.js
 * Misión: Capturar y estandarizar todas las excepciones no controladas en las rutas y controladores Express,
 *         garantizando una respuesta JSON fija: { success: false, message: "...", details: ... }.
 */

const errorHandler = (err, req, res, next) => {
    // 1. Guardas de seguridad y resiliencia para req, res y err
    const safeReq = req || {};
    const safeRes = res || {};
    const safeErr = err || {};

    const method = safeReq.method || 'UNKNOWN_METHOD';
    const url = safeReq.originalUrl || safeReq.url || 'UNKNOWN_URL';

    // 2. Registro detallado del error en consola para auditoría técnica y telemetría
    console.error(`🚨 [CIMCO-BACKEND-ERROR] [${method}] ${url} -`, safeErr);

    // 3. Determinación del código de estado HTTP adecuado (por defecto 500)
    let statusCode = safeErr.statusCode || safeErr.status;
    if (!statusCode || typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599) {
        statusCode = (safeRes.statusCode && safeRes.statusCode >= 400 && safeRes.statusCode < 600) 
            ? safeRes.statusCode 
            : 500;
    }

    // 4. Formateo de respuesta unificada consumible de forma transparente por Axios en el Frontend
    const responsePayload = {
        success: false,
        message: safeErr.message || 'Error interno del servidor central',
        details: safeErr.details || safeErr.errors || null
    };

    // 5. Inclusión de pila de depuración (stack trace) solo en entorno de desarrollo local
    if (process.env.NODE_ENV === 'development' && safeErr.stack) {
        responsePayload.stack = safeErr.stack;
    }

    // 6. Envío blindado de respuesta HTTP
    if (typeof safeRes.status === 'function' && typeof safeRes.json === 'function') {
        return safeRes.status(statusCode).json(responsePayload);
    }

    if (typeof next === 'function') {
        return next(safeErr);
    }
};

module.exports = errorHandler;