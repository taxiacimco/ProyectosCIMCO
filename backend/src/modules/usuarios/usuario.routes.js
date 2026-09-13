// Versión Arquitectura: V19.6 - Sanitización y Preservación de Identificadores (_id / uid) en Payload y Parámetros de Rutas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.routes.js
 * Misión: Exponer alias explícitos para el endpoint de ajuste de saldo (`/:id/saldo`), endpoints unificados de billetera y
 *         proteger estrictamente las mutaciones de roles, activación/desactivación de cuentas y elevación de permisos (access_level)
 *         mediante el middleware centralizado `esAdminCentralMiddleware`.
 * Ajuste V19.6: Inclusión de middleware de sanitización y preservación estricta de identificadores (_id, uid, id, usuarioId, targetId, despachadorId)
 * en req.body, req.params y req.query para asegurar el emparejamiento unívoco entre colecciones y controladores del módulo de usuarios.
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

/**
 * 🛡️ Middleware de Sanitización y Preservación de Identificadores (_id, uid, id, usuarioId, targetId, despachadorId)
 * Garantiza que los identificadores de MongoDB, Firebase Auth y Usuarios se mantengan intactos,
 * limpios de espacios en blanco y sin transformaciones destructivas que afecten el emparejamiento entre colecciones.
 */
const sanitizarIdentificadoresPayload = (req, res, next) => {
    const sanitizarColeccion = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        const camposTarget = ['_id', 'uid', 'id', 'usuarioId', 'targetId', 'despachadorId', 'conductorId', 'pasajeroId', 'terminal_id'];

        camposTarget.forEach((campo) => {
            if (obj[campo] !== undefined && obj[campo] !== null) {
                if (typeof obj[campo] === 'string') {
                    const valorLimpio = obj[campo].trim();
                    if (valorLimpio.length > 0) {
                        obj[campo] = valorLimpio;
                    }
                }
            }
        });
    };

    try {
        if (req.params) sanitizarColeccion(req.params);
        if (req.body) sanitizarColeccion(req.body);
        if (req.query) sanitizarColeccion(req.query);
    } catch (err) {
        console.error('⚠️ [USUARIO-ROUTES-SANITY] Error al sanitizar identificadores de la petición:', err);
    }

    next();
};

// Inyección del middleware de sanitización a nivel global del enrutador de usuarios
router.use(sanitizarIdentificadoresPayload);

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