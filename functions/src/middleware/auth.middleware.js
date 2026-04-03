/**
 * middleware/auth.middleware.js
 * Guardia de seguridad principal - TAXIA CIMCO
 */
import { getAuth } from 'firebase-admin/auth';
import { sendErrorResponse } from '../utils/http-response.js';

const authMiddleware = async (req, res, next) => {
    let idToken;

    // 1. Extraer el token del header de autorización
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        idToken = req.headers.authorization.split('Bearer ')[1];
    }

    if (!idToken) {
        return sendErrorResponse(res, "Acceso denegado. No se proporcionó token de autenticación.", 401, "UNAUTHORIZED");
    }

    try {
        // 2. Verificar el token con Firebase Admin (forzando verificación de revocación)
        const decodedToken = await getAuth().verifyIdToken(idToken, true);
        
        // 3. 💉 INYECCIÓN CRÍTICA: Guardar los datos del usuario en la petición (req.user)
        req.user = decodedToken;

        // 4. Continuar hacia el controlador
        next();
    } catch (error) {
        console.error("❌ [Auth Middleware Error]:", error.code || error.message);
        
        if (error.code === 'auth/id-token-expired') {
            return sendErrorResponse(res, "El token ha expirado. Por favor, inicia sesión nuevamente.", 401, "TOKEN_EXPIRED");
        }
        
        return sendErrorResponse(res, "Token inválido, expirado o revocado.", 401, "INVALID_TOKEN");
    }
};

export default authMiddleware;