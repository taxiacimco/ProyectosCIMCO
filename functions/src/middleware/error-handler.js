/**
 * middleware/error-handler.js
 * Middleware de manejo de errores global para Express.
 * Asegura que todos los errores (incluidos los de asyncHandler) se manejen de forma segura
 * y se devuelva una respuesta estandarizada.
 */

import HttpResponse from "../utils/http-response.js"; // Importar la utilidad de respuesta

/**
 * @function errorHandler
 * Manejador de errores de Express.
 * @param {Error} err El objeto de error.
 * @param {object} req Objeto de solicitud de Express.
 * @param {object} res Objeto de respuesta de Express.
 * @param {function} next Función next (necesaria para la firma del middleware de error).
 */
const errorHandler = (err, req, res, next) => {
    console.error(`Error en la solicitud [${req.method} ${req.path}]:`, err.message);
    
    // Si el error tiene un código de estado definido (ej: errores personalizados)
    if (err.statusCode && err.statusCode < 500) {
        return res.status(err.statusCode).json({
            statusCode: err.statusCode,
            message: err.message,
            errors: err.errors || null,
        });
    }

    // Caso por defecto: Error interno del servidor (500)
    // Se utiliza la utilidad HttpResponse
    return HttpResponse.internalError(res, "Ocurrió un error inesperado en el servidor", err);
};

export default errorHandler;