// Versión Arquitectura: V11.9 - Fusión de Sanitización Avanzada y Endpoints de Estrés de Depuración
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\conductores\conductor.routes.js
 * Misión: Asegurar el correcto mapeo de endpoints para el ciclo de vida del conductor, telemetría y contabilidad interna.
 * Ajuste V11.9: Fusión atómica de la sanitización perimetral avanzada radial, protección de recargas manuales por admin y preservación del bypass de saldo para stress-testing.
 */

import express from 'express';
import mongoose from 'mongoose';
import { 
    registrarConductor, 
    obtenerConductores, 
    obtenerHistorialConductor, 
    obtenerConductoresDisponibles,
    obtenerConductoresCercanos, 
    recargarBilleteraPorAdmin,
    actualizarUbicacionGPS,
    actualizarEstadoConductor 
} from './conductor.controller.js';
import { verificarToken, esAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// ==================================================================
// 🛡️ MIDDLEWARE: SANITIZACIÓN DE PARÁMETROS RADIALES (ANTI-ABUSO)
// ==================================================================
const validarTelemetriaRadar = (req, res, next) => {
    if (!req || !req.query) {
        return res.status(400).json({
            success: false,
            message: "⚠️ Estructura de solicitud corrupta o vacía."
        });
    }

    const { lat, lng, radioMaxKm } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({
            success: false,
            message: "⚠️ Parámetros de geolocalización insuficientes para inicializar barrido radial."
        });
    }

    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
        return res.status(400).json({
            success: false,
            message: "⚠️ Estructura de coordenadas corrupta o con tipo de dato incorrecto."
        });
    }

    next();
};

// ==================================================================
// 📡 RUTAS PÚBLICAS / DE LOGÍSTICA GENERAL
// ==================================================================
router.post('/registrar', registrarConductor);
router.post('/', registrarConductor);
router.get('/', obtenerConductores);

// 📡 RUTA DE TELEMETRÍA BÁSICA
router.get('/disponibles', obtenerConductoresDisponibles);

/**
 * 📍 RADAR GEOESPACIAL 
 * @route   GET /api/conductores/radar/cercanos
 * @desc    Obtener unidades activas en un rango radial específico filtrando por rol y saldo.
 */
router.get('/radar/cercanos', validarTelemetriaRadar, obtenerConductoresCercanos);

/**
 * 📡 TELEMETRÍA EN CALIENTE
 * @route   POST /api/conductores/actualizar-ubicacion
 * @desc    Inyección masiva y veloz de coordenadas GPS en tiempo real para Leaflet.js
 */
router.post('/actualizar-ubicacion', actualizarUbicacionGPS);

/**
 * 🔄 SINCRONIZADOR HÍBRIDO DE ESTADOS
 * @route   PUT /api/conductores/estado
 * @desc    Actualiza el estado (active/busy/offline) en Mongo y refleja en Firestore
 */
router.put('/estado', actualizarEstadoConductor);

// ==================================================================
// 🛡️ RUTAS BLINDADAS (Requieren Autenticación / Roles)
// ==================================================================
router.get('/:conductorId/historial', verificarToken, obtenerHistorialConductor);

/**
 * 💰 RUTA CRÍTICA: Recargas Manuales por Administración
 * @route   POST /api/conductores/saldos/admin/recargar
 * @desc    Permite a los administradores inyectar saldo a cuentas mediante ID, ID Operativo o Teléfono.
 * @access  Privado [Admin, Gerente]
 */
router.post('/saldos/admin/recargar', verificarToken, esAdmin, recargarBilleteraPorAdmin);

// ==================================================================
// 🛠️ RUTA EXCLUSIVA DE DEPURACIÓN PARA ENTORNOS DE DESARROLLO / STRESS TEST
// ==================================================================
router.put('/bypass-stress-saldo', async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Payload de bypass corrupto o ausente." });
        }

        const { conductorId, saldo } = req.body;
        
        if (!conductorId) {
            return res.status(400).json({ success: false, message: "ID de conductor requerido." });
        }

        const Conductor = mongoose.model('Conductor'); 
        
        const actualizado = await Conductor.findByIdAndUpdate(
            conductorId, 
            { $set: { saldo: Number(saldo), balance: Number(saldo) } }, 
            { new: true }
        );
        
        if (!actualizado) {
            return res.status(404).json({ success: false, message: "Conductor no localizado en Atlas." });
        }
        
        return res.status(200).json({ success: true, data: actualizado });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

export default router;