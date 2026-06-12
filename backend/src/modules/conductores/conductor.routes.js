// Versión Arquitectura: V10.8 - Activación de Blindaje de Seguridad en Rutas de Recarga Financiera
/**
 * Ubicación: backend/src/modules/conductores/conductor.routes.js
 * Misión: Gestión de rutas de conductores con blindaje de acceso, telemetría de estado, sanitización radial y recargas manuales.
 */

import express from 'express';
import { 
    registrarConductor, 
    obtenerConductores, 
    obtenerHistorialConductor, 
    obtenerConductoresDisponibles,
    obtenerConductoresCercanos, 
    recargarBilleteraPorAdmin,  // 💰 Controlador consolidado de recargas
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
        return res.status(400).json({ success: false, message: "⚠️ [SEGURIDAD] Coordenadas GPS (lat, lng) obligatorias." });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadio = parseFloat(radioMaxKm) || 5;

    // Prevención de inyección NaN o ubicaciones imposibles en la tierra
    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        return res.status(400).json({ success: false, message: "⚠️ [SEGURIDAD] Latitud corrupta o fuera de rango." });
    }
    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        return res.status(400).json({ success: false, message: "⚠️ [SEGURIDAD] Longitud corrupta o fuera de rango." });
    }

    // Limitador de Búsqueda Radial: Máximo 25 KM de radio para proteger CPU de MongoDB Atlas
    if (parsedRadio <= 0 || parsedRadio > 25) {
         return res.status(400).json({ success: false, message: "⚠️ [SEGURIDAD] El radio de escaneo debe estar entre 0.1 y 25 Km." });
    }

    next(); // Parámetros limpios y seguros, permitir paso al controlador
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
 * @route   POST /api/conductores/recargar-saldo
 * Nota: Ruta blindada con verificación de Token y control de acceso (esAdmin) activado para Producción.
 */
router.post('/recargar-saldo', verificarToken, esAdmin, recargarBilleteraPorAdmin); 

export default router;