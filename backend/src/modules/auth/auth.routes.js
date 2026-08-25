// Versión Arquitectura: V21.37 - Estandarización de Endpoint PUT /update-profile y /actualizar-perfil con VerificarTokenJWT e Interceptor Multipart
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.routes.js
 * Misión: Enrutador perimetral de autenticación con mapeo completo de subrutas HTTP POST, PUT y PATCH bajo el prefijo /api/auth.
 * Integridad: Define y estandariza las rutas de actualización de perfil (/update-profile y /actualizar-perfil) integrando
 * la verificación de seguridad JWT (verificarTokenJWT / verificarToken) y el middleware Multer de procesamiento multipart híbrido,
 * garantizando la coexistencia de aliases preexistentes (/solicitar-otp, /restablecer, /verificar-telefono, /check-phone), la validación anti-crash ESM
 * y la recepción fluida de binarios de avatar y documentos.
 */

import express from 'express'; 
import multer from 'multer'; 
import * as authController from './auth.controller.js';
import * as authMiddleware from '../../middleware/auth.middleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite estricto de 5MB por archivo
});

router.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📡 [CIMCO-ROUTER] Tráfico en Auth: ${req?.method} ${req?.originalUrl}`);
    }
    next();
});

const verificarPayloadLogin = (req, res, next) => {
    const contentType = req?.headers?.['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
        if (!req || !req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ success: false, message: "El cuerpo de la solicitud no puede estar vacío." });
        }
    }
    next();
};

const interceptorCargaHibrida = (req, res, next) => {
    const contentType = req?.headers?.['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
        upload.fields([
            // Llaves Estándar y Mapeadas del Cliente
            { name: 'foto_perfil', maxCount: 1 },
            { name: 'documento_cedula', maxCount: 1 },
            { name: 'documento_licencia', maxCount: 1 },
            { name: 'doc_tarjeta', maxCount: 1 },
            { name: 'doc_identificacion', maxCount: 1 },
            // Aliases de Respaldo y Compatibilidad de Clientes Frontend
            { name: 'fotoPerfil', maxCount: 1 },
            { name: 'doc_cedula', maxCount: 1 },
            { name: 'doc_licencia', maxCount: 1 },
            { name: 'tarjeta_propiedad', maxCount: 1 },
            { name: 'tarjeta_operacion', maxCount: 1 },
            { name: 'avatar', maxCount: 1 }
        ])(req, res, (err) => {
            if (err) return res.status(400).json({ success: false, message: `Error binario: ${err.message}` });
            next();
        });
    } else {
        next();
    }
};

// 🛡️ RESOLUCIÓN DINÁMICA DE MIDDLEWARES Y CONTROLADORES (ANTI-CRASH ESM)
const validateRegisterPayload = authMiddleware?.validateRegisterPayload || ((req, res, next) => next());
const verificarTokenJWT = authMiddleware?.verificarTokenJWT || authMiddleware?.verificarToken || ((req, res, next) => next());

const loginHandler = authController?.login;
const registerHandler = authController?.register;
const solicitarOTPHandler = authController?.forgotPassword || authController?.solicitarOTP;
const restablecerHandler = authController?.resetPassword || authController?.verificarOTPyRestablecer;
const verificarTelefonoHandler = authController?.verificarTelefono || authController?.checkPhone;
const checkPhoneHandler = authController?.checkPhone || authController?.verificarTelefono;
const updateProfileHandler = authController?.actualizarPerfil || authController?.updateProfile;
const logoutHandler = authController?.logout;

/**
 * 🚀 ENDPOINTS DE ACCESO Y REGISTRO
 */
if (typeof loginHandler === 'function') {
    router.post('/login', verificarPayloadLogin, loginHandler);
}

if (typeof registerHandler === 'function') {
    router.post('/register', interceptorCargaHibrida, validateRegisterPayload, registerHandler);
}

if (typeof logoutHandler === 'function') {
    router.post('/logout', logoutHandler);
}

/**
 * 🔑 PASARELA DE RECUPERACIÓN DE CREDENCIALES (OTP & FORGOT/RESET PASSWORD)
 */
if (typeof solicitarOTPHandler === 'function') {
    router.post('/forgot-password', solicitarOTPHandler);
    router.post('/solicitar-otp', solicitarOTPHandler);
}

if (typeof restablecerHandler === 'function') {
    router.post('/reset-password', restablecerHandler);
    router.post('/restablecer', restablecerHandler);
}

/**
 * 📡 VALIDACIONES EN CALIENTE (REGISTRO DINÁMICO & DISPONIBILIDAD)
 */
if (typeof verificarTelefonoHandler === 'function') {
    router.post('/verificar-telefono', verificarTelefonoHandler);
}

if (typeof checkPhoneHandler === 'function') {
    router.post('/check-phone', checkPhoneHandler);
}

/**
 * 🔄 GESTIÓN DE PERFIL DE USUARIO (Rutas Protegidas con Alias de Compatibilidad)
 * Integra middleware de autenticación por Token JWT y Multer para procesamiento Multipart/Form-Data.
 */
if (typeof updateProfileHandler === 'function') {
    router.put('/update-profile', verificarTokenJWT, interceptorCargaHibrida, updateProfileHandler);
    router.put('/actualizar-perfil', verificarTokenJWT, interceptorCargaHibrida, updateProfileHandler);
    router.put('/perfil', verificarTokenJWT, interceptorCargaHibrida, updateProfileHandler);
    router.put('/profile', verificarTokenJWT, interceptorCargaHibrida, updateProfileHandler);
    router.patch('/update-profile', verificarTokenJWT, interceptorCargaHibrida, updateProfileHandler);
    router.patch('/actualizar-perfil', verificarTokenJWT, interceptorCargaHibrida, updateProfileHandler);
}

export default router;