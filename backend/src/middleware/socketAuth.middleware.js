// Versión Arquitectura: V5.2.0 - Validación Robusta Handshake JWT y Fallback Seguro
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\middleware\socketAuth.middleware.js
 * Misión: Interceptar conexiones entrantes de Sockets y validar su autenticidad mediante JWT.
 * Ajuste V5.2.0: FUSIÓN ATÓMICA. Implementación de clave secreta con fallback seguro (JWT_SECRET) en consonancia
 * con la arquitectura global de tokens, manteniendo la guarda anti-crash sobre la desestructuración del payload,
 * la trazabilidad de identificadores alternativos (`uid`) y la normalización segura de roles.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'Cimco_Master_Key_Secret_Tokens_2026_LaJagua';

export const socketAuthMiddleware = (socket, next) => {
    // 🛡️ GUARDA DE SEGURIDAD PERIMETRAL: Anti-Undefined del socket y handshake
    if (!socket || !socket.handshake) {
        return next(new Error('Autenticación rechazada: Contexto de socket o handshake corrupto.'));
    }

    // Extrae el token dinámicamente desde la propiedad 'auth' del cliente o de las cabeceras HTTP
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
        return next(new Error('Autenticación rechazada: Token no suministrado en el handshake.'));
    }

    try {
        // Validación criptográfica con la llave secreta unificada
        const decodificado = jwt.verify(token, JWT_SECRET);
        
        // 🛡️ GUARDA ANTI-CRASH (ANTI-UNDEFINED): Evalúa la presencia de la identidad y mitiga excepciones en ejecución
        if (!decodificado || typeof decodificado !== 'object') {
            return next(new Error('Autenticación rechazada: Estructura de payload corrupta o alterada.'));
        }

        const rolExtraido = decodificado.rol || decodificado.role || 'pasajero';
        
        // Inyección atómica de la identidad en la instancia del socket para uso perimetral
        socket.usuarioId = decodificado.id || decodificado._id || decodificado.uid || null;
        socket.rol = String(rolExtraido).toLowerCase(); // Normaliza de manera segura
        socket.usuario = decodificado; // Contexto completo para escuchas en tiempo real

        next(); // Handshake aprobado, se abre el túnel duplex
    } catch (error) {
        return next(new Error('Autenticación rechazada: Token inválido, corrupto o expirado.'));
    }
};