// Versión Arquitectura: V10.3 - Inyección de Endpoint de Telemetría Activa (Disponibles)
/**
 * Ubicación: backend/src/modules/conductores/conductor.routes.js
 * Misión: Gestión de rutas de conductores con blindaje de acceso y telemetría de estado.
 */

import express from 'express';
import { 
    registrarConductor, 
    obtenerConductores, 
    obtenerHistorialConductor, 
    recargarBilleteraPorAdmin,
    obtenerConductoresDisponibles
} from './conductor.controller.js';
import { verificarToken, esAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// 🛡️ RUTAS PÚBLICAS Y DE CONSULTA
router.post('/', registrarConductor);
router.get('/', obtenerConductores);

// 📡 RUTA DE TELEMETRÍA (Fix: Exposición del canal para el radar del pasajero)
router.get('/disponibles', obtenerConductoresDisponibles);

// 🛡️ RUTAS BLINDADAS (Requieren autenticación/roles)
router.get('/:conductorId/historial', verificarToken, obtenerHistorialConductor);
router.post('/recargar', verificarToken, esAdmin, recargarBilleteraPorAdmin);

export default router;