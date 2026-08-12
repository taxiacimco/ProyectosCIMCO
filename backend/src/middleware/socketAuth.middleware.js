// Versión Arquitectura: V5.3.0 - Rechazo Estricto de Handshake por Expiración/Invalidez JWT
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\middleware\socketAuth.middleware.js
 * Misión: Interceptar conexiones entrantes de Sockets y validar su autenticidad mediante JWT en la fase de handshake.
 * Ajuste V5.3.0: Rechazo explícito y clasificado de conexiones cuando el token está expirado, corrupto o carece de identidad válida,
 *              impidiendo que clientes desautenticados mantengan canales de tiempo real en el ecosistema CIMCO.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'Cimco_Master_Key_Secret_Tokens_2026_LaJagua';

export const socketAuthMiddleware = (socket, next) => {
    // 🛡️ GUARDA DE SEGURIDAD PERIMETRAL: Anti-Undefined del socket y handshake
    if (!socket || !socket.handshake) {
        const errorContexto = new Error('Autenticación rechazada: Contexto de socket o handshake corrupto.');
        errorContexto.data = { code: 'INVALID_HANDSHAKE_CONTEXT' };
        return next(errorContexto);
    }

    // Extrae el token dinámicamente desde la propiedad 'auth' del cliente o de las cabeceras HTTP
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token || token === 'undefined' || token === 'null') {
        const errorTokenFaltante = new Error('Autenticación rechazada: Token no suministrado en el handshake.');
        errorTokenFaltante.data = { code: 'TOKEN_MISSING' };
        return next(errorTokenFaltante);
    }

    try {
        // Validación criptográfica con la llave secreta unificada
        const decodificado = jwt.verify(token, JWT_SECRET);
        
        // 🛡️ GUARDA ANTI-CRASH (ANTI-UNDEFINED): Evalúa la presencia de la identidad y mitiga excepciones en ejecución
        if (!decodificado || typeof decodificado !== 'object') {
            const errorPayload = new Error('Autenticación rechazada: Estructura de payload corrupta o alterada.');
            errorPayload.data = { code: 'PAYLOAD_CORRUPTED' };
            return next(errorPayload);
        }

        const usuarioId = decodificado.id || decodificado._id || decodificado.uid || null;

        if (!usuarioId) {
            const errorNodoInexistente = new Error('Autenticación rechazada: Nodo de identidad inexistente o token sin UID válido.');
            errorNodoInexistente.data = { code: 'NODE_NOT_FOUND', reason: 'nodo_inexistente' };
            return next(errorNodoInexistente);
        }

        const rolExtraido = decodificado.rol || decodificado.role || 'pasajero';
        
        // Inyección atómica de la identidad en la instancia del socket para uso perimetral
        socket.usuarioId = String(usuarioId);
        socket.rol = String(rolExtraido).toLowerCase().trim(); // Normaliza de manera segura
        socket.usuario = decodificado; // Contexto completo para escuchas en tiempo real

        next(); // Handshake aprobado, se abre el túnel duplex
    } catch (error) {
        console.error(`❌ [SOCKET-AUTH-ERROR] Rechazo en handshake [Socket ID: ${socket.id || 'N/A'}]:`, error.message);

        let errorHandshake;

        if (error.name === 'TokenExpiredError') {
            errorHandshake = new Error('AUTH_EXPIRED: El token JWT ha caducado.');
            errorHandshake.data = { code: 'TOKEN_EXPIRED', reason: 'nodo_inexistente' };
        } else if (error.name === 'JsonWebTokenError') {
            errorHandshake = new Error('INVALID_TOKEN: Firma JWT inválida o token malformado.');
            errorHandshake.data = { code: 'TOKEN_INVALID', reason: 'nodo_inexistente' };
        } else {
            errorHandshake = new Error('Autenticación rechazada: Token inválido, corrupto o expirado.');
            errorHandshake.data = { code: 'AUTH_FAILED', reason: 'nodo_inexistente' };
        }

        // Se aborta la conexión inmediatamente devolviendo el error explícito en el handshake
        return next(errorHandshake);
    }
};