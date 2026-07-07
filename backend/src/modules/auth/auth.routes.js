// Versión Arquitectura: V15.6 - Conservación Absoluta de Endpoints de Autenticación
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.routes.js
 * Misión: Enrutador perimetral de autenticación alineado al 100% con las exportaciones del controlador V20.8.
 * Nota: No requiere modificaciones estructurales internas dado que la firma de sus métodos expuestos permanece inmutable,
 * preservando el pipeline middleware, control de carga híbrida multer y validaciones previas de producción.
 */

import express from 'express'; 
import multer from 'multer'; 
import { 
    login, 
    register, 
    solicitarRecuperacion, 
    restablecerPassword, 
    verificarTelefono 
} from './auth.controller.js';
import { validateRegisterPayload, verificarToken, esDespachador } from '../../middleware/auth.middleware.js';

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
 * 🚀 ENDPOINTS DE ACCESO Y REGISTRO (Mapeo Simétrico V20.8)
 */
router.post('/login', verificarPayloadLogin, login);
router.post('/register', verificarPayloadLogin, interceptorCargaHibrida, validateRegisterPayload, register);
router.post('/check-phone', verificarPayloadLogin, verificarTelefono);
router.post('/forgot-password', verificarPayloadLogin, solicitarRecuperacion);
router.post('/reset-password', verificarPayloadLogin, restablecerPassword);

export default router;