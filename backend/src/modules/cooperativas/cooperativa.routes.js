// Versión Arquitectura: V1.2 - Protección JWT y Perfil Administrativo en Rutas de Cooperativa
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\cooperativas\cooperativa.routes.js
 * Misión: Definición y securización de las rutas de gestión de cooperativas.
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

// 1. Lecturas
router.get('/', verificarToken, obtenerCooperativas);
router.get('/:id', verificarToken, obtenerCooperativaPorId);

// 2. Operaciones Administrativas (Protegidas con Token y Rol Admin Central)
router.post('/', verificarToken, esAdminCentral, verificarPayloadModificacion, crearCooperativa);
router.patch('/:id/estado', verificarToken, esAdminCentral, verificarPayloadModificacion, cambiarEstadoCooperativa);
router.put('/:id', verificarToken, esAdminCentral, verificarPayloadModificacion, actualizarCooperativa);

export default router;