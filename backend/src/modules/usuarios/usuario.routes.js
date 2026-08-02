// Versión Arquitectura: V18.0 - Enrutamiento Jerarquizado de Directorio Global y Usuarios
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.routes.js
 * Misión: Enrutamiento seguro y jerarquizado de directorio global unificado, gestión de usuarios, asignación de terminales y recargas.
 */

import { Router } from 'express';
import { 
    obtenerDirectorioGlobal,
    obtenerUsuarios, 
    obtenerUsuarioPorId, 
    actualizarUsuario, 
    eliminarUsuario,
    obtenerDespachadores, 
    asignarTerminalDespachador,
    obtenerSaldoDespachador,
    recargarSaldoDespachador
} from './usuario.controller.js';
import { verificarToken, esAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

// ==================================================================
// 1. DIRECTORIO GLOBAL UNIFICADO (Ruta prioritaria de alto rendimiento)
// ==================================================================
router.get('/directorio-global', verificarToken, esAdmin, obtenerDirectorioGlobal);

// ==================================================================
// 2. RUTAS DE DESPACHADORES (Rutas específicas ordenadas al inicio)
// ==================================================================
router.get('/rol/despachadores', verificarToken, obtenerDespachadores);
router.post('/despachador/asignar-terminal', verificarToken, esAdmin, asignarTerminalDespachador);

// 💰 FINANZAS Y SALDOS DE DESPACHADORES
router.get('/despachador/saldo/:id', verificarToken, obtenerSaldoDespachador);
router.post('/despachador/recargar', verificarToken, esAdmin, recargarSaldoDespachador);

// ==================================================================
// 3. RUTAS PERFIL PROPIO (Soporte por Token)
// ==================================================================
router.get('/perfil/me', verificarToken, obtenerUsuarioPorId);
router.put('/perfil/me', verificarToken, actualizarUsuario);

// ==================================================================
// 4. RUTAS GENERALES DE USUARIO Y PARÁMETROS DINÁMICOS
// ==================================================================
router.get('/', verificarToken, esAdmin, obtenerUsuarios);
router.get('/:id', verificarToken, obtenerUsuarioPorId);
router.put('/:id', verificarToken, actualizarUsuario);
router.delete('/:id', verificarToken, esAdmin, eliminarUsuario);

export default router;