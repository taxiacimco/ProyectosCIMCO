// Versión Arquitectura: V21.5 - Sanitización y Preservación de Identificadores (_id / uid) en Payload y Parámetros de Rutas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\billetera\wallet.routes.js
 * Misión: Exponer las rutas de gestión de billetera bajo Clean Architecture, asegurando la compatibilidad
 * estricta del middleware de autenticación (verificarToken / authMiddleware) y previniendo errores de decodificación,
 * registrando explícitamente los endpoints de saldo, historial, recargar y debitar saldo protegidos por autenticación.
 * Ajuste V21.5: Inclusión de middleware de sanitización y preservación estricta de identificadores (_id, uid, id, usuarioId, targetId)
 * en req.body, req.params y req.query para asegurar el emparejamiento unívoco entre colecciones y servicios de billetera.
 */

import { Router } from 'express';
import { obtenerSaldo, obtenerHistorialMovimientos, gestionarSaldoManual, recargarSaldo, debitarSaldo } from './wallet.controller.js';
import * as walletController from './wallet.controller.js';
import authMiddlewareModule from '../../middleware/auth.middleware.js';

// Resolución y normalización segura del middleware de autenticación (soporta default, exportaciones nombradas o función directa)
const authMiddleware = 
    authMiddlewareModule?.verificarToken || 
    authMiddlewareModule?.default || 
    (typeof authMiddlewareModule === 'function' ? authMiddlewareModule : null);

// Resolución segura del middleware de verificación de rol administrador central / CEO
const esAdminCentralMiddleware = 
    authMiddlewareModule?.esAdminCentralMiddleware ||
    authMiddlewareModule?.esAdminCentral || 
    authMiddlewareModule?.esAdmin ||
    ((req, res, next) => {
        const usuario = req.usuario || req.user;
        const level = usuario?.access_level !== undefined ? Number(usuario.access_level) : 0;
        const rol = (usuario?.rol || usuario?.role || '').toUpperCase();
        if (level >= 99 || ['ADMIN', 'CEO', 'ADMINISTRADOR'].includes(rol)) {
            return next();
        }
        return res.status(403).json({ success: false, message: "Acceso denegado: Requiere privilegios de Administrador Central / CEO." });
    });

if (!authMiddleware || typeof authMiddleware !== 'function') {
    console.error("⚠️ [CIMCO-WALLET-ROUTES] Error crítico: authMiddleware no pudo resolverse como función válida.");
}

const router = Router();

/**
 * 🛡️ Middleware de Sanitización y Preservación de Identificadores (_id, uid, id, usuarioId, targetId)
 * Garantiza que los identificadores de MongoDB, Firebase Auth y Billetera se mantengan intactos,
 * limpios de espacios en blanco y sin transformaciones destructivas que afecten el emparejamiento entre colecciones.
 */
const sanitizarIdentificadoresPayload = (req, res, next) => {
    const sanitizarColeccion = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        const camposTarget = ['_id', 'uid', 'id', 'usuarioId', 'targetId', 'conductorId', 'pasajeroId', 'despachadorId', 'transaccionId', 'billeteraId'];

        camposTarget.forEach((campo) => {
            if (obj[campo] !== undefined && obj[campo] !== null) {
                if (typeof obj[campo] === 'string') {
                    const valorLimpio = obj[campo].trim();
                    if (valorLimpio.length > 0) {
                        obj[campo] = valorLimpio;
                    }
                }
            }
        });
    };

    try {
        if (req.params) sanitizarColeccion(req.params);
        if (req.body) sanitizarColeccion(req.body);
        if (req.query) sanitizarColeccion(req.query);
    } catch (err) {
        console.error('⚠️ [WALLET-ROUTES-SANITY] Error al sanitizar identificadores de la petición:', err);
    }

    next();
};

// Inyección del middleware de sanitización a nivel global de router
router.use(sanitizarIdentificadoresPayload);

// Middleware protector wrapper para garantizar ejecución segura de autenticación
const requiereAutenticacion = (req, res, next) => {
    if (!authMiddleware) {
        return res.status(500).json({
            success: false,
            error: "Error de configuración de seguridad: middleware de autenticación no disponible."
        });
    }
    return authMiddleware(req, res, next);
};

// Helper dinámico anti-crash para despachar controladores específicos o usar gestionarSaldoManual como fallback
const resolverHandler = (handlerNombre, fallbackHandler) => (req, res, next) => {
    const fn = walletController[handlerNombre] || fallbackHandler;
    if (typeof fn === 'function') {
        return fn(req, res, next);
    }
    return res.status(501).json({
        success: false,
        message: `El endpoint '${req.originalUrl}' aún no tiene un controlador asignado.`
    });
};

// 🛡️ RUTAS PROTEGIDAS DE CONSULTA E HISTORIAL DE BILLETERA
router.get('/saldo', requiereAutenticacion, obtenerSaldo);
router.get('/historial', requiereAutenticacion, resolverHandler('obtenerHistorialMovimientos', obtenerHistorialMovimientos));

// 🛡️ RUTAS PROTEGIDAS DE OPERACIONES EN BILLETERA (RECARGA Y DÉBITO)
router.post('/recargar', requiereAutenticacion, resolverHandler('recargarSaldo', recargarSaldo));
router.post('/debitar', requiereAutenticacion, resolverHandler('debitarSaldo', debitarSaldo));

// 🛡️ RUTAS PROTEGIDAS ADMIN/CEO: GESTIÓN DE SALDOS Y FONDOS GLOBALES
router.post('/admin/operacion-manual', requiereAutenticacion, esAdminCentralMiddleware, gestionarSaldoManual);
router.post('/recargas-manuales', requiereAutenticacion, esAdminCentralMiddleware, resolverHandler('recargarSaldoManual', gestionarSaldoManual));
router.post('/ajustes-caja', requiereAutenticacion, esAdminCentralMiddleware, resolverHandler('ajustarCaja', gestionarSaldoManual));
router.post('/reversiones', requiereAutenticacion, esAdminCentralMiddleware, resolverHandler('revertirTransaccion', gestionarSaldoManual));
router.post('/conciliaciones', requiereAutenticacion, esAdminCentralMiddleware, resolverHandler('conciliarSaldos', gestionarSaldoManual));

export default router;