// Versión Arquitectura: V16.9 - Enrutador Protegido y Alias REST para Pasajeros
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\pasajeros\pasajero.routes.js
 * Misión: Exposición perimetral de servicios para el ciclo de vida de pasajeros y direcciones guardadas.
 * Ajuste V16.9: Integridad de mapa de rutas verificada de forma atómica.
 */

import { Router } from 'express';
import { 
    obtenerPasajeros, 
    obtenerPerfilPasajero, 
    actualizarPerfilPasajero, 
    agregarDireccionFavorita, 
    eliminarDireccionFavorita,
    obtenerHistorialViajesPasajero 
} from './pasajero.controller.js';
import { verificarToken, esAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

// 📋 LECTURA GLOBAL (ADMINISTRATIVA)
router.get('/', verificarToken, esAdmin, obtenerPasajeros);

// 👤 GESTIÓN DE PERFIL CON ALIAS DE COMPATIBILIDAD
router.get('/perfil', verificarToken, obtenerPerfilPasajero);
router.put('/perfil', verificarToken, actualizarPerfilPasajero);
router.get('/:id', verificarToken, obtenerPerfilPasajero);
router.put('/:id', verificarToken, actualizarPerfilPasajero);

// 📍 GESTIÓN DE DIRECCIONES FAVORITAS
router.post('/direcciones', verificarToken, agregarDireccionFavorita);
router.post('/:id/direcciones', verificarToken, agregarDireccionFavorita);
router.delete('/direcciones/:direccionId', verificarToken, eliminarDireccionFavorita);
router.delete('/:id/direcciones/:direccionId', verificarToken, eliminarDireccionFavorita);

// 📜 HISTORIAL DE TRAYECTOS
router.get('/historial/viajes', verificarToken, obtenerHistorialViajesPasajero);
router.get('/:id/historial', verificarToken, obtenerHistorialViajesPasajero);

export default router;