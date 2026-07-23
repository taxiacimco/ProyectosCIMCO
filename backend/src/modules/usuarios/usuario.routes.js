// Versión Arquitectura: V16.5 - Rutas del Módulo de Usuarios y Despachadores
import { Router } from 'express';
import { 
    obtenerUsuarios, 
    obtenerUsuarioPorId, 
    actualizarUsuario, 
    obtenerDespachadores, 
    asignarTerminalDespachador 
} from './usuario.controller.js';

const router = Router();

// Rutas Generales de Usuario
router.get('/', obtenerUsuarios);
router.get('/:id', obtenerUsuarioPorId);
router.put('/:id', actualizarUsuario);

// Rutas de Despachadores
router.get('/rol/despachadores', obtenerDespachadores);
router.post('/despachador/asignar-terminal', asignarTerminalDespachador);

export default router;