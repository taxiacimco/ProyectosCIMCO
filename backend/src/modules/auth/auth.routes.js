// Versión Arquitectura: V15.2 - Mantenimiento de Multiplexión y Emparejamiento con Controlador V18.2
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.routes.js
 * Misión: Enrutador de autenticación unificado con validación estructural estricta de payload (Anti-Undefined),
 * puente /check-phone activo, e interceptación perimetral de roles en el registro para blindar la base de datos.
 * Ajuste: Se mantiene interceptor de carga híbrida intacto, alineado con el nuevo bloqueador de roles del controlador.
 */

import express from 'express'; 
import multer from 'multer'; 
import { 
    loginUsuario, 
    registrarUsuario, 
    solicitarRecuperacion, 
    restablecerClave, 
    verificarTelefono 
} from './auth.controller.js';
import { validateRegisterPayload, verificarToken, esDespachador } from '../../middleware/auth.middleware.js';

const router = express.Router();

// ⚙️ CONFIGURACIÓN DE ALMACENAMIENTO DE BUFFER EN MEMORIA
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 🛡️ Guarda de Seguridad: Límite estricto de 5MB por carga binaria
    }
});

// 📡 MIDDLEWARE DE TRAZABILIDAD OPERACIONAL
router.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📡 [CIMCO-ROUTER] Tráfico entrante en módulo Auth: ${req.method} ${req.originalUrl}`);
    }
    next();
});

// 🛡️ GUARDA DE SEGURIDAD LOCAL (Fusión Atómica de Blindaje Anti-Undefined)
const verificarPayloadLogin = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
        if (!req || !req.body || Object.keys(req.body).length === 0) {
            console.error("⚠️ [CIMCO-SEGURIDAD] Intento de transacción bloqueado: Body ausente o indefinido.");
            return res.status(400).json({ success: false, message: "El cuerpo de la solicitud no puede estar vacío." });
        }
    }
    next();
};

/**
 * 🎛️ MIDDLEWARE INTERCEPTOR MULTIPLEXOR (Carga Híbrida Condicional)
 */
const interceptorCargaHibrida = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
        if (process.env.NODE_ENV !== 'production') {
            console.log("📸 [CIMCO-HIBRIDO] Detectada trama binaria multipart/form-data. Activando pipeline Multer.");
        }
        upload.single('foto_perfil')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                console.error("❌ [CIMCO-MULTER-ERROR]:", err);
                return res.status(400).json({ success: false, message: `Límite binario excedido o error en transporte: ${err.message}` });
            } else if (err) {
                console.error("❌ [CIMCO-FATAL-LOAD-ERROR]:", err);
                return res.status(500).json({ success: false, message: "Fallo crítico en el procesamiento del flujo binario." });
            }
            
            if (!req.body || Object.keys(req.body).length === 0) {
                return res.status(400).json({ success: false, message: "Estructura FormData vacía tras deserialización." });
            }
            next();
        });
    } else {
        if (process.env.NODE_ENV !== 'production') {
            console.log("📄 [CIMCO-HIBRIDO] Detectada trama estándar application/json. Bypass directo.");
        }
        next();
    }
};

/**
 * 🚀 ENDPOINTS DE ACCESO Y REGISTRO
 */
router.post('/login', verificarPayloadLogin, loginUsuario);

// 🛡️ COMPUERTA REFORZADA CON INTEGRACIÓN HÍBRIDA MULTIPLEXADA:
router.post('/register', verificarPayloadLogin, interceptorCargaHibrida, validateRegisterPayload, registrarUsuario);

// 🔍 RUTAS DE VERIFICACIÓN Y SEGURIDAD OTP
router.post('/check-phone', verificarPayloadLogin, verificarTelefono);
router.post('/forgot-password', verificarPayloadLogin, solicitarRecuperacion);
router.post('/reset-password', verificarPayloadLogin, restablecerClave);

/**
 * 🔥 RUTA DE PRUEBA DE FUEGO - ADUANA LOGÍSTICA
 */
router.get('/prueba-despacho', verificarToken, esDespachador, (req, res) => {
    res.status(200).json({
        success: true,
        message: "✅ ¡Acceso Concedido! Bienvenido al Panel de Control Logístico.",
        usuario: req.usuario
    });
});

export default router;