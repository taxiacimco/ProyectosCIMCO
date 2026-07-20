// Versión Arquitectura: V11.6 - Desacoplamiento de Middleware de Validación para Flujos de Andén
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.routes.js
 * Misión: Enrutador centralizado con interceptación de payloads e inyección de aduana perimetral y validación estricta.
 * Ajuste V11.6: FUSIÓN ATÓMICA. Se resuelve el descalce perimetral del middleware 'validarDespacho' en la ruta 
 *              '/despachar-inmediato'. Dicho middleware exige estrictamente la presencia de 'viajeId' en el cuerpo, 
 *              lo cual es incompatible con la creación síncrona en andén desde cero. Se preserva 'validarDespacho' 
 *              únicamente en '/despachar' y se blinda '/despachar-inmediato' con verificaciones estructurales.
 */

import express from 'express';
import { 
    solicitarViaje, 
    aceptarViaje, 
    completarViaje,
    recibirAlertaWompiLocal,
    despacharViajeAtomico,
    crearYDespacharViajeAtomico
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
        return res.status(400).json({ 
            success: false, 
            error: "⚠️ ALERTA DE ARQUITECTURA: Payload entrante nulo o ausente en el bus operativo." 
        });
    }
    next();
};

// 📡 LOGGER OPERACIONAL EN CANAL DE DESARROLLO (Optimizado sin envoltura de middleware)
router.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📡 [CIMCO-TRAFICO] Interceptada petición: ${req?.method} ${req?.originalUrl}`);
    }
    next();
});

// ==================================================================
// CORREDORES OPERATIVOS Y RUTAS BLINDADAS DE PRODUCCIÓN
// ==================================================================

// 1. Solicitar servicio (Pasajero radial)
router.post('/solicitar', verificarToken, verificarPayloadViaje, solicitarViaje);

// 2. Aceptar viaje (Conductor autónomo - Permite bypass en stress_test)
router.post('/aceptar', verificarToken, verificarPayloadViaje, aceptarViaje);

// 3. Cierre contable del servicio (Liquidación de comisión del 10%)
router.post('/completar', verificarToken, verificarPayloadViaje, completarViaje);

// 4. Webhook de confirmación de pasarela de pagos Wompi (Tráfico externo asíncrono)
router.post('/wompi-webhook', recibirAlertaWompiLocal);

// 5. 🚀 RUTA DE DESPACHO INTERMUNICIPAL (Viaje Solicitado Preexistente en Sistema)
// Requiere 'validarDespacho' de forma estricta porque exige un 'viajeId' que ya existe en la base de datos central.
router.post('/despachar', verificarToken, validarDespacho, despacharViajeAtomico);

// 6. 🎟️ RUTA MAESTRA DE CREACIÓN Y DESPACHO INMEDIATO (Forzado e inyectado desde Taquilla/Andén)
// Excluye 'validarDespacho' para evitar el bloqueo del validador de viajeId inexistente, asegurando la consistencia atómica.
router.post('/despachar-inmediato', verificarToken, verificarPayloadViaje, crearYDespacharViajeAtomico);

export default router;