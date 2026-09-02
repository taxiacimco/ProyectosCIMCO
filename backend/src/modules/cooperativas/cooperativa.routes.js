// Versión Arquitectura: V1.3 - Soporte Dinámico y Compatibilidad para Búsqueda Flexible BSON, Firebase UID y NIT en Cooperativas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\cooperativas\cooperativa.routes.js
 * Misión: Definición y securización de las rutas de gestión de cooperativas.
 * Ajuste V1.3: Incorporación de compatibilidad explícita de identificadores dinámicos (:id y :uid) para consultas, actualizaciones y estados de cooperativas/empresas en entornos híbridos MongoDB / Firebase.
 */

import { Router } from 'express';
import { 
  obtenerCooperativas, 
  obtenerCooperativaPorId,
  crearCooperativa, 
  cambiarEstadoCooperativa,
  actualizarCooperativa
} from './cooperativa.controller.js';

import { verificarToken, esAdminCentral } from '../../middleware/auth.middleware.js';

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
  if (req.params && req.params.uid) {
    req.params.id = req.params.uid;
  }
  return obtenerCooperativaPorId(req, res, next);
});

// 2. Operaciones Administrativas (Protegidas con Token y Rol Admin Central)
router.post('/', verificarToken, esAdminCentral, verificarPayloadModificacion, crearCooperativa);

router.patch('/:id/estado', verificarToken, esAdminCentral, verificarPayloadModificacion, cambiarEstadoCooperativa);
router.patch('/uid/:uid/estado', verificarToken, esAdminCentral, verificarPayloadModificacion, (req, res, next) => {
  if (req.params && req.params.uid) {
    req.params.id = req.params.uid;
  }
  return cambiarEstadoCooperativa(req, res, next);
});

router.put('/:id', verificarToken, esAdminCentral, verificarPayloadModificacion, actualizarCooperativa);
router.put('/uid/:uid', verificarToken, esAdminCentral, verificarPayloadModificacion, (req, res, next) => {
  if (req.params && req.params.uid) {
    req.params.id = req.params.uid;
  }
  return actualizarCooperativa(req, res, next);
});

export default router;