// Versión Arquitectura: V16.10 - Rutas Operativas y de Monitoreo
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.routes.js
 * Misión: Enrutador centralizado con interceptación de payloads e inyección de aduana perimetral.
 * Ajuste V16.10: Normalización de sintaxis de importación y preservación del orden jerárquico.
 */

import express from 'express';
import { 
    solicitarViaje, 
    aceptarViaje, 
    completarViaje,
    cancelarViaje,
    obtenerViajes,
    obtenerViajePorId,
    recibirAlertaWompiLocal,
    despacharViajeAtomico,
    crearYDespacharViajeAtomico
} from './viaje.controller.js';

import { verificarToken } from '../../middleware/auth.middleware.js';
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

// Logger en entorno de desarrollo
router.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📡 [CIMCO-TRAFICO] Interceptada petición: ${req?.method} ${req?.originalUrl}`);
    }
    next();
});

// ==================================================================
// CORREDORES OPERATIVOS Y RUTAS BLINDADAS DE PRODUCCIÓN
// ==================================================================

// 1. Lecturas y Monitoreo General
router.get('/', verificarToken, obtenerViajes);

// 2. Solicitar servicio (Pasajero radial)
router.post('/solicitar', verificarToken, verificarPayloadViaje, solicitarViaje);

// 3. Aceptar viaje (Conductor autónomo)
router.post('/aceptar', verificarToken, verificarPayloadViaje, aceptarViaje);

// 4. Cierre contable del servicio (Liquidación de comisión 10%)
router.post('/completar', verificarToken, verificarPayloadViaje, completarViaje);

// 5. Cancelación de Viaje
router.post('/cancelar', verificarToken, verificarPayloadViaje, cancelarViaje);

// 6. Webhook de confirmación Wompi
router.post('/wompi-webhook', recibirAlertaWompiLocal);

// 7. RUTA DE DESPACHO INTERMUNICIPAL (Viaje Solicitado Preexistente)
router.post('/despachar', verificarToken, validarDespacho, despacharViajeAtomico);

// 8. RUTA MAESTRA DE CREACIÓN Y DESPACHO INMEDIATO (Andén / Taquilla)
router.post('/despachar-inmediato', verificarToken, verificarPayloadViaje, crearYDespacharViajeAtomico);

// 9. Lectura Individual de Viaje (Al final por orden dinámico de Express)
router.get('/:id', verificarToken, obtenerViajePorId);

export default router;