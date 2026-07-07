// Versión Arquitectura: V5.1.0 - Blindaje Homólogo Anti-Crash y Normalización Multiplexada de Roles
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\middleware\socketAuth.middleware.js
 * Misión: Interceptar conexiones entrantes de Sockets y validar su autenticidad mediante JWT.
 * Ajuste V5.1.0: Mitigación de crash crítico (TypeError) mediante la implementación de una guarda de presencia
 * estricta sobre el payload decodificado, soportando la dualidad nominal ('rol' ↔ 'role') para evitar desbordamientos
 * por valores indefinidos durante ráfagas de concurrencia masiva.
 */
import jwt from 'jsonwebtoken';

export const socketAuthMiddleware = (socket, next) => {
    // Extrae el token dinámicamente desde la propiedad 'auth' del cliente o de las cabeceras HTTP
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
        return next(new Error('Autenticación rechazada: Token no suministrado en el handshake.'));
    }

    try {
        // Validación con la llave maestra configurada en el .env
        const decodificado = jwt.verify(token, process.env.JWT_SECRET);
        
        // 🛡️ GUARDA ANTI-CRASH (ANTI-UNDEFINED): Evalúa la presencia de la identidad y mitiga excepciones en ejecución
        if (!decodificado || typeof decodificado !== 'object') {
            return next(new Error('Autenticación rechazada: Estructura de payload corrupta o alterada.'));
        }

        const rolExtraido = decodificado.rol || decodificado.role || 'pasajero';
        
        // Inyección atómica de la identidad en la instancia del socket para uso perimetral
        socket.usuarioId = decodificado.id || decodificado._id || null;
        socket.rol = String(rolExtraido).toLowerCase(); // Normaliza de manera segura a 'conductor', 'pasajero', 'admin', 'secretaria', 'despachador'
        
        next(); // Handshake aprobado, se abre el túnel duplex
    } catch (error) {
        return next(new Error('Autenticación rechazada: Token inválido, corrupto o expirado.'));
    }
};