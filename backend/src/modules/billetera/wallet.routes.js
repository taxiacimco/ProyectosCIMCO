// Versión Arquitectura: V21.4 - Exposición del Endpoint de Historial de Movimientos de Billetera (CIMCO-WALLET-ROUTES)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\billetera\wallet.routes.js
 * Misión: Exponer las rutas de gestión de billetera bajo Clean Architecture, asegurando la compatibilidad
 * estricta del middleware de autenticación (verificarToken / authMiddleware) y previniendo errores de decodificación,
 * registrando explícitamente los endpoints de saldo, historial, recargar y debitar saldo protegidos por autenticación.
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