// Versión Arquitectura: V20.0 - Blindaje robusto de authMiddleware y normalización de verificación de tokens en wallet.routes.js
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\billetera\wallet.routes.js
 * Misión: Exponer las rutas de gestión de billetera bajo Clean Architecture, asegurando la compatibilidad
 * estricta del middleware de autenticación (verificarToken / authMiddleware) y previniendo errores de decodificación.
 */

import { Router } from 'express';
import { obtenerSaldo } from './wallet.controller.js';
import authMiddlewareModule from '../../middleware/auth.middleware.js';

// Resolución y normalización segura del middleware de autenticación (soporta default, exportaciones nombradas o función directa)
const authMiddleware = 
    authMiddlewareModule?.verificarToken || 
    authMiddlewareModule?.default || 
    (typeof authMiddlewareModule === 'function' ? authMiddlewareModule : null);

if (!authMiddleware || typeof authMiddleware !== 'function') {
    console.error("⚠️ [CIMCO-WALLET-ROUTES] Error crítico: authMiddleware no pudo resolverse como función válida.");
}

const router = Router();

// 🛡️ RUTA PROTEGIDA DE CONSULTA DE SALDO CON BLINDAJE DE TOKEN
router.get('/saldo', (req, res, next) => {
    if (!authMiddleware) {
        return res.status(500).json({
            success: false,
            error: "Error de configuración de seguridad: middleware de autenticación no disponible."
        });
    }
    return authMiddleware(req, res, next);
}, obtenerSaldo);

export default router;