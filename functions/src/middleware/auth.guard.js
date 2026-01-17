/**
 * src/middleware/auth.guard.js
 * * Middleware de autenticación para verificar el token (Bearer Token)
 * * en las solicitudes entrantes, utilizando Firebase Admin SDK.
 */
import { getAuth } from "firebase-admin/auth";
import { asyncHandler } from './async-handler.js'; // Importación nombrada corregida.

/**
 * Función de guardia de autenticación envuelta en asyncHandler para el manejo automático de errores.
 */
export const authGuard = asyncHandler(async (req, res, next) => {
    // 1. Obtener el encabezado de autorización
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Si no hay encabezado o no comienza con 'Bearer ', denegar acceso.
        return res.status(401).send({ message: 'Acceso denegado. No se proporcionó token de autenticación.' });
    }

    // 2. Extraer el token
    const token = authHeader.split(' ')[1];

    try {
        // 3. Verificar el token usando Firebase Admin SDK
        const decodedToken = await getAuth().verifyIdToken(token);
        
        // 4. Adjuntar la información del usuario a la solicitud (para usarla en los controladores)
        req.user = decodedToken;
        
        // 5. Continuar con el siguiente middleware/controlador
        next();
    } catch (error) {
        // 6. Manejar errores de verificación (token inválido, expirado, etc.)
        console.error("Fallo en la verificación del token:", error.message);
        return res.status(401).send({ message: 'Token de autenticación inválido o expirado.' });
    }
});