// Versión Arquitectura: V10.0 - Blindaje Perimetral JWT en Nodos de Despacho
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.routes.js
 * Misión: Enrutador centralizado con interceptación de payloads para TAXIA CIMCO Core.
 * Ajuste: Inyección de verificarToken para cerrar brecha de endpoints operativos públicos.
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

// 🛡️ Inyección de Middleware de Seguridad
import { verificarToken } from '../../middleware/auth.middleware.js';

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

// 🛡️ RUTAS BLINDADAS: Requieren Token de sesión válido
router.post('/solicitar', verificarToken, verificarPayloadViaje, crearViaje);
router.get('/disponibles', verificarToken, obtenerViajesDisponibles);
router.post('/aceptar', verificarToken, verificarPayloadViaje, aceptarViaje);
router.post('/iniciar', verificarToken, verificarPayloadViaje, iniciarViaje);
router.post('/completar', verificarToken, verificarPayloadViaje, completarViaje);

// 🌐 RUTAS DE INTEGRACIÓN: Webhooks (Validación mediante firma criptográfica local)
router.post('/webhook-wompi', verificarPayloadViaje, recibirAlertaWompiLocal);

export default router;