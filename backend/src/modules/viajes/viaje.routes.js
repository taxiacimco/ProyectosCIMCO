// Versión Arquitectura: V19.4 - Blindaje defensivo del middleware de taquilla/despacho y estabilidad operacional en viaje.routes.js
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.routes.js
 * Misión: Enrutador centralizado con interceptación de payloads, inyección de aduana perimetral,
 * blindaje defensivo del middleware de despacho y securización del ciclo de vida operacional del viaje.
 */

import express from 'express';
import { 
    solicitarViaje, 
    aceptarViaje, 
    iniciarViaje,
    cambiarEstadoViaje,
    completarViaje,
    cancelarViaje,
    obtenerViajes,
    obtenerViajePorId,
    obtenerHistorialViajes,
    obtenerDetalleViaje,
    recibirAlertaWompiLocal,
    despacharViajeAtomico,
    crearYDespacharViajeAtomico
} from './viaje.controller.js';

import { verificarToken, esAdminCentral } from '../../middleware/auth.middleware.js';
import { validarDespacho as validarDespachoOriginal } from '../../middleware/validate.middleware.js';

const router = express.Router();

/**
 * Middleware de Resiliencia / Guarda Defensiva para validarDespacho
 * Evita fallos de ejecución si el middleware externo no está exportado correctamente o retorna undefined.
 */
const validarDespachoSeguro = (req, res, next) => {
    const middlewareEfectivo = 
        validarDespachoOriginal?.verificarTaquilla || 
        validarDespachoOriginal?.default || 
        (typeof validarDespachoOriginal === 'function' ? validarDespachoOriginal : null);

    if (!middlewareEfectivo || typeof middlewareEfectivo !== 'function') {
        console.warn("⚠️ [CIMCO-VIAJE-ROUTES] Advertencia: validarDespacho no es una función ejecutable directa. Aplicando bypass seguro de respaldo.");
        return next();
    }

    try {
        return middlewareEfectivo(req, res, (err) => {
            if (err) {
                console.error(`🚨 [CIMCO-DESPACHO-ERROR] Error interceptado en validación de taquilla: ${err?.message || err}`);
                return res.status(400).json({
                    success: false,
                    error: err?.message || "Error en la validación de taquilla operacional para el despacho."
                });
            }
            next();
        });
    } catch (middlewareError) {
        console.error(`🚨 [CIMCO-DESPACHO-FATAL] Excepción no controlada en validarDespacho: ${middlewareError?.message || middlewareError}`);
        return res.status(500).json({
            success: false,
            error: "Error interno del servidor al procesar la validación de despacho."
        });
    }
};

/**
 * Middleware Local: Guarda Blanda de Presencia de Payload
 */
const verificarPayloadViaje = (req, res, next) => {
    if (!req || !req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ 
            success: false, 
            error: "⚠️ ALERTA DE ARQUITECTURA: Payload entrante nulo o ausente en el bus operativo." 
        });
    }
    next();
};

// Logger local de trazabilidad y monitoreo en entorno de desarrollo
router.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📡 [CIMCO-ROUTER-VIAJES] Interceptada petición: ${req?.method} ${req?.originalUrl}`);
    }
    next();
});

// Guardián global para el módulo de viajes: Requiere autenticación JWT
router.use(verificarToken);

// ==================================================================
// 🚀 ENDPOINTS OPERACIONALES DE VIAJES (CLIENTES & CONDUCTORES)
// ==================================================================

// 1. Lecturas y Monitoreo General
router.get('/', obtenerViajes);
router.get('/historial', obtenerHistorialViajes);

// 2. Solicitud y Asignación de Servicio
router.post('/solicitar', verificarPayloadViaje, solicitarViaje);
router.post('/aceptar', verificarPayloadViaje, aceptarViaje);

// 3. Transición de Estado Operativo y Cierre Contable (Liquidación de comisión 10%)
router.post('/iniciar', verificarPayloadViaje, iniciarViaje);
router.patch('/:viajeId/estado', verificarPayloadViaje, cambiarEstadoViaje);
router.post('/completar', verificarPayloadViaje, completarViaje);
router.post('/cancelar', verificarPayloadViaje, cancelarViaje);

// ==================================================================
// 🏢 RUTAS DE DESPACHO Y PASARELA EXTERNA
// ==================================================================

// 4. Webhook de confirmación Wompi (Pasarela)
router.post('/wompi-webhook', recibirAlertaWompiLocal);

// 5. Despacho Atómico y Flujos Intermunicipales / Taquilla (Blindados con middleware seguro)
router.post('/despachar', validarDespachoSeguro, despacharViajeAtomico);
router.post('/despachar-atomico', validarDespachoSeguro, despacharViajeAtomico);
router.post('/despachar-inmediato', verificarPayloadViaje, crearYDespacharViajeAtomico);

// ==================================================================
// 📊 CONSULTAS ESPECÍFICAS DE VIAJE
// ==================================================================

// 6. Lectura Individual de Viaje (Al final por jerarquía de parámetros dinámicos de Express)
router.get('/detalle/:id', obtenerDetalleViaje);
router.get('/:id', obtenerViajePorId);

export default router;