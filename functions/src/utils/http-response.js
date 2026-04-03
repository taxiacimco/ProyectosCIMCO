/**
 * src/utils/http-response.js
 * Utilidad única y estandarizada para TAXIA CIMCO.
 * Arquitectura Híbrida: Soporta patrón de Clases y Funciones Directas.
 */

// ============================================================================
// 1. PATRÓN ORIENTADO A OBJETOS (Para nuevos módulos y Clean Code)
// ============================================================================
class HttpResponse {
  static ok(res, data, message = "Operación exitosa") {
    return res.status(200).json({
      success: true,
      message,
      data: data || null,
    });
  }

  static created(res, data, message = "Recurso creado exitosamente") {
    return res.status(201).json({
      success: true,
      message,
      data: data || null,
    });
  }

  static error(res, message = "Error interno", statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR") {
    return res.status(statusCode).json({
      success: false,
      message,
      error: {
        code: errorCode,
        status: statusCode
      }
    });
  }

  static badRequest(res, message = "Solicitud inválida") {
    return this.error(res, message, 400, "BAD_REQUEST");
  }

  static unauthorized(res, message = "No autorizado") {
    return this.error(res, message, 401, "UNAUTHORIZED");
  }

  static notFound(res, message = "Recurso no encontrado") {
    return this.error(res, message, 404, "NOT_FOUND");
  }
}

// ============================================================================
// 2. ADAPTADORES DE RETROCOMPATIBILIDAD (Fusión Atómica para password.controller.js)
// ============================================================================

export const sendSuccessResponse = (res, data, message = "Operación exitosa", status = 200) => {
    return res.status(status).json({
        success: true,
        message,
        data: data || null
    });
};

export const sendErrorResponse = (res, message, status = 500, errorCode = "INTERNAL_ERROR") => {
    return res.status(status).json({
        success: false,
        message,
        error: errorCode
    });
};

// Por si acaso algún archivo viejo usa el nombre en singular
export const sendError = sendErrorResponse;

// Exportamos la clase por defecto para mantener la consistencia del entorno
export default HttpResponse;