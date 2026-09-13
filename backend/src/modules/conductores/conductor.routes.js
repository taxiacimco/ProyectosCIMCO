// Versión Arquitectura: V22.5 - Sanitización y Preservación de Identificadores (_id / uid) en Payload y Parámetros de Rutas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\conductores\conductor.routes.js
 * Misión: Exposición y protección de rutas para perfil, estados operativos, telemetría radar, recargas y administración de conductores.
 * Ajuste V22.5: Inclusión de middleware de sanitización y preservación estricta de identificadores (_id, uid, id, conductorId)
 * en req.body, req.params y req.query para asegurar el emparejamiento unívoco entre colecciones y controladores.
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

// Adaptadores de compatibilidad de middlewares para evitar referencias nulas y blindar la ejecución
const autenticarJWT = authMiddleware.autenticarJWT || authMiddleware.verificarToken;
const verificarRol = authMiddleware.verificarRol 
    ? authMiddleware.verificarRol 
    : (rol) => (rol === 'admin' ? (authMiddleware.esAdmin || ((req, res, next) => next())) : (req, res, next) => next());
const esAdmin = authMiddleware.esAdmin || verificarRol('admin');
const esAdminCentralMiddleware = authMiddleware.esAdminCentralMiddleware || authMiddleware.esAdmin || verificarRol('admin');

const router = express.Router();

/**
 * 🛡️ Middleware de Sanitización y Preservación de Identificadores (_id, uid, id, conductorId, usuarioId)
 * Garantiza que los identificadores de MongoDB, Firebase Auth y Conductor se mantengan intactos,
 * limpios de espacios en blanco y sin transformaciones destructivas que afecten el emparejamiento entre colecciones.
 */
const sanitizarIdentificadoresPayload = (req, res, next) => {
    const sanitizarColeccion = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        const camposTarget = ['_id', 'uid', 'id', 'conductorId', 'usuarioId', 'targetId', 'despachadorId', 'pasajeroId'];

        camposTarget.forEach((campo) => {
            if (obj[campo] !== undefined && obj[campo] !== null) {
                if (typeof obj[campo] === 'string') {
                    const valorLimpio = obj[campo].trim();
                    if (valorLimpio.length > 0) {
                        obj[campo] = valorLimpio;
                    }
                }
            }
        });
    };

    try {
        if (req.params) sanitizarColeccion(req.params);
        if (req.body) sanitizarColeccion(req.body);
        if (req.query) sanitizarColeccion(req.query);
    } catch (err) {
        console.error('⚠️ [CONDUCTOR-ROUTES-SANITY] Error al sanitizar identificadores de la petición:', err);
    }

    next();
};

// Inyección del middleware de sanitización a nivel global del enrutador
router.use(sanitizarIdentificadoresPayload);

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
router.get('/capital-circulante', autenticarJWT, esAdminCentralMiddleware, obtenerCapitalCirculante);

/**
 * 🏢 APROBACIÓN Y CAMBIO DE ESTADO (Secretaría / Admin) - BLINDADO CON JWT Y ESADMINCENTRALMIDDLEWARE
 */
router.put('/cambiar-estado/:id', autenticarJWT, esAdminCentralMiddleware, cambiarEstadoConductor);
router.patch('/cambiar-estado/:id', autenticarJWT, esAdminCentralMiddleware, cambiarEstadoConductor);
router.patch('/:id/estado', autenticarJWT, esAdminCentralMiddleware, cambiarEstadoConductor);
router.put('/:id/estado', autenticarJWT, esAdminCentralMiddleware, cambiarEstadoConductor);
router.put('/:id/estado-admin', autenticarJWT, esAdminCentralMiddleware, cambiarEstadoConductor);
router.patch('/:id/aprobar', autenticarJWT, esAdminCentralMiddleware, (req, res) => {
    if (!req.body) req.body = {};
    req.body.nuevoEstado = 'APROBADO';
    return cambiarEstadoConductor(req, res);
});

/**
 * 📊 MÉTRICAS ADMINISTRATIVAS
 */
router.get('/metricas/capital-circulante', autenticarJWT, esAdminCentralMiddleware, obtenerCapitalCirculante);

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
// 💳 BILLETERA Y RECARGAS ATÓMICAS (PROTEGIDAS CON ESADMINCENTRALMIDDLEWARE)
// ==================================================================
router.post('/saldos/admin/recargar', autenticarJWT, esAdminCentralMiddleware, recargarSaldoAdmin);
router.post('/billeteras/admin/recargar', autenticarJWT, esAdminCentralMiddleware, recargarBilleteraPorAdmin);
router.put('/:id/recargar', autenticarJWT, esAdminCentralMiddleware, recargarSaldoAdmin);
router.post('/:id/recargar', autenticarJWT, esAdminCentralMiddleware, recargarSaldoAdmin);
router.put('/recargar', autenticarJWT, esAdminCentralMiddleware, recargarSaldoAdmin);
router.post('/recargar', autenticarJWT, esAdminCentralMiddleware, recargarSaldoAdmin);

router.put('/ajustar-saldo/:uid', autenticarJWT, esAdminCentralMiddleware, ajustarSaldo);
router.put('/:id/ajuste', autenticarJWT, esAdminCentralMiddleware, ajustarSaldo);
router.post('/:id/ajuste', autenticarJWT, esAdminCentralMiddleware, ajustarSaldo);

router.post('/descuento-comision', autenticarJWT, descontarComisionViaje);
router.post('/descontar-comision', autenticarJWT, descontarComisionViaje);

router.get('/:conductorId/historial', autenticarJWT, obtenerHistorialConductor);

// ==================================================================
// 🔍 CONSULTAS Y MODIFICACIONES POR ID (RUTAS DINÁMICAS AL FINAL)
// ==================================================================
router.get('/:id', obtenerConductorPorId);
router.put('/:id', actualizarConductor);
router.patch('/:id', actualizarConductor);
router.delete('/:id', autenticarJWT, esAdminCentralMiddleware, eliminarConductor);

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