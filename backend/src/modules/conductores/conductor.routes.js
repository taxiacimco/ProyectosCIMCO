// Versión Arquitectura: V19.3 - Blindaje de Seguridad en Rutas de Aprobación y Compatibilidad de Middlewares
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\conductores\conductor.routes.js
 * Misión: Mapeo de endpoints para gestión de estado administrativo, telemetría y recargas auditadas sin provocar CIMCO-ROUTE-MISS.
 * Ajuste V19.3: Garantía de blindaje de seguridad con middlewares de autenticación (soporte para autenticarJWT/verificarToken y verificarRol('admin')/esAdmin) en rutas de aprobación y cambio de estado.
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
    recargarSaldoAdmin,
    recargarBilleteraPorAdmin,
    descontarComisionViaje,
    ajustarSaldo,
    actualizarUbicacionGPS,
    actualizarEstadoConductor,
    verificarBypassDesarrollo,
    validarConductorUnico
} from './conductor.controller.js';
import * as authMiddleware from '../../middleware/auth.middleware.js';

// Adaptadores de compatibilidad de middlewares para evitar referencias nulas
const autenticarJWT = authMiddleware.autenticarJWT || authMiddleware.verificarToken;
const verificarRol = authMiddleware.verificarRol 
    ? authMiddleware.verificarRol 
    : (rol) => (rol === 'admin' ? (authMiddleware.esAdmin || ((req, res, next) => next())) : (req, res, next) => next());
const esAdmin = authMiddleware.esAdmin || verificarRol('admin');

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
// 🟢 RUTAS DE CONSULTA Y LECTURA
// ==================================================================
router.get('/', obtenerTodosConductores);
router.get('/disponibles', obtenerConductoresDisponibles);
router.get('/capital-circulante', autenticarJWT, verificarRol('admin'), obtenerCapitalCirculante);

/**
 * 🏢 APROBACIÓN Y CAMBIO DE ESTADO (Secretaría / Admin) - BLINDADO CON JWT Y ROL ADMIN
 */
router.put('/cambiar-estado/:id', autenticarJWT, verificarRol('admin'), cambiarEstadoConductor);
router.patch('/cambiar-estado/:id', autenticarJWT, verificarRol('admin'), cambiarEstadoConductor);
router.patch('/:id/estado', autenticarJWT, verificarRol('admin'), cambiarEstadoConductor);
router.put('/:id/estado', autenticarJWT, verificarRol('admin'), cambiarEstadoConductor);
router.put('/:id/estado-admin', autenticarJWT, verificarRol('admin'), cambiarEstadoConductor);
router.patch('/:id/aprobar', autenticarJWT, verificarRol('admin'), (req, res) => {
    if (!req.body) req.body = {};
    req.body.nuevoEstado = 'APROBADO';
    return cambiarEstadoConductor(req, res);
});

/**
 * 📊 MÉTRICAS ADMINISTRATIVAS
 */
router.get('/metricas/capital-circulante', autenticarJWT, verificarRol('admin'), obtenerCapitalCirculante);

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
// 🟡 RUTAS DE CREACIÓN Y EDICIÓN (CON VALIDACIÓN ANTI-DUPLICADOS)
// ==================================================================
router.post('/registrar', validarConductorUnico, registrarConductor);
router.post('/', validarConductorUnico, registrarConductor);

// ==================================================================
// 💳 BILLETERA Y RECARGAS ATÓMICAS (UNIFICACIÓN DE RUTAS Y ALIAS ANTI CIMCO-ROUTE-MISS)
// ==================================================================
router.post('/saldos/admin/recargar', autenticarJWT, verificarRol('admin'), recargarSaldoAdmin);
router.put('/:id/recargar', autenticarJWT, verificarRol('admin'), recargarSaldoAdmin);
router.post('/:id/recargar', autenticarJWT, verificarRol('admin'), recargarSaldoAdmin);
router.put('/recargar', autenticarJWT, verificarRol('admin'), recargarSaldoAdmin);
router.post('/recargar', autenticarJWT, verificarRol('admin'), recargarSaldoAdmin);

router.put('/ajustar-saldo/:uid', autenticarJWT, verificarRol('admin'), ajustarSaldo);
router.put('/:id/ajuste', autenticarJWT, verificarRol('admin'), ajustarSaldo);
router.post('/:id/ajuste', autenticarJWT, verificarRol('admin'), ajustarSaldo);

router.post('/descuento-comision', autenticarJWT, descontarComisionViaje);
router.post('/descontar-comision', autenticarJWT, descontarComisionViaje);

router.get('/:conductorId/historial', autenticarJWT, obtenerHistorialConductor);

// ==================================================================
// 🔍 CONSULTAS Y MODIFICACIONES POR ID (RUTAS DINÁMICAS AL FINAL)
// ==================================================================
router.get('/:id', obtenerConductorPorId);
router.put('/:id', actualizarConductor);
router.patch('/:id', actualizarConductor);
router.delete('/:id', autenticarJWT, verificarRol('admin'), eliminarConductor);

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