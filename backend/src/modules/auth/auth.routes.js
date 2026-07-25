// Versión Arquitectura: V15.10 - Inclusión de Alias de Rutas para Actualización de Perfil
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.routes.js
 * Misión: Enrutador perimetral de autenticación alineado con soporte multicamino para perfil.
 * Ajuste V15.10: Normalización de sintaxis de importación y mantenimiento de rutas duplicadas por alias.
 */

import express from 'express'; 
import multer from 'multer'; 
import { 
    login, 
    register, 
    solicitarOTP, 
    verificarOTPyRestablecer, 
    verificarTelefono,
    updateProfile
} from './auth.controller.js';
import { validateRegisterPayload, verificarToken } from '../../middleware/auth.middleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite estricto de 5MB por archivo
});

router.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📡 [CIMCO-ROUTER] Tráfico en Auth: ${req.method} ${req.originalUrl}`);
    }
    next();
});

const verificarPayloadLogin = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
        if (!req || !req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ success: false, message: "El cuerpo de la solicitud no puede estar vacío." });
        }
    }
    next();
};

const interceptorCargaHibrida = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
        upload.single('foto_perfil')(req, res, (err) => {
            if (err) return res.status(400).json({ success: false, message: `Error binario: ${err.message}` });
            next();
        });
    } else {
        next();
    }
};

/**
 * 🚀 ENDPOINTS DE ACCESO Y REGISTRO
 */
router.post('/login', verificarPayloadLogin, login);
router.post('/register', interceptorCargaHibrida, validateRegisterPayload, register);

/**
 * 🔑 PASARELA DE RECUPERACIÓN DE CREDENCIALES (OTP)
 */
router.post('/solicitar-otp', solicitarOTP);
router.post('/restablecer', verificarOTPyRestablecer);

/**
 * 📡 VALIDACIONES EN CALIENTE (REGISTRO DINÁMICO)
 */
router.post('/verificar-telefono', verificarTelefono);

/**
 * 🔄 GESTIÓN DE PERFIL DE USUARIO (Rutas Protegidas con Alias de Compatibilidad)
 */
router.put('/update-profile', verificarToken, updateProfile);
router.put('/perfil', verificarToken, updateProfile);
router.put('/profile', verificarToken, updateProfile);
router.patch('/update-profile', verificarToken, updateProfile);

export default router;