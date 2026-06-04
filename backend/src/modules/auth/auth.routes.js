// Versión Arquitectura: V14.3 - Fusión Atómica: Homologación de Enlaces de Validación Telefónica
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.routes.js
 * Misión: Enrutador de autenticación unificado con validación de payload (Anti-Undefined)
 * y exposición del puente /check-phone para destrabar el registro de flotas en el frontend.
 */

import express from 'express';
import { 
    loginUsuario, 
    registrarUsuario, 
    solicitarRecuperacion, 
    restablecerClave, 
    verificarTelefono 
} from './auth.controller.js';

const router = express.Router();

// 📡 MIDDLEWARE DE TRAZABILIDAD OPERACIONAL
router.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📡 [CIMCO-ROUTER] Tráfico entrante en módulo Auth: ${req.method} ${req.originalUrl}`);
    }
    next();
});

// 🛡️ GUARDA DE SEGURIDAD LOCAL (Fusión Atómica de Blindaje Anti-Undefined)
const verificarPayloadLogin = (req, res, next) => {
    if (!req || !req.body || Object.keys(req.body).length === 0) {
        console.error("⚠️ [CIMCO-SEGURIDAD] Intento de transacción bloqueado: Body ausente o indefinido.");
        return res.status(400).json({ success: false, message: "El cuerpo de la solicitud no puede estar vacío." });
    }
    next();
};

/**
 * 🚀 ENDPOINTS DE ACCESO Y REGISTRO (Homologados)
 */
// Ruta principal de login y registro blindadas
router.post('/login', verificarPayloadLogin, loginUsuario);
router.post('/register', verificarPayloadLogin, registrarUsuario);

// 🔍 RUTAS DE VERIFICACIÓN Y SEGURIDAD OTP
// 💡 PUENTE HÍBRIDO INTERFAZ-GATEWAY: Se mapea '/check-phone' al controlador core para resolver el error 404
router.post('/check-phone', verificarTelefono);
router.post('/verificar-telefono', verificarTelefono);

router.post('/solicitar-recuperacion', solicitarRecuperacion);
router.post('/restablecer-clave', restablecerClave);

export default router;