// Archivo: src/modules/password/controllers/password.controller.js
import { PasswordService } from "../services/password.service.js"; 
import { sendSuccessResponse, sendErrorResponse } from "../../../utils/responses.js";

// Instanciación del servicio
const passwordService = new PasswordService();

/**
 * Controlador para manejar la encriptación de una contraseña.
 */
const hashPassword = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return sendErrorResponse(res, "La contraseña es requerida.", 400, "MISSING_PASSWORD");
        }

        const hashedPassword = await passwordService.hashPassword(password);
        return sendSuccessResponse(res, { hash: hashedPassword }, "Contraseña encriptada exitosamente.", 200);

    } catch (error) {
        console.error("Error al hashear contraseña:", error);
        return sendErrorResponse(res, "Error interno al procesar la contraseña.", 500, "HASH_ERROR");
    }
};

/**
 * Controlador para manejar la verificación de una contraseña.
 */
const verifyPassword = async (req, res) => {
    try {
        const { password, hash } = req.body;

        if (!password || !hash) {
            return sendErrorResponse(res, "Se requiere la contraseña y el hash a verificar.", 400, "MISSING_FIELDS");
        }

        const isValid = await passwordService.verifyPassword(password, hash);
        return sendSuccessResponse(res, { valid: isValid }, "Resultado de la verificación de contraseña.", 200);

    } catch (error) {
        console.error("Error al verificar contraseña:", error);
        return sendErrorResponse(res, "Error interno al verificar la contraseña.", 500, "VERIFY_ERROR");
    }
};

// Agrupamos en un objeto
const passwordController = {
    hashPassword,
    verifyPassword,
};

// ✅ EXPORTACIÓN POR DEFECTO (Esto es lo que soluciona el SyntaxError)
export default passwordController;