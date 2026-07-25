// Versión Arquitectura: V11.12 - Métrica de Capital Circulante y Protección de Rutas Estáticas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\conductores\conductor.routes.js
 * Misión: Asegurar el correcto mapeo de endpoints para el ciclo de vida del conductor, telemetría y contabilidad interna.
 * Ajuste V11.12: Inserción previa de la ruta de agregación métrica /metricas/capital-circulante antes de parámetros numéricos/dinámicos.
 */

import express from 'express';
import Conductor from '../../models/Conductor.js';
import { 
    registrarConductor, 
    obtenerConductores, 
    obtenerConductorPorId,
    actualizarConductor,
    eliminarConductor,
    obtenerHistorialConductor, 
    obtenerConductoresDisponibles,
    obtenerConductoresCercanos, 
    obtenerCapitalCirculante,
    recargarBilleteraPorAdmin,
    descontarComisionViaje,
    ajustarSaldo,
    actualizarUbicacionGPS,
    actualizarEstadoConductor,
    verificarBypassDesarrollo
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

    const { lat, lng } = req.query;

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
 * 📊 MÉTRICAS ADMINISTRATIVAS Y FINANCIERAS
 * @route   GET /api/conductores/metricas/capital-circulante
 * Ubicada antes de /:id para evitar intercepción de la ruta dinámicamente.
 */
router.get('/metricas/capital-circulante', verificarToken, esAdmin, obtenerCapitalCirculante);

/**
 * 📍 RADAR GEOESPACIAL
 * @route   GET /api/conductores/radar/cercanos
 */
router.get('/radar/cercanos', validarTelemetriaRadar, obtenerConductoresCercanos);

/**
 * 📡 TELEMETRÍA EN CALIENTE
 * @route   POST /api/conductores/actualizar-ubicacion
 */
router.post('/actualizar-ubicacion', actualizarUbicacionGPS);

/**
 * 🔄 SINCRONIZADOR HÍBRIDO DE ESTADOS
 * @route   PUT /api/conductores/estado
 */
router.put('/estado', actualizarEstadoConductor);

// ==================================================================
// 🔍 CONSULTAS Y MODIFICACIONES POR ID (REST STACK)
// ==================================================================
router.get('/:id', obtenerConductorPorId);
router.put('/:id', actualizarConductor);
router.delete('/:id', eliminarConductor);

// ==================================================================
// 🛡️ RUTAS BLINDADAS (Requieren Autenticación / Roles)
// ==================================================================
router.get('/:conductorId/historial', verificarToken, obtenerHistorialConductor);
router.post('/descuento-comision', verificarToken, descontarComisionViaje);
router.put('/ajustar-saldo/:uid', verificarToken, esAdmin, ajustarSaldo);

/**
 * 💰 RUTA CRÍTICA: Recargas Manuales por Administración
 * @route   POST /api/conductores/saldos/admin/recargar
 */
router.post('/saldos/admin/recargar', verificarToken, esAdmin, recargarBilleteraPorAdmin);

// ==================================================================
// 🛠️ RUTA EXCLUSIVA DE DEPURACIÓN PARA ENTORNOS DE DESARROLLO / STRESS TEST
// ==================================================================
router.put('/bypass-stress-saldo', verificarBypassDesarrollo, async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Payload de bypass corrupto o ausente." });
        }

        const { conductorId, saldo } = req.body;
        
        if (!conductorId) {
            return res.status(400).json({ success: false, message: "ID de conductor requerido." });
        }

        const actualizado = await Conductor.findByIdAndUpdate(
            conductorId, 
            { $set: { saldo: Number(saldo) }, $unset: { saldoWallet: "" } }, 
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