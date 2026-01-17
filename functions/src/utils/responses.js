// Archivo: src/utils/responses.js
// Contiene funciones de utilidad para estandarizar las respuestas JSON de la API.

/**
 * Envía una respuesta de éxito estandarizada.
 * @param {object} res Objeto de respuesta de Express.
 * @param {any} data Datos a enviar en el cuerpo de la respuesta.
 * @param {string} message Mensaje descriptivo del resultado.
 * @param {number} statusCode Código de estado HTTP (por defecto 200).
 */
export const sendSuccessResponse = (res, data, message = 'Operación exitosa.', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

/**
 * Envía una respuesta de error estandarizada.
 * @param {object} res Objeto de respuesta de Express.
 * @param {string} message Mensaje de error descriptivo.
 * @param {number} statusCode Código de estado HTTP (por defecto 500).
 * @param {string} errorCode Código de error interno (opcional).
 */
export const sendErrorResponse = (res, message, statusCode = 500, errorCode = 'API_ERROR') => {
    return res.status(statusCode).json({
        success: false,
        message,
        error: {
            code: errorCode,
            status: statusCode,
        },
    });
};