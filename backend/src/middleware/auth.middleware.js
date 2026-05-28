// Versión Arquitectura: V11.5 - Activación del Escudo Maestro CEO por Correo Corporativo Estricto
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\middleware\auth.middleware.js
 * Misión: Blindar la compuerta API restringiendo mutaciones a cuentas administrativas que no posean el correo corporativo maestro.
 */

import jwt from 'jsonwebtoken';

// Leemos la clave del .env, si no existe usa la de respaldo por seguridad
const JWT_SECRET = process.env.JWT_SECRET || 'cimco_secret_key_2026';

/**
 * Middleware 1: Verificar validez del Token JWT en las cabeceras HTTP
 */
export const verificarToken = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ 
            success: false, 
            message: '❌ Acceso denegado: Token no proporcionado en las cabeceras (Authorization).' 
        });
    }

    try {
        // Manejamos el estándar "Bearer <token>"
        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
        
        // Desciframos el token con la firma secreta
        const verificado = jwt.verify(token, JWT_SECRET);
        
        // Guardas Anti-Undefined: Verificar estructura descifrada antes de montarla en la petición
        if (!verificado || typeof verificado !== 'object') {
            return res.status(400).json({
                success: false,
                message: '❌ Acceso denegado: Estructura del Payload corrupta o ilegible.'
            });
        }
        
        // Inyectamos los datos del usuario en la petición (id, rol, email)
        req.usuario = verificado; 
        next();
    } catch (error) {
        return res.status(400).json({ 
            success: false, 
            message: '❌ Acceso denegado: El Token ha expirado o es inválido.' 
        });
    }
};

/**
 * Middleware 2: Verificar si el usuario posee privilegios de Admin/CEO y correo maestro
 */
export const esAdmin = (req, res, next) => {
    // 🛡️ ESCUDO MAESTRO: Bloqueo anti-inyección e integridad redundante
    if (
        req.usuario && 
        req.usuario.rol === 'admin' && 
        req.usuario.email === 'taxiacimco@gmail.com'
    ) {
        next();
    } else {
        console.warn(`[⚠️ ADVERTENCIA SEGURIDAD] Intento de acceso administrativo denegado para: ${req.usuario?.email || 'Anónimo'}`);
        return res.status(403).json({ 
            success: false, 
            message: '❌ Acceso restringido: Se requieren credenciales y privilegios CEO Máster verificado para realizar esta transacción.' 
        });
    }
};