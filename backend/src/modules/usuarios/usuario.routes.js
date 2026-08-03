// Versión Arquitectura: V19.1 - Mapeo Expreso y Alias Dinámicos de Saldo Gerencial Anti-404
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.routes.js
 * Misión: Exponer alias explícitos para el endpoint de ajuste de saldo (`/:id/saldo`) resolviendo el error [CIMCO-ROUTE-MISS].
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
    recargarSaldoDespachador,
    recargarSaldo
} from './usuario.controller.js';
import { verificarToken, esAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

// ==================================================================
// 1. DIRECTORIO GLOBAL UNIFICADO (Ruta prioritaria de alto rendimiento)
// ==================================================================
router.get('/directorio-global', verificarToken, esAdmin, obtenerDirectorioGlobal);

// ==================================================================
// 2. RUTAS DE DESPACHADORES Y FINANZAS MULTI-ROL (Rutas específicas ordenadas al inicio)
// ==================================================================
router.get('/rol/despachadores', verificarToken, obtenerDespachadores);
router.post('/despachador/asignar-terminal', verificarToken, esAdmin, asignarTerminalDespachador);

// 💰 FINANZAS Y SALDOS DE DESPACHADORES Y USUARIOS MULTIRROL
router.get('/despachador/saldo/:id', verificarToken, obtenerSaldoDespachador);
router.post('/despachador/recargar', verificarToken, esAdmin, recargarSaldoDespachador);

// 💳 ENDPOINTS PARA AJUSTE DE SALDO (ABONO / DÉBITO) POR EL ADMIN
// ✅ CORRECCIÓN QUIRÚRGICA V19.1: Mapeo explícito de `/:id/saldo` para absorber peticiones PUT/POST del cliente
router.put('/:id/saldo', verificarToken, esAdmin, recargarSaldo);
router.post('/:id/saldo', verificarToken, esAdmin, recargarSaldo);
router.put('/:id/recargar', verificarToken, esAdmin, recargarSaldo);
router.post('/:id/recargar', verificarToken, esAdmin, recargarSaldo);

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