// Versión Arquitectura: V19.0 - Integración Atómica de Recarga/Ajuste Gerencial Multi-Rol
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.controller.js
 * Misión: Control unificado de usuarios (Admin, Despachador, Pasajero, Staff), directorio global deduplicado y flujo financiero.
 */

import mongoose from 'mongoose';
import Usuario from '../../models/Usuario.js';
import HistorialSaldo from '../../models/HistorialSaldo.js';
import { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Helper para registrar transacciones auditables en Firestore
 */
const registrarTransaccionFirestore = async ({
    idUsuario,
    rol,
    subrol,
    monto,
    saldoAnterior,
    saldoNuevo,
    tipoOperacion,
    autorizadoPor,
    referencia
}) => {
    try {
        const pathTransacciones = FIRESTORE_PATHS?.transactions || 'transacciones';
        await dbFirestore.collection(pathTransacciones).add({
            idUsuario: idUsuario?.toString(),
            rol,
            subrol: subrol || 'operador_taquilla',
            monto,
            saldoAnterior,
            saldoNuevo,
            tipoOperacion,
            autorizadoPor: autorizadoPor || 'SISTEMA',
            referencia: referencia || `TX-${Date.now()}`,
            timestamp: FieldValue.serverTimestamp(),
            fechaRegistro: new Date().toISOString()
        });
    } catch (error) {
        console.warn("⚠️ [FIRESTORE-TX-WARN] No se pudo registrar la transacción en Firestore:", error.message);
    }
};

// ==================================================================
// 1. GESTIÓN GENERAL Y DIRECTORIO GLOBAL DE USUARIOS
// ==================================================================

/**
 * 🌐 Directorio Global Centralizado y Anti-Duplicados
 * Retorna todos los actores del sistema unificados y limpios por ID/Email/Teléfono
 */
export const obtenerDirectorioGlobal = async (req, res) => {
    try {
        // Consultar la base de datos de usuarios excluyendo contraseñas
        const usuariosBrutos = await Usuario.find().select('-password').lean();

        // Mapa de deduplicación defensiva
        const mapaUnico = new Map();

        usuariosBrutos.forEach((u) => {
            // Generación de clave única usando _id, uid, o email/teléfono como salvaguarda
            const idKey = u._id ? u._id.toString() : (u.uid || u.email || u.telefono || u.telefonoMovil);

            if (idKey && !mapaUnico.has(idKey)) {
                // Normalización de orígenes y roles para visibilidad homogénea en UI
                const usuarioLimpio = {
                    ...u,
                    id: u._id ? u._id.toString() : u.uid,
                    rolNormalizado: (u.rol || u.role || 'pasajero').toLowerCase(),
                    origenColeccion: u.origenColeccion || 'USUARIOS'
                };
                mapaUnico.set(idKey, usuarioLimpio);
            }
        });

        const listaLimpia = Array.from(mapaUnico.values());

        return res.status(200).json({
            success: true,
            total: listaLimpia.length,
            usuarios: listaLimpia,
            data: listaLimpia
        });
    } catch (error) {
        console.error("❌ Error en obtenerDirectorioGlobal:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 📋 Obtener listado de usuarios filtrado opcionalmente por rol
 */
export const obtenerUsuarios = async (req, res) => {
    try {
        const { rol } = req.query;
        const filtro = {};

        if (rol) {
            filtro.$or = [{ rol }, { role: rol }];
        }

        const usuarios = await Usuario.find(filtro).select('-password').lean();
        
        // Aplicar deduplicación por seguridad
        const mapaUnico = new Map();
        usuarios.forEach(u => {
            const key = u._id ? u._id.toString() : u.email;
            if (key && !mapaUnico.has(key)) mapaUnico.set(key, u);
        });

        const listaFiltrada = Array.from(mapaUnico.values());

        return res.status(200).json({ success: true, contador: listaFiltrada.length, data: listaFiltrada });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🛡️ Middleware/Función de Validación Anti-Duplicados previo al registro
 */
export const validarRegistroUnico = async (req, res, next) => {
    try {
        const { email, telefono, telefonoMovil } = req.body;
        const telContacto = telefono || telefonoMovil;

        const condiciones = [];
        if (email) condiciones.push({ email: email.toLowerCase().trim() });
        if (telContacto) condiciones.push({ telefono: telContacto }, { telefonoMovil: telContacto });

        if (condiciones.length > 0) {
            const usuarioExistente = await Usuario.findOne({ $or: condiciones }).lean();
            if (usuarioExistente) {
                return res.status(400).json({
                    success: false,
                    message: "⚠️ El correo electrónico o número de teléfono ya está registrado en el sistema."
                });
            }
        }
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 👤 Obtener usuario por ID, UID o desde la sesión activa (req.user)
 */
export const obtenerUsuarioPorId = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de usuario ausente." });
        }

        const usuario = await Usuario.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        }).select('-password').lean();

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        return res.status(200).json({ success: true, data: usuario, usuario });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🔄 Actualizar datos de usuario con sincronización a Firestore
 */
export const actualizarUsuario = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de usuario ausente para actualización." });
        }

        const updateData = { ...req.body };
        delete updateData.password; // Prevenir mutación directa de credenciales sin hash

        const usuario = await Usuario.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ]
            },
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password').lean();

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        // Espejo en Firebase Firestore
        try {
            const docFirestoreId = usuario.uid || usuario._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';

            const payloadFs = {};
            if (usuario.nombre) payloadFs.nombre = usuario.nombre;
            if (usuario.email) payloadFs.email = usuario.email;
            if (usuario.telefonoMovil || usuario.telefono) payloadFs.telefono = usuario.telefonoMovil || usuario.telefono;
            if (usuario.rol || usuario.role) payloadFs.rol = usuario.rol || usuario.role;

            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set(payloadFs, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ [CIMCO-USUARIO-SYNC-WARN] Error al replicar actualización en Firestore:", fsErr.message);
        }

        return res.status(200).json({ success: true, message: 'Usuario actualizado correctamente', data: usuario, usuario });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🗑️ Eliminar usuario por ID o UID
 */
export const eliminarUsuario = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de usuario ausente para eliminación." });
        }

        const usuarioEliminado = await Usuario.findOneAndDelete({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        });

        if (!usuarioEliminado) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        return res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 2. GESTIÓN ESPECÍFICA DE DESPACHADORES Y TERMINALES
// ==================================================================

/**
 * 🎧 Obtener todos los usuarios con rol de despachador
 */
export const obtenerDespachadores = async (req, res) => {
    try {
        const despachadores = await Usuario.find({
            $or: [{ rol: 'despachador' }, { role: 'despachador' }]
        }).select('-password').lean();

        return res.status(200).json({ success: true, contador: despachadores.length, data: despachadores });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🏢 Asignar Terminal y Código Operativo a Despachador (con réplica a Firestore)
 */
export const asignarTerminalDespachador = async (req, res) => {
    try {
        const { despachadorId, id, uid, terminal_id, codigoDespachador } = req.body;
        const targetId = despachadorId || id || uid;

        if (!targetId || !terminal_id) {
            return res.status(400).json({ success: false, message: "⚠️ `despachadorId` y `terminal_id` son requeridos." });
        }

        const codigoGenerado = codigoDespachador || `DSP-${Date.now().toString().slice(-4)}`;

        const usuario = await Usuario.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ]
            },
            { 
                $set: { 
                    terminal_id, 
                    codigoDespachador: codigoGenerado
                } 
            },
            { new: true }
        ).select('-password').lean();

        if (!usuario) {
            return res.status(404).json({ success: false, message: "Despachador no encontrado." });
        }

        // Réplica defensiva a Firestore para despachadores
        try {
            const docFirestoreId = usuario.uid || usuario._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';

            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set({
                terminal_id,
                codigoDespachador: codigoGenerado,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ Error replicando terminal de despachador a Firestore:", fsErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Terminal asignada con éxito al despachador.",
            data: usuario
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 3. BILLETERA Y FINANZAS DE DESPACHADORES
// ==================================================================

/**
 * 💰 Consultar saldo del despachador
 */
export const obtenerSaldoDespachador = async (req, res) => {
    try {
        const targetId = req.params.id || req.user?.id || req.user?._id;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de despachador ausente." });
        }

        const usuario = await Usuario.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        }).select('saldo nombre rol role').lean();

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Despachador no encontrado.' });
        }

        return res.status(200).json({
            success: true,
            saldo: usuario.saldo || 0,
            data: usuario
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 💳 Recargar saldo a Despachador con incremento atómico ($inc) y auditoría en Firestore
 */
export const recargarSaldoDespachador = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { despachadorId, id, uid, monto, referencia, nota } = req.body;
        const targetId = despachadorId || id || uid;
        const montoNum = parseFloat(monto);
        const adminId = req.user?.id || req.user?._id || 'ADMIN_CENTRAL';

        if (!targetId || isNaN(montoNum) || montoNum <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Monto e ID de despachador válidos son requeridos." });
        }

        // Incremento atómico ($inc)
        const despachador = await Usuario.findOneAndUpdate(
            { 
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ],
                $and: [
                    { $or: [{ rol: 'despachador' }, { role: 'despachador' }] }
                ]
            },
            { $inc: { saldo: montoNum } },
            { new: false, session } // Retorna estado anterior
        );

        if (!despachador) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Despachador no encontrado o rol no válido." });
        }

        const saldoAnterior = Number(despachador.saldo || 0);
        const saldoNuevo = saldoAnterior + montoNum;

        // Registro de Historial en MongoDB
        const nuevoHistorial = new HistorialSaldo({
            conductor: despachador._id,
            tipo: 'recarga_despachador',
            monto: montoNum,
            saldoAnterior,
            saldoNuevo,
            referencia: referencia || `DSP-${Date.now()}`,
            descripcion: nota || 'Recarga autorizada para despachador'
        });
        await nuevoHistorial.save({ session });

        await session.commitTransaction();
        session.endSession();

        const docFirestoreId = despachador.uid || despachador._id.toString();

        // Espejo de Billetera en Firestore
        try {
            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
            await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
                id: docFirestoreId,
                nombreUsuario: despachador.nombre,
                saldo: saldoNuevo,
                balance: saldoNuevo,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsWalletErr) {
            console.warn("⚠️ Error actualizando billetera en Firestore:", fsWalletErr.message);
        }

        // Auditoría centralizada Firestore
        await registrarTransaccionFirestore({
            idUsuario: docFirestoreId,
            rol: 'despachador',
            subrol: 'operador_taquilla',
            monto: montoNum,
            saldoAnterior,
            saldoNuevo,
            tipoOperacion: 'RECARGA_DESPACHADOR',
            autorizadoPor: adminId,
            referencia: referencia || `DSP-${Date.now()}`
        });

        return res.status(200).json({
            success: true,
            message: `Saldo acreditado al despachador. Nuevo saldo: $${saldoNuevo} COP`,
            saldoNuevo,
            data: { saldoNuevo }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 💰 Ajuste Manual de Saldo (Abono / Débito - CEO)
 * Permite abonar saldo o realizar devoluciones/débitos a cualquier usuario.
 */
export const recargarSaldo = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const targetId = req.params.id || req.body.id || req.body.uid;
        const { monto, tipoOperacion = 'RECARGA', motivo = 'Ajuste Gerencial' } = req.body;
        const adminId = req.user?.id || req.user?._id || 'ADMIN_CENTRAL';

        const montoNumerico = parseFloat(monto);
        if (!targetId || isNaN(montoNumerico) || montoNumerico <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: "⚠️ Debe proporcionar un ID de usuario válido y un monto mayor a 0." 
            });
        }

        // Buscar el usuario objetivo
        const usuario = await Usuario.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        }).session(session);

        if (!usuario) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "⚠️ Usuario no encontrado." });
        }

        // Obtener saldo actual (soporta campo `saldoWallet` o `saldo`)
        const saldoAnterior = Number(usuario.saldoWallet ?? usuario.saldo ?? 0);
        let deltaSaldo = montoNumerico;

        // Validación estricta para Débito/Devolución
        if (tipoOperacion === 'DEBITO') {
            if (saldoAnterior < montoNumerico) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `⚠️ Saldo insuficiente para realizar la devolución. Saldo disponible: $${saldoAnterior.toLocaleString('es-CO')} COP.`
                });
            }
            deltaSaldo = -montoNumerico;
        }

        // Actualizar el saldo en el modelo
        const saldoNuevo = saldoAnterior + deltaSaldo;
        usuario.saldoWallet = saldoNuevo;
        usuario.saldo = saldoNuevo; // Mantener sincronía de campos
        await usuario.save({ session });

        // Registrar Historial auditable en MongoDB
        const nuevoHistorial = new HistorialSaldo({
            conductor: usuario._id,
            usuarioId: usuario._id,
            tipo: tipoOperacion === 'DEBITO' ? 'debito_manual' : 'recarga_manual',
            monto: deltaSaldo,
            saldoAnterior,
            saldoNuevo,
            referencia: `AJUSTE-${Date.now()}`,
            descripcion: tipoOperacion === 'DEBITO' 
                ? `Devolución de Saldo / Débito: ${motivo}` 
                : `Abono de Saldo / Recarga: ${motivo}`
        });
        await nuevoHistorial.save({ session });

        await session.commitTransaction();
        session.endSession();

        const docFirestoreId = usuario.uid || usuario._id.toString();

        // Espejo de Billetera en Firebase Firestore
        try {
            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
            await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
                id: docFirestoreId,
                nombreUsuario: usuario.nombre,
                saldo: saldoNuevo,
                saldoWallet: saldoNuevo,
                balance: saldoNuevo,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsWalletErr) {
            console.warn("⚠️ [FIRESTORE-WALLET-WARN] Error actualizando billetera:", fsWalletErr.message);
        }

        // Auditoría centralizada en Firestore
        await registrarTransaccionFirestore({
            idUsuario: docFirestoreId,
            rol: usuario.rol || usuario.role || 'usuario',
            subrol: usuario.subrol || 'general',
            monto: deltaSaldo,
            saldoAnterior,
            saldoNuevo,
            tipoOperacion: tipoOperacion === 'DEBITO' ? 'DEBITO_GERENCIAL' : 'RECARGA_GERENCIAL',
            autorizadoPor: adminId,
            referencia: `AJUSTE-${Date.now()}`
        });

        return res.status(200).json({
            success: true,
            message: tipoOperacion === 'DEBITO' 
                ? `Devolución de $${montoNumerico.toLocaleString('es-CO')} COP procesada. Nuevo saldo: $${saldoNuevo.toLocaleString('es-CO')} COP`
                : `Abono de $${montoNumerico.toLocaleString('es-CO')} COP acreditado. Nuevo saldo: $${saldoNuevo.toLocaleString('es-CO')} COP`,
            saldoNuevo,
            saldoActual: saldoNuevo,
            data: { saldoNuevo }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ Error en recargarSaldo:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};