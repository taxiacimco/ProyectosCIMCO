// Versión Arquitectura: V9.5 - Consolidación Estricta de Módulos ESM y Rutas de Operatividad Híbrida
import express from 'express';
import { 
    crearViaje, 
    obtenerViajesDisponibles, 
    aceptarViaje, 
    iniciarViaje, 
    completarViaje 
} from './viaje.controller.js';

const router = express.Router();

// Ruta POST: El pasajero crea la solicitud de servicio geolocalizado
router.post('/', crearViaje);

// Ruta GET: El mototaxi visualiza el tablero de ofertas pendientes
router.get('/disponibles', obtenerViajesDisponibles);

// Ruta PUT: El mototaxi se adjudica el viaje (Asignación)
router.put('/:viajeId/aceptar', aceptarViaje);

// 🚀 Ruta PUT: Transición de estado a viaje en curso
router.put('/:viajeId/iniciar', iniciarViaje);

// Ruta PUT: El mototaxi finaliza el viaje al llegar al destino y activa módulo contable
router.put('/:viajeId/completar', completarViaje);

export default router;