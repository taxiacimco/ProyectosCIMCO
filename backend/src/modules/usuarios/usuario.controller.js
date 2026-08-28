// Versión Arquitectura: V20.02 - Desacoplamiento Clean Architecture / Hexagonal (SRP) mediante UsuarioService y FirebaseRepository
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.controller.js
 * Misión: Controlador unificado de usuarios (Admin, Despachador, Pasajero, Staff) desacoplado mediante servicios y repositorios (SRP).
 * Preserva la deduplicación del directorio global, inyección sincrónica de UID, trazabilidad de transacciones y operaciones de billetera polimórfica.
 */

import usuarioService from './usuario.service.js';

// ==================================================================
// 1. GESTIÓN GENERAL Y DIRECTORIO GLOBAL DE USUARIOS
// ==================================================================

/**
 * 🌐 Directorio Global Centralizado y Anti-Duplicados
 * Retorna todos los actores del sistema unificados y limpios por ID/Email/Teléfono
 */
export const obtenerDirectorioGlobal = async (req, res, next) => {
    try {
        const listaLimpia = await usuarioService.obtenerDirectorioGlobal();

        return res.status(200).json({
            success: true,
            total: listaLimpia.length,
            usuarios: listaLimpia,
            data: listaLimpia
        });
    } catch (error) {
        console.error("❌ Error en obtenerDirectorioGlobal:", error);
        next(error);
    }
};

/**
 * 📋 Obtener listado de usuarios filtrado opcionalmente por rol
 */
export const obtenerUsuarios = async (req, res, next) => {
    try {
        const { rol } = req.query;
        const listaFiltrada = await usuarioService.obtenerUsuarios(rol);

        return res.status(200).json({
            success: true,
            contador: listaFiltrada.length,
            data: listaFiltrada
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 🛡️ Middleware/Función de Validación Anti-Duplicados previo al registro
 */
export const validarRegistroUnico = async (req, res, next) => {
    try {
        await usuarioService.validarRegistroUnico(req.body || {});
        next();
    } catch (error) {
        if (error.code === 'DUPLICATE_USER' || error.code === 'DUPLICATE_KEY_E11000' || error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
            return res.status(400).json({
                success: false,
                code: error.code || 'DUPLICATE_USER',
                message: error.message || "⚠️ El correo, teléfono o UID ingresado ya pertenece a otro usuario."
            });
        }
        next(error);
    }
};

/**
 * 📝 Registrar / Crear Usuario (Admin, Secretaría, Despachador, Staff)
 * Inyección sincrónica de UID mediante Firebase Auth y blindaje contra colisiones de índice sparse E11000 por 'uid: null'
 */
export const registrarUsuario = async (req, res, next) => {
    try {
        const nuevoUsuario = await usuarioService.registrarUsuario(req.body || {});

        return res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente.',
            data: nuevoUsuario,
            usuario: nuevoUsuario
        });
    } catch (error) {
        console.error("❌ [CIMCO-USUARIO-REG-ERROR] Error en registro de usuario:", error);

        if (error.code === 'MISSING_REQUIRED_FIELDS' || error.code === 'DUPLICATE_USER' || error.code === 'FIREBASE_AUTH_ERROR') {
            return res.status(400).json({
                success: false,
                code: error.code,
                message: error.message
            });
        }

        if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
            const campoDuplicado = error.keyValue ? Object.keys(error.keyValue).join(', ') : 'correo, teléfono o UID';
            return res.status(400).json({
                success: false,
                code: 'DUPLICATE_KEY_E11000',
                message: `⚠️ El ${campoDuplicado} ingresado ya se encuentra registrado por otro usuario.`
            });
        }

        next(error);
    }
};

/**
 * Alias explícito de creación para compatibilidad con rutas legacy / API
 */
export const crearUsuario = registrarUsuario;

/**
 * 👤 Obtener usuario por ID, UID o desde la sesión activa (req.user)
 */
export const obtenerUsuarioPorId = async (req, res, next) => {
    try {
        const targetId = req.params?.id || req.params?.uid || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de usuario ausente." });
        }

        const usuario = await usuarioService.obtenerUsuarioPorId(targetId);

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        return res.status(200).json({ success: true, data: usuario, usuario });
    } catch (error) {
        next(error);
    }
};

/**
 * 🔄 Actualizar datos de usuario con sincronización a Firestore y saneamiento de UID
 */
export const actualizarUsuario = async (req, res, next) => {
    try {
        const targetId = req.params?.id || req.params?.uid || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de usuario ausente para actualización." });
        }

        const usuario = await usuarioService.actualizarUsuario(targetId, req.body || {});

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        return res.status(200).json({ success: true, message: 'Usuario actualizado correctamente', data: usuario, usuario });
    } catch (error) {
        if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
            const campoDuplicado = error.keyValue ? Object.keys(error.keyValue).join(', ') : 'correo, teléfono o UID';
            return res.status(400).json({
                success: false,
                code: 'DUPLICATE_KEY_E11000',
                message: `⚠️ El ${campoDuplicado} ingresado ya está asignado a otro usuario.`
            });
        }
        next(error);
    }
};

/**
 * 🗑️ Eliminar usuario por ID o UID
 */
export const eliminarUsuario = async (req, res, next) => {
    try {
        const targetId = req.params?.id || req.params?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de usuario ausente para eliminación." });
        }

        const usuarioEliminado = await usuarioService.eliminarUsuario(targetId);

        if (!usuarioEliminado) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        return res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
    } catch (error) {
        next(error);
    }
};

// ==================================================================
// 2. GESTIÓN ESPECÍFICA DE DESPACHADORES Y TERMINALES
// ==================================================================

/**
 * 🎧 Obtener todos los usuarios con rol de despachador
 */
export const obtenerDespachadores = async (req, res, next) => {
    try {
        const despachadores = await usuarioService.obtenerDespachadores();
        return res.status(200).json({ success: true, contador: despachadores.length, data: despachadores });
    } catch (error) {
        next(error);
    }
};

/**
 * 🏢 Asignar Terminal y Código Operativo a Despachador (con réplica a Firestore)
 */
export const asignarTerminalDespachador = async (req, res, next) => {
    try {
        const { despachadorId, id, uid, terminal_id, codigoDespachador } = req.body || {};
        const targetId = despachadorId || id || uid;

        if (!targetId || !terminal_id) {
            return res.status(400).json({ success: false, message: "⚠️ `despachadorId` y `terminal_id` son requeridos." });
        }

        const usuario = await usuarioService.asignarTerminalDespachador({ targetId, terminal_id, codigoDespachador });

        if (!usuario) {
            return res.status(404).json({ success: false, message: "Despachador no encontrado." });
        }

        return res.status(200).json({
            success: true,
            message: "Terminal asignada con éxito al despachador.",
            data: usuario
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================================
// 3. BILLETERA Y FINANZAS DE DESPACHADORES Y AJUSTES GLOBAL POLIMÓRFICOS
// ==================================================================

/**
 * 💰 Consultar saldo del despachador
 */
export const obtenerSaldoDespachador = async (req, res, next) => {
    try {
        const targetId = req.params?.id || req.user?.id || req.user?._id;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de despachador ausente." });
        }

        const usuario = await usuarioService.obtenerSaldoDespachador(targetId);

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Despachador no encontrado.' });
        }

        const saldoFinal = usuario.saldoWallet ?? usuario.saldo ?? 0;

        return res.status(200).json({
            success: true,
            saldo: saldoFinal,
            saldoWallet: saldoFinal,
            data: usuario
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 💳 Recargar saldo a Despachador con incremento atómico ($inc) y auditoría en Firestore
 */
export const recargarSaldoDespachador = async (req, res, next) => {
    try {
        const { despachadorId, id, uid, monto, referencia, nota } = req.body || {};
        const targetId = despachadorId || id || uid;
        const montoNum = parseFloat(monto);
        const adminId = req.user?.id || req.user?._id || 'ADMIN_CENTRAL';

        if (!targetId || isNaN(montoNum) || montoNum <= 0) {
            return res.status(400).json({ success: false, message: "Monto e ID de despachador válidos son requeridos." });
        }

        const resultado = await usuarioService.recargarSaldoDespachador({
            targetId,
            montoNum,
            referencia,
            nota,
            adminId
        });

        if (!resultado) {
            return res.status(404).json({ success: false, message: "Despachador no encontrado o rol no válido." });
        }

        return res.status(200).json({
            success: true,
            message: `Saldo acreditado al despachador. Nuevo saldo: $${resultado.saldoNuevo} COP`,
            saldoNuevo: resultado.saldoNuevo,
            saldoActual: resultado.saldoNuevo,
            data: { saldoNuevo: resultado.saldoNuevo }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 💳 AJUSTE TRANSACCIONAL DE BILLETERA (Búsqueda Polimórfica Multi-Colección)
 */
export const ajustarSaldoBilletera = async (req, res, next) => {
    try {
        const { usuarioId, idTarget, monto, concepto, rol } = req.body || {};
        const targetId = usuarioId || idTarget || req.params?.id;

        if (!targetId) {
            return res.status(400).json({ success: false, message: "El ID del destinatario es requerido." });
        }

        const montoNumerico = Number(monto);
        if (isNaN(montoNumerico) || montoNumerico === 0) {
            return res.status(400).json({ success: false, message: "Monto inválido para el ajuste." });
        }

        const adminId = req.user?.id || req.user?._id || 'SISTEMA';

        const resultado = await usuarioService.ajustarSaldoBilletera({
            targetId,
            montoNumerico,
            concepto,
            rol,
            adminId
        });

        if (!resultado) {
            return res.status(404).json({ 
                success: false, 
                message: "Usuario no encontrado en ninguna colección del sistema." 
            });
        }

        return res.status(200).json({
            success: true,
            message: "Ajuste de billetera procesado con éxito.",
            saldoAnterior: resultado.saldoActual,
            nuevoSaldo: resultado.nuevoSaldo,
            usuario: resultado.usuario
        });
    } catch (error) {
        console.error("🚨 [CIMCO-WALLET-FATAL] Error al ajustar saldo de billetera:", error);
        next(error);
    }
};

/**
 * 💰 Ajuste Manual de Saldo (Abono / Débito - CEO)
 * Permite abonar saldo o realizar devoluciones/débitos a cualquier usuario mediante actualización atómica $inc de Mongoose.
 */
export const recargarSaldo = async (req, res, next) => {
    try {
        const targetId = req.params?.id || req.body?.id || req.body?.uid;
        const { monto, tipoOperacion = 'RECARGA', motivo = 'Ajuste Gerencial' } = req.body || {};
        const adminId = req.user?.id || req.user?._id || 'ADMIN_CENTRAL';

        const montoNumerico = parseFloat(monto);
        if (!targetId || isNaN(montoNumerico) || montoNumerico <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: "⚠️ Debe proporcionar un ID de usuario válido y un monto mayor a 0." 
            });
        }

        const resultado = await usuarioService.recargarSaldo({
            targetId,
            montoNumerico,
            tipoOperacion,
            motivo,
            adminId
        });

        return res.status(200).json({
            success: true,
            message: tipoOperacion === 'DEBITO' 
                ? `Devolución de $${montoNumerico.toLocaleString('es-CO')} COP procesada. Nuevo saldo: $${resultado.saldoNuevo.toLocaleString('es-CO')} COP`
                : `Abono de $${montoNumerico.toLocaleString('es-CO')} COP acreditado. Nuevo saldo: $${resultado.saldoNuevo.toLocaleString('es-CO')} COP`,
            saldoNuevo: resultado.saldoNuevo,
            saldoActual: resultado.saldoNuevo,
            data: { saldoNuevo: resultado.saldoNuevo }
        });
    } catch (error) {
        if (error.code === 'USER_NOT_FOUND') {
            return res.status(404).json({ success: false, message: error.message });
        }
        if (error.code === 'INSUFFICIENT_BALANCE') {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error("❌ Error en recargarSaldo:", error);
        next(error);
    }
};

export default {
    obtenerDirectorioGlobal,
    obtenerUsuarios,
    validarRegistroUnico,
    registrarUsuario,
    crearUsuario,
    obtenerUsuarioPorId,
    actualizarUsuario,
    eliminarUsuario,
    obtenerDespachadores,
    asignarTerminalDespachador,
    obtenerSaldoDespachador,
    recargarSaldoDespachador,
    ajustarSaldoBilletera,
    recargarSaldo
};