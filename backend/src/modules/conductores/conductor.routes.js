// Versión Arquitectura: V13.0 - Definición de Rutas de Conductores y Administración
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\conductores\conductor.routes.js
 * Misión: Mapeo de endpoints para gestión de estado administrativo, telemetría y recargas auditadas.
 */

import express from 'express';
import Conductor from '../../models/Conductor.js';
import { 
    registrarConductor, 
    obtenerTodosConductores, 
    obtenerConductorPorId,
    actualizarConductor,
    eliminarConductor,
    cambiarEstadoConductor,
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
// 🛡️ MIDDLEWARE: SANITIZACIÓN DE PARÁMETROS RADIALES
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
            message: "⚠️ Parámetros de geolocalización insuficientes."
        });
    }

    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
        return res.status(400).json({
            success: false,
            message: "⚠️ Coordenadas corruptas o con tipo de dato incorrecto."
        });
    }

    next();
};

// ==================================================================
// 📡 RUTAS DE ADMINISTRACIÓN Y CONSULTA GENERAL
// ==================================================================
router.post('/registrar', registrarConductor);
router.post('/', registrarConductor);
router.get('/', obtenerTodosConductores);
router.get('/disponibles', obtenerConductoresDisponibles);

/**
 * 🏢 APROBACIÓN Y CAMBIO DE ESTADO (Secretaría / Admin)
 */
router.put('/cambiar-estado/:id', verificarToken, esAdmin, cambiarEstadoConductor);
router.patch('/cambiar-estado/:id', verificarToken, esAdmin, cambiarEstadoConductor);
router.put('/:id/estado-admin', verificarToken, esAdmin, cambiarEstadoConductor);

/**
 * 📊 MÉTRICAS ADMINISTRATIVAS
 */
router.get('/metricas/capital-circulante', verificarToken, esAdmin, obtenerCapitalCirculante);

/**
 * 📍 RADAR GEOESPACIAL
 */
router.get('/radar/cercanos', validarTelemetriaRadar, obtenerConductoresCercanos);

/**
 * 📡 TELEMETRÍA GPS
 */
router.post('/actualizar-ubicacion', actualizarUbicacionGPS);

/**
 * 🔄 ESTADOS OPERATIVOS (Encendido de Malla)
 */
router.put('/estado', actualizarEstadoConductor);

// ==================================================================
// 🛡️ RUTAS BLINDADAS DE FINANZAS Y CRÍTICAS
// ==================================================================
router.get('/:conductorId/historial', verificarToken, obtenerHistorialConductor);
router.post('/descuento-comision', verificarToken, descontarComisionViaje);
router.put('/ajustar-saldo/:uid', verificarToken, esAdmin, ajustarSaldo);

/**
 * 💰 RUTA CRÍTICA: Recargas por Administración
 */
router.post('/saldos/admin/recargar', verificarToken, esAdmin, recargarBilleteraPorAdmin);

// ==================================================================
// 🔍 CONSULTAS Y MODIFICACIONES POR ID (RUTAS DINÁMICAS AL FINAL)
// ==================================================================
router.get('/:id', obtenerConductorPorId);
router.put('/:id', actualizarConductor);
router.delete('/:id', eliminarConductor);

// ==================================================================
// 🛠️ RUTA DE DEPURACIÓN EN DESARROLLO
// ==================================================================
router.put('/bypass-stress-saldo', verificarBypassDesarrollo, async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Payload corrupto o ausente." });
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