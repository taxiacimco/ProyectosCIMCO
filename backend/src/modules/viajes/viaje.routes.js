// Versión Arquitectura: V9.9 - Middleware de Blindaje de Payload y Trazabilidad Operativa
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.routes.js
 * Misión: Enrutador centralizado con interceptación de payloads para TAXIA CIMCO Core.
 */

import express from 'express';
import { 
    crearViaje, 
    obtenerViajesDisponibles, 
    aceptarViaje, 
    iniciarViaje, 
    completarViaje,
    recibirAlertaWompiLocal 
} from './viaje.controller.js';

const router = express.Router();

const verificarPayloadViaje = (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        console.error("⚠️ [CIMCO-SEGURIDAD] Operación bloqueada: Payload vacío.");
        return res.status(400).json({ success: false, message: "⚠️ ALERTA: Payload ausente." });
    }
    next();
};

router.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📡 [CIMCO-TRAFICO] ${req.method} ${req.originalUrl}`);
    }
    next();
});

router.post('/solicitar', verificarPayloadViaje, crearViaje);
router.get('/disponibles', obtenerViajesDisponibles);
router.post('/aceptar', verificarPayloadViaje, aceptarViaje);
router.post('/iniciar', verificarPayloadViaje, iniciarViaje);
router.post('/completar', verificarPayloadViaje, completarViaje);
router.post('/webhook-wompi', verificarPayloadViaje, recibirAlertaWompiLocal);

export default router;