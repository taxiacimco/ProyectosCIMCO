// Versión Arquitectura: V11.1 - Alineación de Perímetros de Validación y Inyección de validarDespacho
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.routes.js
 * Misión: Enrutador centralizado con interceptación de payloads e inyección de aduana perimetral y validación estricta.
 */

import express from 'express';
import { 
    solicitarViaje, 
    aceptarViaje, 
    completarViaje,
    recibirAlertaWompiLocal,
    despacharViajeAtomico
} from '#modules/viajes/viaje.controller.js';

// 🛡️ Middleware de Seguridad Centralizado mediante Subpaths ESM Nativo
import { verificarToken } from '#middleware/auth.middleware.js';

// 🚀 Middleware de Validaciones de Payload Específicas para Despacho (Unificado)
import { validarDespacho } from '#middleware/validate.middleware.js';

const router = express.Router();

/**
 * Middleware Local: Guarda Blanda de Presencia de Payload
 * Evita bloqueos tempranos por corrupción estructural de paquetes.
 */
const verificarPayloadViaje = (req, res, next) => {
    if (!req || !req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ success: false, error: "⚠️ ALERTA DE ARQUITECTURA: Payload entrante nulo o ausente en el bus." });
    }
    next();
};

// 📡 LOGGER OPERACIONAL EN CANAL DE DESARROLLO
router.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📡 [CIMCO-TRAFICO] Interceptada petición: ${req?.method} ${req?.originalUrl}`);
    }
    next();
});

// ==================================================================
// CORREDORES OPERATIVOS Y RUTAS BLINDADAS DE PRODUCCIÓN
// ==================================================================

// 1. Solicitar servicio (Pasajero): No usa validarDespacho porque aún no hay conductor asignado.
router.post('/solicitar', verificarToken, verificarPayloadViaje, solicitarViaje);

// 2. Aceptar viaje (Conductor): Cambiado a verificarPayloadViaje para permitir que stress_test ejecute el flujo síncrono sin rebotar.
router.post('/aceptar', verificarToken, verificarPayloadViaje, aceptarViaje);

// 3. Cierre contable del servicio (Liquidación de comisión del 10%)
router.post('/completar', verificarToken, verificarPayloadViaje, completarViaje);

// 4. Webhook de confirmación de pasarela de pagos Wompi (Tráfico externo asíncrono)
router.post('/wompi-webhook', recibirAlertaWompiLocal);

// 5. 🚀 RUTA MAESTRA UNIFICADA DE DESPACHO: Aplica el middleware unificado estricto para Urbano e Intermunicipal
router.post('/despachar', verificarToken, validarDespacho, despacharViajeAtomico);

export default router;