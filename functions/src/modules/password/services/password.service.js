// Archivo: src/modules/password/services/password.service.js
import { hashUtil } from "../../../utils/hash.js";

/**
 * Servicio encargado de la lógica de negocio relacionada con contraseñas,
 * utilizando hashUtil para la encriptación.
 */
export class PasswordService {
    /**
     * Encripta una contraseña.
     * @param {string} password - Contraseña en texto plano.
     * @returns {Promise<string>} Contraseña hasheada.
     */
    async hashPassword(password) {
        return hashUtil.hash(password);
    }

    /**
     * Verifica si una contraseña coincide con su hash almacenado.
     * @param {string} password - Contraseña en texto plano.
     * @param {string} hash - Hash almacenado.
     * @returns {Promise<boolean>} Resultado de la comparación.
     */
    async verifyPassword(password, hash) {
        return hashUtil.compare(password, hash);
    }
}