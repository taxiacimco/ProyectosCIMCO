// Versión Arquitectura: V19.4 - Canalización con Middleware Anti-Duplicados Unificado para Registro de Pasajeros
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\pasajeros\pasajero.routes.js
 * Misión: Exposición de endpoints para perfil, direcciones favoritas, historial, registro y billetera virtual de pasajeros.
 * Ajuste V19.4: Incorporación obligatoria del middleware `validarPasajeroUnico` previo a `registrarPasajero` en las rutas de registro ('/', '/registro', '/registrar') para prevenir colisiones de datos personales y duplicados en DB/Firebase.
 */

import { Router } from 'express';
import { 
    obtenerPasajeros,
    registrarPasajero,
    validarPasajeroUnico,
    obtenerPerfilPasajero, 
    actualizarPerfilPasajero, 
    agregarDireccionFavorita, 
    eliminarDireccionFavorita,
    obtenerHistorialViajesPasajero,
    obtenerSaldoPasajero,
    recargarSaldoPasajero
} from './pasajero.controller.js';
import { verificarToken, esAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

// 📋 LECTURA GLOBAL DEDUPLICADA (ADMINISTRATIVA)
router.get('/', verificarToken, esAdmin, obtenerPasajeros);

// 📝 REGISTRO Y VALIDACIÓN DE UNICIDAD DE PASAJEROS
router.post('/', validarPasajeroUnico, registrarPasajero);
router.post('/registro', validarPasajeroUnico, registrarPasajero);
router.post('/registrar', validarPasajeroUnico, registrarPasajero);
router.post('/validar-unico', validarPasajeroUnico);

// 💰 RUTAS DE SALDO Y BILLETERA (Definidas antes de parámetros dinámicos)
router.get('/saldo/me', verificarToken, obtenerSaldoPasajero);
router.get('/saldo/:id', verificarToken, obtenerSaldoPasajero);
router.post('/saldo/recargar', verificarToken, esAdmin, recargarSaldoPasajero);

// 👤 GESTIÓN DE PERFIL CON ALIAS DE COMPATIBILIDAD
router.get('/perfil', verificarToken, obtenerPerfilPasajero);
router.put('/perfil', verificarToken, actualizarPerfilPasajero);

// 📍 GESTIÓN DE DIRECCIONES FAVORITAS
router.post('/direcciones', verificarToken, agregarDireccionFavorita);
router.delete('/direcciones/:direccionId', verificarToken, eliminarDireccionFavorita);

// 📜 HISTORIAL DE TRAYECTOS
router.get('/historial/viajes', verificarToken, obtenerHistorialViajesPasajero);

// 🔍 RUTAS DINÁMICAS Y COMPATIBILIDAD CON ID DE PARÁMETRO
router.get('/:id', verificarToken, obtenerPerfilPasajero);
router.put('/:id', verificarToken, actualizarPerfilPasajero);
router.post('/:id/direcciones', verificarToken, agregarDireccionFavorita);
router.delete('/:id/direcciones/:direccionId', verificarToken, eliminarDireccionFavorita);
router.get('/:id/historial', verificarToken, obtenerHistorialViajesPasajero);

export default router;