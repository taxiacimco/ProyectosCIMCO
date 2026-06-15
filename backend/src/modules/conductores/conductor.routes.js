// Versión Arquitectura: V11.0 - Homologación de Pasarela Polimórfica y Resolución 404
/**
 * Ubicación: backend/src/modules/conductores/conductor.routes.js
 * Misión: Gestión de rutas de conductores con blindaje de acceso, telemetría de estado, sanitización radial y recargas manuales.
 * Ajuste: Se corrige el endpoint de recarga a '/saldos/admin/recargar' para acoplar perfectamente con el llamado del frontend.
 */

import express from 'express';
import { 
    registrarConductor, 
    obtenerConductores, 
    obtenerHistorialConductor, 
    obtenerConductoresDisponibles,
    obtenerConductoresCercanos, 
    recargarBilleteraPorAdmin,
    actualizarUbicacionGPS      
} from './conductor.controller.js';
import { verificarToken, esAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// ==================================================================
// 🛡️ MIDDLEWARE: SANITIZACIÓN DE PARÁMETROS RADIALES (ANTI-ABUSO)
// ==================================================================
const validarTelemetriaRadar = (req, res, next) => {
    const { lat, lng, radioMaxKm } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ success: false, message: "⚠️ [SEGURIDAD] Coordenadas GPS (lat, lng) requeridas para el escaneo." });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadio = radioMaxKm ? parseFloat(radioMaxKm) : 5;

    if (isNaN(parsedLat) || isNaN(parsedLng) || isNaN(parsedRadio)) {
        return res.status(400).json({ success: false, message: "⚠️ [SEGURIDAD] Tipado numérico inválido en parámetros de telemetría geoespacial." });
    }

    if (parsedRadio < 0.1 || parsedRadio > 25) {
        return res.status(400).json({ success: false, message: "⚠️ [SEGURIDAD] El radio de escaneo debe estar entre 0.1 y 25 Km." });
    }

    next(); 
};

// 🛡️ RUTAS PÚBLICAS Y DE CONSULTA
router.post('/', registrarConductor);
router.get('/', obtenerConductores);

// 📡 RUTA DE TELEMETRÍA
router.get('/disponibles', obtenerConductoresDisponibles);

/**
 * @route   GET /api/conductores/radar/cercanos
 * @desc    Obtener conductores activos en un rango radial específico mediante $geoNear
 */
router.get('/radar/cercanos', validarTelemetriaRadar, obtenerConductoresCercanos);

/**
 * @route   POST /api/conductores/actualizar-ubicacion
 * @desc    Inyección masiva y veloz de coordenadas GPS en tiempo real para Leaflet.js
 */
router.post('/actualizar-ubicacion', actualizarUbicacionGPS);

// 🛡️ RUTAS BLINDADAS (Requieren autenticación/roles)
router.get('/:conductorId/historial', verificarToken, obtenerHistorialConductor);

/**
 * 💰 RUTA CRÍTICA: Recargas Manuales por el Administrador/CEO
 * @route   POST /api/conductores/saldos/admin/recargar
 * Ajuste: Endpoint sincronizado con el bus del Frontend (AdminPanel.jsx) para fulminar el Error 404.
 */
router.post('/saldos/admin/recargar', verificarToken, esAdmin, recargarBilleteraPorAdmin);

export default router;