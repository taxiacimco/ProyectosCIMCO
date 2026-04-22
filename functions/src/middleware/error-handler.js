// Versión Arquitectura: V2.1 - Centralizador de Excepciones Global
/**
 * functions/src/middleware/error-handler.js
 * PROYECTO: TAXIA CIMCO
 * Misión: Capturar cualquier fallo en la tubería (Pipeline) y entregar una respuesta JSON coherente.
 */
import { sendErrorResponse } from "../utils/http-response.js";

/**
 * @function errorHandler
 * Manejador final de la cadena Express.
 */
const errorHandler = (err, req, res, next) => {
    // Registro del error para trazabilidad en Google Cloud Logs
    console.error(`🚨 [API ERROR] [${req.method} ${req.path}]:`, {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : 'REDACTED',
        uid: req.user?.uid || 'ANONYMOUS'
    });

    // 1. Errores de Negocio / Validación (Con statusCode definido)
    if (err.statusCode && err.statusCode < 500) {
        return res.status(err.statusCode).json({
            success: false,
            statusCode: err.statusCode,
            message: err.message,
            code: err.code || "BUSINESS_LOGIC_ERROR",
            errors: err.errors || null
        });
    }

    // 2. Errores de Permisos de Firestore (Path Sagrado)
    // Se dispara si se intenta acceder fuera de: artifacts/taxiacimco-app/public/data/
    if (err.code === 'permission-denied') {
        return sendErrorResponse(res, "No tienes permisos para acceder a estos datos en Firestore.", 403, "FIRESTORE_DENIED");
    }

    // 3. Error Interno Genérico (500)
    return sendErrorResponse(
        res, 
        "Error interno en los servicios de TAXIA CIMCO. El equipo técnico ha sido notificado.", 
        500, 
        "INTERNAL_SERVER_ERROR"
    );
};

export default errorHandler;