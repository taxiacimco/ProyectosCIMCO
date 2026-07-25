// Versión Arquitectura: V1.1 - Protección JWT y Perfil Administrativo en Rutas de Cooperativa
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\cooperativas\cooperativa.routes.js
 * Misión: Definición y securización de las rutas de gestión de cooperativas.
 */

import { Router } from 'express';
import { 
  obtenerCooperativas, 
  crearCooperativa, 
  cambiarEstadoCooperativa 
} from './cooperativa.controller.js';

// 🔹 Importación unificada de las exportaciones nombradas desde auth.middleware.js
import { verificarToken, esAdminCentral } from '../../middleware/auth.middleware.js';

const router = Router();

// Rutas protegidas con firma JWT y validación administrativa
router.get('/', verificarToken, obtenerCooperativas);
router.post('/', verificarToken, esAdminCentral, crearCooperativa);
router.patch('/:id/estado', verificarToken, esAdminCentral, cambiarEstadoCooperativa);

export default router;