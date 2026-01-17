/**
 * src/utils/http-response.js
 * Clase de utilidad para estandarizar las respuestas HTTP en TAXIA CIMCO.
 */
class HttpResponse {
  /**
   * Respuesta 200 OK
   */
  static ok(res, data, message = "Operación exitosa") {
    return res.status(200).json({
      success: true,
      message, // Añadimos el mensaje para el feedback del usuario
      data: data,
    });
  }

  /**
   * Respuesta 201 Created
   */
  static created(res, data, message = "Recurso creado exitosamente") {
    return res.status(201).json({
      success: true,
      message,
      data: data,
    });
  }

  /**
   * Respuesta 400 Bad Request
   */
  static badRequest(res, message = "Solicitud inválida.", code = "BAD_REQUEST") {
    return res.status(400).json({
      success: false,
      error: message,
      code: code, // Código de error para manejo interno en el frontend
    });
  }

  /**
   * Respuesta 404 Not Found
   */
  static notFound(res, message = "Recurso no encontrado.") {
    return res.status(404).json({
      success: false,
      error: message,
      code: 404,
    });
  }

  /**
   * Respuesta 401 Unauthorized
   */
  static unauthorized(res, message = "No autorizado.") {
    return res.status(401).json({
      success: false,
      error: message,
      code: 401,
    });
  }

  /**
   * Respuesta 500 Internal Error
   */
  static internalError(res, message = "Error interno del servidor.") {
    return res.status(500).json({
      success: false,
      error: message,
      code: 500,
    });
  }
}

export default HttpResponse;