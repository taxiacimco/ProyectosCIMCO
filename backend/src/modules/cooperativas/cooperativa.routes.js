// Versión Arquitectura: V1.4 - Protección de Creación y Aprobación de Cooperativas vía esAdminCentralMiddleware
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\cooperativas\cooperativa.routes.js
 * Misión: Definición y securización de las rutas de gestión de cooperativas.
 * Ajuste V1.4: Protección estricta de las operaciones de creación, aprobación y actualización mediante esAdminCentralMiddleware,
 * asegurando la integridad de transacciones atómicas de estados y balances globales.
 */

import { Router } from 'express';
import { 
  obtenerCooperativas, 
  obtenerCooperativaPorId,
  crearCooperativa, 
  cambiarEstadoCooperativa,
  actualizarCooperativa
} from './cooperativa.controller.js';

import * as authMiddleware from '../../middleware/auth.middleware.js';

const { verificarToken, esAdminCentral, esAdminCentralMiddleware: esAdminCentralMw } = authMiddleware;

// Garantizar resolución del middleware de administración central independientemente del named export en auth.middleware
const esAdminCentralMiddleware = esAdminCentralMw || esAdminCentral;

const router = Router();

// Middleware local para interceptar payloads vacíos en peticiones de modificación
const verificarPayloadModificacion = (req, res, next) => {
  if (!req || !req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: "El cuerpo de la petición no contiene datos de actualización." 
    });
  }
  next();
};

// ==================================================================
// RUTAS SECTORIZADAS DE COOPERATIVAS
// ==================================================================

// 1. Lecturas (Soporte para BSON ObjectId, Firebase UID, NIT e Identificadores Custom)
router.get('/', verificarToken, obtenerCooperativas);
router.get('/:id', verificarToken, obtenerCooperativaPorId);
router.get('/uid/:uid', verificarToken, (req, res, next) => {
  if (req && req.params && req.params.uid) {
    req.params.id = req.params.uid;
  }
  return obtenerCooperativaPorId(req, res, next);
});

// 2. Operaciones Administrativas (Protegidas con Token y Rol Admin Central)
router.post('/', verificarToken, esAdminCentralMiddleware, verificarPayloadModificacion, crearCooperativa);

router.patch('/:id/estado', verificarToken, esAdminCentralMiddleware, verificarPayloadModificacion, cambiarEstadoCooperativa);
router.patch('/uid/:uid/estado', verificarToken, esAdminCentralMiddleware, verificarPayloadModificacion, (req, res, next) => {
  if (req && req.params && req.params.uid) {
    req.params.id = req.params.uid;
  }
  return cambiarEstadoCooperativa(req, res, next);
});

router.put('/:id', verificarToken, esAdminCentralMiddleware, verificarPayloadModificacion, actualizarCooperativa);
router.put('/uid/:uid', verificarToken, esAdminCentralMiddleware, verificarPayloadModificacion, (req, res, next) => {
  if (req && req.params && req.params.uid) {
    req.params.id = req.params.uid;
  }
  return actualizarCooperativa(req, res, next);
});

export default router;