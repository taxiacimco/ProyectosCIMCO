// Versión Arquitectura: V2.0 - Seguridad JWT Modo Fail-Safe
/**
 * utils/jwt.js
 * Misión: Utilidad para generar y verificar JSON Web Tokens sin secretos expuestos.
 */
import jwt from 'jsonwebtoken';

// 🛡️ MODO FAIL-SAFE: Si no hay secreto, el módulo falla inmediatamente.
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("⚠️ FATAL: JWT_SECRET no está configurado en las variables de entorno.");
    }
    return secret;
};

const JWT_EXPIRATION = '7d';

/**
 * Utilidad para generar y verificar JSON Web Tokens.
 */
class JwtUtil {
    /**
     * Genera un nuevo JWT para Pasajeros o Conductores.
     * @param {object} payload - Carga útil para el token (ej: uid, role).
     * @returns {string} El token generado.
     */
    generateToken(payload) {
        return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRATION });
    }

    /**
     * Verifica la autenticidad del token.
     * @param {string} token - El token a verificar.
     * @returns {object} La carga útil si es válido.
     * @throws {Error} Si el token es inválido o ha expirado.
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, getJwtSecret());
        } catch (error) {
            throw new Error('TOKEN_INVALID_OR_EXPIRED');
        }
    }
}

export default new JwtUtil();