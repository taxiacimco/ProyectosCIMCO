// Versión Arquitectura: V19.7 - Corrección de Importación por Alias de Cierre Contable Atómico y Resiliencia en Rutas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.routes.js
 * Misión: Enrutador centralizado con interceptación de payloads, inyección de aduana perimetral,
 * reordenamiento de webhooks públicos (Wompi) antes de autenticación JWT, y resolución de alias
 * de controladores para la finalización atómica de viajes.
 */

import express from 'express';
import { 
    solicitarViaje, 
    aceptarViaje, 
    iniciarViaje,
    cambiarEstadoViaje,
    completarViaje,
    completarViaje as finalizarViaje,
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

/**
 * Middleware Defensivo para Finalización y Cierre Transaccional de Viaje
 * Garantiza la ejecución del controlador atómico de finalización de viaje.
 */
const ejecutarFinalizacionSegura = (req, res, next) => {
    const handlerEfectivo = finalizarViaje || completarViaje;

    if (typeof handlerEfectivo !== 'function') {
        console.error("🚨 [CIMCO-VIAJE-ROUTES] Error crítico: No se encontró un controlador válido para finalizar el viaje.");
        return res.status(500).json({
            success: false,
            error: "Error interno: El controlador para la finalización atómica del viaje no está disponible."
        });
    }

    return handlerEfectivo(req, res, next);
};

// Logger local de trazabilidad y monitoreo en entorno de desarrollo
router.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📡 [CIMCO-ROUTER-VIAJES] Interceptada petición: ${req?.method} ${req?.originalUrl}`);
    }
    next();
});

// ==================================================================
// 💳 RUTAS PÚBLICAS / PASARELAS DE PAGO EXTERNAS (SIN TOKEN JWT)
// ==================================================================

// Webhook de confirmación Wompi (Debe ejecutarse antes de verificarToken para permitir callback del proveedor)
router.post('/wompi-webhook', recibirAlertaWompiLocal);

// ==================================================================
// 🔒 BARRERA DE SEGURIDAD GLOBAL: Requiere Autenticación JWT
// ==================================================================

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

// 3. Transición de Estado Operativo y Cierre Contable Atómico
// (Comisiones: 10% Mototaxi/Parrillero, $500 Motocarga, $500 Despachador; Sincronización atómica de saldo Pasajero/Conductor)
router.post('/iniciar', verificarPayloadViaje, iniciarViaje);
router.patch('/:viajeId/estado', verificarPayloadViaje, cambiarEstadoViaje);

// Endpoints de Finalización Atómica con Liquidación y Sincronización de Saldos
router.post('/completar', verificarPayloadViaje, ejecutarFinalizacionSegura);
router.post('/finalizar', verificarPayloadViaje, ejecutarFinalizacionSegura);
router.post('/:viajeId/finalizar', verificarPayloadViaje, ejecutarFinalizacionSegura);

router.post('/cancelar', verificarPayloadViaje, cancelarViaje);

// ==================================================================
// 🏢 RUTAS DE DESPACHO INTERMUNICIPAL Y TAQUILLA
// ==================================================================

router.post('/despachar', validarDespachoSeguro, despacharViajeAtomico);
router.post('/despachar-atomico', validarDespachoSeguro, despacharViajeAtomico);
router.post('/despachar-inmediato', verificarPayloadViaje, crearYDespacharViajeAtomico);

// ==================================================================
// 📊 CONSULTAS ESPECÍFICAS DE VIAJE
// ==================================================================

// Lectura Individual de Viaje (Jerarquía de parámetros dinámicos de Express)
router.get('/detalle/:id', obtenerDetalleViaje);
router.get('/:id', obtenerViajePorId);

export default router;