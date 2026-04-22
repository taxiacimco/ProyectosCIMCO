import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'taxia_cimco_default_secret_2026';
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
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    }

    /**
     * Verifica la autenticidad del token.
     * @param {string} token - El token a verificar.
     * @returns {object} La carga útil si es válido.
     * @throws {Error} Si el token es inválido o ha expirado.
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('TOKEN_INVALID_OR_EXPIRED');
        }
    }
}

export default new JwtUtil();