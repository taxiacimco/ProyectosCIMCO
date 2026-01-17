// src/utils/jwt.js

const jwt = require('jsonwebtoken');

// IMPORTANTE: Esta llave debe estar en las variables de entorno de Firebase Functions
// En un entorno real, esta clave se cargaría de forma segura.
const JWT_SECRET = process.env.JWT_SECRET || 'a_secret_key_very_long_and_secure';
const JWT_EXPIRATION = '7d'; // 7 días

/**
 * Utilidad para generar y verificar JSON Web Tokens.
 */
class JwtUtil {
    /**
     * Genera un nuevo JWT.
     * @param {object} payload - Carga útil para el token (ej: uid, role).
     * @returns {string} El token generado.
     */
    generateToken(payload) {
        // Genera el token con la carga útil, la clave secreta y la opción de expiración.
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    }

    /**
     * Verifica un JWT.
     * @param {string} token - El token a verificar.
     * @returns {object} La carga útil si es válido.
     * @throws {Error} Si el token es inválido o ha expirado.
     */
    verifyToken(token) {
        // Verifica el token utilizando la clave secreta.
        // Si la verificación falla (ej: expirado, firma inválida), arroja un error.
        return jwt.verify(token, JWT_SECRET);
    }
}

// Exportamos una instancia única para fácil acceso.
module.exports = { jwtUtil: new JwtUtil() };