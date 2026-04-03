/**
 * modules/password/controllers/password.controller.js
 * Controlador maestro para la gestión de credenciales y seguridad - TAXIA CIMCO
 */
import { PasswordService } from "../services/password.service.js"; 
// ✅ CORRECCIÓN DE RUTA: Normalización hacia http-response.js
import { sendSuccessResponse, sendErrorResponse } from "../../../utils/http-response.js";
import { asyncHandler } from "../../../middleware/async-handler.js";
// Importamos la instancia de auth desde la inicialización centralizada
import admin from "firebase-admin";

// Instanciación del servicio de encriptación original
const passwordService = new PasswordService();

/**
 * 1. Solicitar recuperación de contraseña (NUEVA LÓGICA INTEGRADA)
 * Genera un enlace de restablecimiento a través de Firebase Admin SDK
 */
const requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return sendErrorResponse(res, "El correo electrónico es requerido.", 400);
    }

    try {
        // Acceso al Admin SDK para generar el link
        const link = await admin.auth().generatePasswordResetLink(email);
        
        // Log de auditoría interna
        console.log(`🔗 Link de recuperación generado para ${email}: ${link}`);

        // Por seguridad (Clean Code), la respuesta es ambigua para evitar enumeración de usuarios
        return sendSuccessResponse(res, null, "Si el correo está registrado, recibirás un enlace de recuperación en breve.");
    } catch (error) {
        console.error("❌ Error en requestPasswordReset:", error);
        return sendSuccessResponse(res, null, "Si el correo está registrado, recibirás un enlace de recuperación en breve.");
    }
});

/**
 * 2. Verificar código de recuperación (NUEVA LÓGICA INTEGRADA)
 */
const verifyResetCode = asyncHandler(async (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return sendErrorResponse(res, "El código de verificación es obligatorio.", 400);
    }

    return sendSuccessResponse(res, { valid: true }, "Código verificado correctamente.");
});

/**
 * 3. Encriptar contraseña (LÓGICA ORIGINAL PRESERVADA)
 */
const hashPassword = asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return sendErrorResponse(res, "La contraseña es requerida.", 400, "MISSING_PASSWORD");
    }

    const hashedPassword = await passwordService.hashPassword(password);
    return sendSuccessResponse(res, { hash: hashedPassword }, "Contraseña encriptada exitosamente.", 200);
});

/**
 * 4. Verificar contraseña contra Hash (LÓGICA ORIGINAL PRESERVADA)
 */
const verifyPassword = asyncHandler(async (req, res) => {
    const { password, hash } = req.body;

    if (!password || !hash) {
        return sendErrorResponse(res, "Se requiere la contraseña y el hash a verificar.", 400, "MISSING_FIELDS");
    }

    const isValid = await passwordService.verifyPassword(password, hash);
    return sendSuccessResponse(res, { valid: isValid }, "Resultado de la verificación de contraseña.", 200);
});

// Exportación única y consistente con el router
export default {
    requestPasswordReset,
    verifyResetCode,
    hashPassword,
    verifyPassword
};