// Versión Arquitectura: V16.7 - Rutas del Módulo de Pasajeros
import { Router } from 'express';
import { 
    obtenerPasajeros, 
    obtenerPerfilPasajero, 
    actualizarPerfilPasajero, 
    agregarDireccionFavorita, 
    obtenerHistorialViajesPasajero 
} from './pasajero.controller.js';

const router = Router();

router.get('/', obtenerPasajeros);
router.get('/:id', obtenerPerfilPasajero);
router.put('/:id', actualizarPerfilPasajero);
router.post('/:id/direcciones', agregarDireccionFavorita);
router.get('/:id/historial', obtenerHistorialViajesPasajero);

export default router;