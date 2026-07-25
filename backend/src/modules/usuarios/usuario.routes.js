// Versión Arquitectura: V16.10 - Enrutamiento Jerarquizado de Usuarios y Despachadores
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.routes.js
 * Misión: Enrutamiento seguro y jerarquizado de la gestión de usuarios y asignación de terminales.
 * Ajuste V16.10: Orden jerárquico estricto para rutas estáticas y middlewares de seguridad.
 */

import { Router } from 'express';
import { 
    obtenerUsuarios, 
    obtenerUsuarioPorId, 
    actualizarUsuario, 
    eliminarUsuario,
    obtenerDespachadores, 
    asignarTerminalDespachador 
} from './usuario.controller.js';
import { verificarToken, esAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

// ==================================================================
// 1. RUTAS DE DESPACHADORES (Rutas específicas ordenadas al inicio)
// ==================================================================
router.get('/rol/despachadores', verificarToken, obtenerDespachadores);
router.post('/despachador/asignar-terminal', verificarToken, esAdmin, asignarTerminalDespachador);

// ==================================================================
// 2. RUTAS PERFIL PROPIO (Soporte por Token)
// ==================================================================
router.get('/perfil/me', verificarToken, obtenerUsuarioPorId);
router.put('/perfil/me', verificarToken, actualizarUsuario);

// ==================================================================
// 3. RUTAS GENERALES DE USUARIO Y PARÁMETROS DINÁMICOS
// ==================================================================
router.get('/', verificarToken, esAdmin, obtenerUsuarios);
router.get('/:id', verificarToken, obtenerUsuarioPorId);
router.put('/:id', verificarToken, actualizarUsuario);
router.delete('/:id', verificarToken, esAdmin, eliminarUsuario);

export default router;