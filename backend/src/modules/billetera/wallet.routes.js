// Versión Arquitectura: V21.0 - Incorporación de ruta POST /admin/operacion-manual con protección por token y middleware de rol esAdminCentral en wallet.routes.js
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\billetera\wallet.routes.js
 * Misión: Exponer las rutas de gestión de billetera bajo Clean Architecture, asegurando la compatibilidad
 * estricta del middleware de autenticación (verificarToken / authMiddleware) y previniendo errores de decodificación,
 * incorporando la ruta protegida de administración/CEO para ajustes manuales de saldo.
 */

import { Router } from 'express';
import { obtenerSaldo, gestionarSaldoManual } from './wallet.controller.js';
import authMiddlewareModule from '../../middleware/auth.middleware.js';

// Resolución y normalización segura del middleware de autenticación (soporta default, exportaciones nombradas o función directa)
const authMiddleware = 
    authMiddlewareModule?.verificarToken || 
    authMiddlewareModule?.default || 
    (typeof authMiddlewareModule === 'function' ? authMiddlewareModule : null);

// Resolución segura del middleware de verificación de rol administrador
const esAdminCentralMiddleware = 
    authMiddlewareModule?.esAdminCentral || 
    authMiddlewareModule?.esAdmin ||
    ((req, res, next) => {
        const rol = req.user?.rol || req.user?.role;
        if (['ADMIN', 'CEO', 'ADMINISTRADOR'].includes(rol?.toUpperCase())) {
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

// 🛡️ RUTA PROTEGIDA DE CONSULTA DE SALDO CON BLINDAJE DE TOKEN
router.get('/saldo', requiereAutenticacion, obtenerSaldo);

// 🛡️ RUTA PROTEGIDA ADMIN/CEO: GESTIÓN MANUAL DE SALDO (RECARGA / DÉBITO)
router.post('/admin/operacion-manual', requiereAutenticacion, esAdminCentralMiddleware, gestionarSaldoManual);

export default router;