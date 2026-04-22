// Versión Arquitectura: V2.4 - Guardia de Identidad (Firebase Auth + Emulator Bypass)
/**
 * functions/src/middleware/auth.middleware.js
 * PROYECTO: TAXIA CIMCO
 * Misión: Validar el Token de Identidad de Firebase y gestionar el acceso en modo desarrollo.
 */
import { getAuth } from 'firebase-admin/auth';
import { sendErrorResponse } from '../utils/http-response.js';

/**
 * Middleware para proteger rutas privadas inyectando el objeto req.user.
 */
export const authGuard = async (req, res, next) => {
    let idToken;

    // 1. Extracción del Bearer Token (Uso de encadenamiento opcional)
    if (req.headers.authorization?.startsWith('Bearer ')) {
        idToken = req.headers.authorization.split('Bearer ')[1];
    }

    if (!idToken) {
        return sendErrorResponse(res, "Acceso denegado. No se proporcionó token.", 401, "UNAUTHORIZED");
    }

    try {
        const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

        /**
         * 🛡️ PUERTA DE ENLACE PARA PRUEBAS (SOLO EMULADOR)
         * Misión: Agilizar el desarrollo permitiendo simular roles sin tokens reales.
         */
        if (isEmulator && idToken.startsWith('test_')) {
            req.user = { 
                uid: idToken, 
                email: `${idToken}@cimco.test`, 
                isTest: true,
                role: idToken.includes('admin') ? 'ADMIN' : 'USER'
            };
            return next();
        }

        /**
         * 🧠 VALIDACIÓN FIREBASE ADMIN SDK
         * checkRevocation es true en producción para detectar tokens revocados.
         */
        const checkRevocation = !isEmulator; 
        const decodedToken = await getAuth().verifyIdToken(idToken, checkRevocation);
        
        req.user = decodedToken;
        next();

    } catch (error) {
        console.error("❌ [Auth Middleware Error]:", error.message);
        
        // Manejo específico de expiración para el frontend
        if (error.code === 'auth/id-token-expired') {
            return sendErrorResponse(res, "El token ha expirado.", 401, "TOKEN_EXPIRED");
        }

        return sendErrorResponse(res, "Token de autenticación inválido o corrupto.", 401, "INVALID_AUTH");
    }
};