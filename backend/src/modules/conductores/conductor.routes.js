import express from 'express';
import { 
    registrarConductor, 
    obtenerConductores, 
    obtenerHistorialConductor, 
    recargarBilleteraPorAdmin 
} from './conductor.controller.js';
import { verificarToken, esAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', registrarConductor);
router.get('/', obtenerConductores);
router.get('/:conductorId/historial', obtenerHistorialConductor);

// RUTA BLINDADA QUIRÚRGICAMENTE: Pasa primero por verificarToken y luego por esAdmin
router.post('/recargar', verificarToken, esAdmin, recargarBilleteraPorAdmin);

export default router;