// Versión Arquitectura: V19.3 - Enrutador Centralizado de Viajes y Despacho Operativo con Mapeo PATCH de Estado
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.routes.js
 * Misión: Enrutador centralizado con interceptación de payloads, inyección de aduana perimetral
 * y securización del ciclo de vida operacional del viaje (solicitud, aceptación, inicio, cambio de estado, cancelación, despacho y consultas).
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
import { validarDespacho } from '../../middleware/validate.middleware.js';

const router = express.Router();

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

// 5. Despacho Atómico y Flujos Intermunicipales / Taquilla
router.post('/despachar', validarDespacho, despacharViajeAtomico);
router.post('/despachar-atomico', validarDespacho, despacharViajeAtomico);
router.post('/despachar-inmediato', verificarPayloadViaje, crearYDespacharViajeAtomico);

// ==================================================================
// 📊 CONSULTAS ESPECÍFICAS DE VIAJE
// ==================================================================

// 6. Lectura Individual de Viaje (Al final por jerarquía de parámetros dinámicos de Express)
router.get('/detalle/:id', obtenerDetalleViaje);
router.get('/:id', obtenerViajePorId);

export default router;