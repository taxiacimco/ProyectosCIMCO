// Versión Arquitectura: V19.9 - Adaptación de wallet.routes.js a ES Modules con exportación nativa para compatibilidad total con el core
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\billetera\wallet.routes.js
 * Misión: Proveer el enrutador de Express bajo sintaxis ES Modules nativa (import/export), 
 * evitando errores de ámbito CommonJS (`require is not defined`) en proyectos con "type": "module".
 */

import { Router } from 'express';
import { obtenerSaldo } from './wallet.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js'; // Ajusta según la ruta relativa o alias si aplica

const router = Router();

// Ruta: GET /api/billetera/saldo
router.get('/saldo', authMiddleware, obtenerSaldo);

export default router;