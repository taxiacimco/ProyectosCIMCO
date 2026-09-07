// Versión Arquitectura: V19.5 - Protección de Mutación de Roles, Estado y Permisos con esAdminCentralMiddleware
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.routes.js
 * Misión: Exponer alias explícitos para el endpoint de ajuste de saldo (`/:id/saldo`), endpoints unificados de billetera y
 *         proteger estrictamente las mutaciones de roles, activación/desactivación de cuentas y elevación de permisos (access_level)
 *         mediante el middleware centralizado `esAdminCentralMiddleware`.
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
    recargarSaldo,
    ajustarSaldoBilletera
} from './usuario.controller.js';
import { verificarToken, esAdmin, esAdminCentralMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// ==================================================================
// 1. DIRECTORIO GLOBAL UNIFICADO (Ruta prioritaria de alto rendimiento)
// ==================================================================
router.get('/directorio-global', verificarToken, esAdmin, obtenerDirectorioGlobal);

// ==================================================================
// 2. RUTAS DE DESPACHADORES Y FINANZAS MULTI-ROL (Rutas específicas ordenadas al inicio)
// ==================================================================
router.get('/rol/despachadores', verificarToken, obtenerDespachadores);
router.post('/despachador/asignar-terminal', verificarToken, esAdminCentralMiddleware, asignarTerminalDespachador);

// 💰 FINANZAS Y SALDOS DE DESPACHADORES Y USUARIOS MULTIRROL
router.get('/despachador/saldo/:id', verificarToken, obtenerSaldoDespachador);
router.post('/despachador/recargar', verificarToken, esAdminCentralMiddleware, recargarSaldoDespachador);

// 💳 ENDPOINTS PARA BILLETERA Y AJUSTE DE SALDO (POLIMÓRFICOS Y GERENCIALES)
router.post('/debit', verificarToken, ajustarSaldoBilletera);
router.post('/recargar', verificarToken, esAdminCentralMiddleware, ajustarSaldoBilletera);
router.post('/ajustar-saldo', verificarToken, esAdminCentralMiddleware, ajustarSaldoBilletera);

// ✅ CORRECCIÓN QUIRÚRGICA V19.1: Mapeo explícito de `/:id/saldo` para absorber peticiones PUT/POST del cliente
router.put('/:id/saldo', verificarToken, esAdminCentralMiddleware, recargarSaldo);
router.post('/:id/saldo', verificarToken, esAdminCentralMiddleware, recargarSaldo);
router.put('/:id/recargar', verificarToken, esAdminCentralMiddleware, recargarSaldo);
router.post('/:id/recargar', verificarToken, esAdminCentralMiddleware, recargarSaldo);

// ==================================================================
// 3. RUTAS PERFIL PROPIO (Soporte por Token)
// ==================================================================
router.get('/perfil/me', verificarToken, obtenerUsuarioPorId);
router.put('/perfil/me', verificarToken, actualizarUsuario);

// ==================================================================
// 4. RUTAS DE MUTACIÓN DE ROLES, ACTIVACIÓN/DESACTIVACIÓN Y PERMISOS (PROTECCIÓN CENTRALIZADA)
// ==================================================================
router.put('/:id/rol', verificarToken, esAdminCentralMiddleware, actualizarUsuario);
router.patch('/:id/rol', verificarToken, esAdminCentralMiddleware, actualizarUsuario);
router.put('/:id/estado', verificarToken, esAdminCentralMiddleware, actualizarUsuario);
router.patch('/:id/estado', verificarToken, esAdminCentralMiddleware, actualizarUsuario);
router.put('/:id/access-level', verificarToken, esAdminCentralMiddleware, actualizarUsuario);
router.patch('/:id/access-level', verificarToken, esAdminCentralMiddleware, actualizarUsuario);

// ==================================================================
// 5. RUTAS GENERALES DE USUARIO Y PARÁMETROS DINÁMICOS
// ==================================================================
router.get('/', verificarToken, esAdmin, obtenerUsuarios);
router.get('/:id', verificarToken, obtenerUsuarioPorId);
router.put('/:id', verificarToken, esAdminCentralMiddleware, actualizarUsuario);
router.delete('/:id', verificarToken, esAdminCentralMiddleware, eliminarUsuario);

export default router;