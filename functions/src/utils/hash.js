// Archivo: src/utils/hash.js
// IMPORTANTE: Este módulo requiere 'bcryptjs' o 'bcrypt'.
// Si no lo tienes instalado, ejecuta: npm install bcryptjs
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Utility object for password hashing and comparison.
 * Exported as 'hashUtil' to match the import structure in password.service.js.
 */
const hashUtil = {
    /**
     * Hashes a plain text password using bcrypt.
     * @param {string} password - The password to hash.
     * @returns {Promise<string>} The hashed password string.
     */
    hash: async (password) => {
        if (!password) {
            throw new Error('Password cannot be empty for hashing.');
        }
        return bcrypt.hash(password, SALT_ROUNDS);
    },

    /**
     * Compares a plain text password with a stored hash.
     * @param {string} password - The plain text password.
     * @param {string} hash - The stored hash.
     * @returns {Promise<boolean>} True if the passwords match, false otherwise.
     */
    compare: async (password, hash) => {
        return bcrypt.compare(password, hash);
    }
};

// Exportamos el objeto 'hashUtil' como una exportación con nombre
export { hashUtil };