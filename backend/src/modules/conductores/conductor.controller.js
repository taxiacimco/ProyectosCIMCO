// Versión Arquitectura: V19.4 - Integración Quirúrgica: Aprovisionamiento Explícito de UID Firebase en Registro
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\conductores\conductor.controller.js
 * Misión: Gestión unificada de operarios, prevención de duplicados, aprobación administrativa, telemetría GPS, recargas atómicas y métricas de capital circulante.
 * Ajuste V19.4: Importación de admin desde firebase.js y aprovisionamiento/validación explícita de UID de Firebase antes de instanciar la entidad Conductor para garantizar la coherencia de identidad Auth-NoSQL.
 */

import mongoose from 'mongoose';
import Conductor from '../../models/Conductor.js';
import Usuario from '../../models/Usuario.js';
import HistorialSaldo from '../../models/HistorialSaldo.js';
import admin, { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js'; 
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
            idUsuario,
            rol,
            subrol: subrol || 'mototaxi',
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
// 🛡️ GUARDAS DE ARQUITECTURA, SANITIZACIÓN Y ANTI-DUPLICADOS
// ==================================================================

export const sanitizarPayloadConductor = (data) => {
    if (!data || typeof data !== 'object') return {};
    const payload = { ...data };
    
    if (payload.saldoWallet !== undefined || payload.saldo !== undefined) {
        const monto = Number(payload.saldo ?? payload.saldoWallet ?? 0);
        payload.saldo = isNaN(monto) || monto < 0 ? 0 : monto;
        delete payload.saldoWallet;
    }
    
    return payload;
};

export const verificarBypassDesarrollo = (req, res, next) => {
    const ENTORNO_ACTUAL = process.env.NODE_ENV || 'development';
    if (ENTORNO_ACTUAL === 'production') {
        console.error("⚠️ [ALERTA] Evasión de saldos denegada en producción.");
        return res.status(403).json({
            success: false,
            message: "⚠️ ALERTA DE ARQUITECTURA: Operación prohibida en producción."
        });
    }
    next();
};

/**
 * 🛡️ Middleware/Función para prevenir duplicidad de conductores por Email, Teléfono o Documento
 */
export const validarConductorUnico = async (req, res, next) => {
    try {
        const { email, telefono, telefonoMovil, cedula, documentoIdentidad } = req.body;
        const telContacto = telefono || telefonoMovil;
        const docId = cedula || documentoIdentidad;

        const condiciones = [];
        if (email) condiciones.push({ email: email.toLowerCase().trim() });
        if (telContacto) condiciones.push({ telefonoMovil: telContacto }, { telefono: telContacto });
        if (docId) condiciones.push({ cedula: docId }, { documentoIdentidad: docId });

        if (condiciones.length > 0) {
            const [existeEnConductores, existeEnUsuarios] = await Promise.all([
                Conductor.findOne({ $or: condiciones }).lean(),
                Usuario.findOne({ $or: condiciones }).lean()
            ]);

            if (existeEnConductores || existeEnUsuarios) {
                return res.status(400).json({
                    success: false,
                    message: "⚠️ El correo, teléfono o número de documento ya está registrado para otro operario o usuario."
                });
            }
        }
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 1. GESTIÓN ADMINISTRATIVA Y REGISTRO (APROBACIÓN Y ESTADOS)
// ==================================================================

/**
 * 🟢/🔴 CAMBIAR ESTADO DEL CONDUCTOR (Secretaría / Administración)
 */
export const cambiarEstadoConductor = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.body.conductorId;
        const { nuevoEstado, estado } = req.body;
        
        const estadoFinal = String(nuevoEstado || estado || '').toUpperCase().trim();

        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de conductor requerido." });
        }

        const estadosValidos = ['APROBADO', 'SUSPENDIDO', 'RECHAZADO', 'PENDIENTE'];
        if (!estadosValidos.includes(estadoFinal)) {
            return res.status(400).json({ 
                success: false, 
                message: `Estado no válido. Los estados permitidos son: ${estadosValidos.join(', ')}` 
            });
        }

        const estaAprobado = estadoFinal === 'APROBADO';

        // Estructura de actualización con reseteo explícito seguro para Mongoose strict: true
        const updateData = {
            $set: { 
                estado: estadoFinal,
                estadoAdministrativo: estadoFinal,
                isActive: estaAprobado
            }
        };

        if (estadoFinal !== 'APROBADO') {
            updateData.$set = {
                ...updateData.$set,
                saldoWallet: 0,
                estadoOperativo: 'NO_DISPONIBLE',
                isOnline: false
            };
        }

        const conductor = await Conductor.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId },
                    { conductorId: targetId }
                ]
            },
            updateData,
            { new: true, runValidators: true }
        ).lean();

        if (!conductor) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }

        delete conductor.saldoWallet;

        if (dbFirestore) {
            try {
                const docFirestoreId = conductor.uid || conductor._id.toString();
                const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
                
                await dbFirestore.collection(coleccionConductores).doc(docFirestoreId).set({
                    estado: estadoFinal,
                    estadoAdministrativo: estadoFinal,
                    isActive: estaAprobado,
                    ...(!estaAprobado && { isOnline: false, estadoOperativo: 'NO_DISPONIBLE' }),
                    ultimaActualizacion: FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (fsErr) {
                console.warn("⚠️ [SYNC-WARN] Falló réplica de cambio de estado a Firestore:", fsErr.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: `El conductor ahora está ${estadoFinal}`,
            data: conductor
        });

    } catch (error) {
        console.error("🚨 [CONDUCTORES-CAMBIAR-ESTADO-FATAL]:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 📋 OBTENER TODOS LOS CONDUCTORES DEDUPLICADOS
 */
export const obtenerTodosConductores = async (req, res) => {
    try {
        const conductoresBrutos = await Conductor.find().sort({ createdAt: -1 }).lean();

        const mapaUnico = new Map();

        conductoresBrutos.forEach((c) => {
            delete c.saldoWallet;
            const key = c._id ? c._id.toString() : (c.uid || c.cedula || c.email || c.telefonoMovil || c.telefono);
            if (key && !mapaUnico.has(key)) {
                mapaUnico.set(key, {
                    ...c,
                    id: c._id ? c._id.toString() : c.uid,
                    telefono: c.telefonoMovil || c.telefono || '',
                    subrol: c.subrol || c.tipoVehiculo || 'mototaxi'
                });
            }
        });

        const conductoresSanitizados = Array.from(mapaUnico.values());

        return res.status(200).json({ 
            success: true, 
            total: conductoresSanitizados.length,
            contador: conductoresSanitizados.length,
            data: conductoresSanitizados 
        });
    } catch (error) {
        console.error("🚨 [CONDUCTORES-OBTENER-TODOS-FATAL]:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerConductores = obtenerTodosConductores;

export const registrarConductor = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Payload de registro ausente." });
        }
        
        const payloadSanitizado = sanitizarPayloadConductor(req.body);
        
        if (!payloadSanitizado.estado) {
            payloadSanitizado.estado = 'PENDIENTE';
            payloadSanitizado.estadoAdministrativo = 'PENDIENTE';
            payloadSanitizado.isActive = false;
        }

        // 🛡️ Aprovisionamiento y validación explícita del UID de Firebase antes de la instanciación
        let targetUid = payloadSanitizado.uid || req.body?.uid;

        if (!targetUid && payloadSanitizado.email && admin && admin.auth) {
            try {
                const emailLimpio = String(payloadSanitizado.email).toLowerCase().trim();
                const userRecord = await admin.auth().getUserByEmail(emailLimpio);
                targetUid = userRecord.uid;
            } catch (authErr) {
                if (authErr.code === 'auth/user-not-found') {
                    try {
                        const nuevoUsuarioAuth = await admin.auth().createUser({
                            email: String(payloadSanitizado.email).toLowerCase().trim(),
                            displayName: payloadSanitizado.nombre || 'Conductor CIMCO',
                            phoneNumber: payloadSanitizado.telefonoMovil || payloadSanitizado.telefono || undefined,
                            disabled: false
                        });
                        targetUid = nuevoUsuarioAuth.uid;
                    } catch (createErr) {
                        console.warn("⚠️ [FIREBASE-AUTH-CREATE-WARN] No se pudo aprovisionar usuario en Firebase Auth:", createErr.message);
                    }
                } else {
                    console.warn("⚠️ [FIREBASE-AUTH-FETCH-WARN] Error consultando Firebase Auth por email:", authErr.message);
                }
            }
        }

        if (targetUid) {
            payloadSanitizado.uid = targetUid;
        }

        const nuevoConductor = new Conductor(payloadSanitizado);
        await nuevoConductor.save();

        try {
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
            const docFirestoreId = nuevoConductor.uid || nuevoConductor._id.toString();

            await dbFirestore.collection(coleccionConductores).doc(docFirestoreId).set({
                uid: docFirestoreId,
                nombre: nuevoConductor.nombre,
                email: nuevoConductor.email,
                telefono: nuevoConductor.telefonoMovil || nuevoConductor.telefono,
                estado: nuevoConductor.estado,
                estadoAdministrativo: nuevoConductor.estadoAdministrativo || nuevoConductor.estado,
                subrol: nuevoConductor.subrol || nuevoConductor.tipoVehiculo || 'mototaxi',
                isActive: nuevoConductor.isActive ?? false,
                createdAt: new Date().toISOString()
            }, { merge: true });

            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
            await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
                id: docFirestoreId,
                nombreUsuario: nuevoConductor.nombre,
                saldo: nuevoConductor.saldo || 0,
                balance: nuevoConductor.saldo || 0,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ [SYNC-WARN] Error inicializando Firestore:", fsErr.message);
        }
        
        return res.status(201).json({ success: true, data: nuevoConductor });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerConductorPorId = async (req, res) => {
    try {
        if (!req || !req.params || (!req.params.id && !req.params.uid && !req.params.conductorId)) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador ausente." });
        }
        const targetId = req.params.id || req.params.uid || req.params.conductorId;
        
        const conductor = await Conductor.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId },
                { conductorId: targetId }
            ]
        }).lean();

        if (!conductor) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }

        delete conductor.saldoWallet;

        return res.status(200).json({ success: true, data: conductor, conductor });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerPerfil = obtenerConductorPorId;

export const actualizarConductor = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Datos ausentes." });
        }
        
        const targetId = req.params.id || req.params.uid || req.params.conductorId || req.body.conductorId || req.body.id;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador ausente." });
        }

        const updateData = sanitizarPayloadConductor(req.body);

        const conductorActualizado = await Conductor.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId },
                    { conductorId: targetId }
                ]
            },
            { 
                $set: updateData,
                $unset: { saldoWallet: "" }
            },
            { new: true, runValidators: true }
        ).lean();

        if (!conductorActualizado) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }

        delete conductorActualizado.saldoWallet;

        try {
            const docFirestoreId = conductorActualizado.uid || conductorActualizado._id.toString();
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
            
            const firestoreUpdate = {};
            if (conductorActualizado.nombre) firestoreUpdate.nombre = conductorActualizado.nombre;
            if (conductorActualizado.telefonoMovil || conductorActualizado.telefono) {
                firestoreUpdate.telefono = conductorActualizado.telefonoMovil || conductorActualizado.telefono;
            }
            if (conductorActualizado.estado) firestoreUpdate.estado = conductorActualizado.estado;
            if (conductorActualizado.subrol || conductorActualizado.tipoVehiculo) {
                firestoreUpdate.subrol = conductorActualizado.subrol || conductorActualizado.tipoVehiculo;
            }

            await dbFirestore.collection(coleccionConductores).doc(docFirestoreId).set(firestoreUpdate, { merge: true });
        } catch (fsError) {
            console.warn("⚠️ [SYNC-WARN] Falló réplica a Firestore:", fsError.message);
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Conductor actualizado con éxito',
            data: conductorActualizado,
            conductor: conductorActualizado 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const eliminarConductor = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.params.conductorId;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador ausente." });
        }

        const conductorEliminado = await Conductor.findOneAndDelete({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId },
                { conductorId: targetId }
            ]
        });

        if (!conductorEliminado) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }

        // Réplica de eliminación o desactivación en Firestore si corresponde
        try {
            const docFirestoreId = conductorEliminado.uid || conductorEliminado._id.toString();
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
            await dbFirestore.collection(coleccionConductores).doc(docFirestoreId).delete();
        } catch (fsError) {
            console.warn("⚠️ [SYNC-WARN] Error al eliminar conductor de Firestore:", fsError.message);
        }

        return res.status(200).json({ success: true, message: 'Conductor eliminado correctamente', data: conductorEliminado });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerConductoresDisponibles = async (req, res) => {
    try {
        const conductoresDisponibles = await Conductor.find({ 
            $and: [
                { $or: [{ estado: 'APROBADO' }, { estado: 'activo' }, { estado: 'active' }, { estado: 'disponible' }] },
                { isActive: true }
            ]
        }).lean();
        
        const dataLimpia = conductoresDisponibles.map(c => {
            delete c.saldoWallet;
            return c;
        });

        return res.status(200).json({
            success: true,
            contador: dataLimpia.length,
            data: dataLimpia
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerCapitalCirculante = async (req, res) => {
    try {
        const resultado = await Usuario.aggregate([
            { $match: { estado: 'activo' } },
            {
                $group: {
                    _id: null,
                    totalCapital: { $sum: "$saldo" }
                }
            }
        ]);

        const capitalTotal = resultado?.[0]?.totalCapital || 0;

        return res.status(200).json({
            success: true,
            capitalCirculante: capitalTotal,
            totalCapital: capitalTotal
        });
    } catch (error) {
        console.error("❌ Error calculando capital circulante:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error interno calculando el capital circulante.",
            error: 'Error al calcular capital circulante'
        });
    }
};

// ==================================================================
// 2. BILLETERA ATÓMICA CIMCO (RECARGAS, AJUSTES Y CONTABILIDAD AUDITADA)
// ==================================================================

export const recargarSaldoAdmin = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const targetId = req.params.id || req.params.uid || req.body.conductorId || req.body.id || req.body.uid;
        const { monto, referencia, nota } = req.body;
        const montoNum = parseFloat(monto);
        const adminId = req.user?.id || req.user?._id || 'ADMIN_SYSTEM';

        if (!targetId || isNaN(montoNum) || montoNum <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Datos de recarga inválidos." });
        }

        const query = {
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId },
                { conductorId: targetId }
            ]
        };

        const conductor = await Conductor.findOneAndUpdate(
            query,
            { 
                $inc: { saldo: montoNum },
                $unset: { saldoWallet: "" } 
            },
            { new: false, session }
        );

        if (!conductor) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Conductor no localizado." });
        }

        const saldoAnterior = Number(conductor.saldo || 0);
        const nuevoSaldo = saldoAnterior + montoNum;

        const nuevoHistorial = new HistorialSaldo({
            conductor: conductor._id,
            tipo: 'recarga',
            monto: montoNum,
            saldoAnterior,
            saldoNuevo: nuevoSaldo,
            referencia: referencia || `ADM-${Date.now()}`,
            descripcion: nota || 'Recarga administrativa autorizada'
        });
        await nuevoHistorial.save({ session });

        await session.commitTransaction();
        session.endSession();

        const docFirestoreId = conductor.uid || conductor._id.toString();
        const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
        await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
            id: docFirestoreId,
            nombreUsuario: conductor.nombre,
            saldo: nuevoSaldo,
            balance: nuevoSaldo,
            ultimaActualizacion: new Date().toISOString()
        }, { merge: true });

        await registrarTransaccionFirestore({
            idUsuario: docFirestoreId,
            rol: 'conductor',
            subrol: conductor.subrol || conductor.tipoVehiculo || 'mototaxi',
            monto: montoNum,
            saldoAnterior,
            saldoNuevo: nuevoSaldo,
            tipoOperacion: 'RECARGA',
            autorizadoPor: adminId,
            referencia: referencia || `ADM-${Date.now()}`
        });

        return res.status(200).json({
            success: true,
            message: `Recarga exitosa. Nuevo saldo: $${nuevoSaldo} COP`,
            nuevoSaldo,
            data: { nuevoSaldo }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const recargarBilleteraPorAdmin = recargarSaldoAdmin;

export const ajustarSaldo = async (req, res) => {
    try {
        const targetId = req.params.uid || req.params.id || req.body.conductorId;
        const { monto, operacion, nota } = req.body;
        const adminId = req.user?.id || req.user?._id || 'ADMIN_SYSTEM';

        const montoNum = Number(monto);
        if (!targetId || isNaN(montoNum) || montoNum <= 0) {
            return res.status(400).json({ success: false, message: "⚠️ Parámetros de ajuste inválidos." });
        }

        const incremento = operacion === 'descuento' ? -Math.abs(montoNum) : Math.abs(montoNum);

        const conductor = await Conductor.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId },
                    { conductorId: targetId }
                ]
            },
            { 
                $inc: { saldo: incremento },
                $unset: { saldoWallet: "" } 
            },
            { new: false }
        );

        if (!conductor) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }

        const saldoAnterior = Number(conductor.saldo || 0);
        const nuevoSaldo = saldoAnterior + incremento;
        const docFirestoreId = conductor.uid || conductor._id.toString();

        const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
        await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
            saldo: nuevoSaldo,
            balance: nuevoSaldo,
            ultimaActualizacion: new Date().toISOString()
        }, { merge: true });

        await registrarTransaccionFirestore({
            idUsuario: docFirestoreId,
            rol: 'conductor',
            subrol: conductor.subrol || conductor.tipoVehiculo || 'mototaxi',
            monto: Math.abs(montoNum),
            saldoAnterior,
            saldoNuevo,
            tipoOperacion: operacion === 'descuento' ? 'DEBITO' : 'RECARGA',
            autorizadoPor: adminId,
            referencia: `AJUSTE-${Date.now()}`
        });

        return res.status(200).json({
            success: true,
            nuevoSaldo,
            message: `Saldo ${operacion === 'descuento' ? 'descontado' : 'recargado'} correctamente`
        });
    } catch (error) {
        console.error('❌ Error ajustando saldo:', error);
        return res.status(500).json({ success: false, message: 'Error al procesar el saldo' });
    }
};

export const descontarComisionViaje = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        if (!req || !req.body) {
            throw new Error("⚠️ Payload de débito ausente.");
        }
        
        const { conductorId, comision, viajeId } = req.body;
        const comisionNum = parseFloat(comision);

        if (!conductorId || isNaN(comisionNum) || comisionNum <= 0) {
            throw new Error("Parámetros contables de comisión inválidos.");
        }

        const query = {
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(conductorId) ? conductorId : null },
                { uid: conductorId },
                { conductorId: conductorId }
            ],
            saldo: { $gte: comisionNum }
        };

        const conductor = await Conductor.findOneAndUpdate(
            query,
            { 
                $inc: { saldo: -comisionNum },
                $unset: { saldoWallet: "" }
            },
            { new: false, session }
        );

        if (!conductor) {
            throw new Error("Conductor no localizado o saldo insuficiente.");
        }

        const saldoAnterior = Number(conductor.saldo || 0);
        const nuevoSaldo = saldoAnterior - comisionNum;

        const historialDescuento = new HistorialSaldo({
            conductor: conductor._id,
            tipo: 'debito',
            monto: comisionNum,
            saldoAnterior,
            saldoNuevo,
            referencia: viajeId ? `VIAJE-${viajeId}` : `DEB-${Date.now()}`,
            descripcion: `Comisión por servicio de viaje ${viajeId || ''}`
        });
        await historialDescuento.save({ session });

        await session.commitTransaction();
        session.endSession();

        const docFirestoreId = conductor.uid || conductor._id.toString();
        
        const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
        await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
            saldo: nuevoSaldo,
            balance: nuevoSaldo,
            ultimaActualizacion: new Date().toISOString()
        }, { merge: true });

        await registrarTransaccionFirestore({
            idUsuario: docFirestoreId,
            rol: 'conductor',
            subrol: conductor.subrol || conductor.tipoVehiculo || 'mototaxi',
            monto: comisionNum,
            saldoAnterior,
            saldoNuevo,
            tipoOperacion: 'DEBITO',
            autorizadoPor: 'SISTEMA_VIAJES',
            referencia: viajeId ? `VIAJE-${viajeId}` : `DEB-${Date.now()}`
        });

        return res.status(200).json({ 
            success: true, 
            message: "Comisión debitada correctamente.", 
            nuevoSaldo,
            data: {
                conductorId: conductor._id,
                saldoAnterior,
                nuevoSaldo,
                montoDebitado: comisionNum,
                viajeId: viajeId || null
            } 
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ Error al descontar comisión de viaje:", error);
        return res.status(error.message.includes('insuficiente') ? 402 : 500).json({ 
            success: false, 
            message: error.message || "Error al procesar el débito de comisión." 
        });
    }
};

export const obtenerHistorialSaldos = async (req, res) => {
    try {
        if (!req || !req.params) {
            return res.status(400).json({ success: false, message: "⚠️ Parámetros ausentes." });
        }
        const targetId = req.params.conductorId || req.params.id || req.params.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Parámetro conductorId requerido." });
        }
        
        const conductor = await Conductor.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId },
                { conductorId: targetId }
            ]
        });

        const mongoId = conductor ? conductor._id : targetId;

        const historial = await HistorialSaldo.find({
            $or: [{ conductor: mongoId }, { conductor: targetId }]
        }).sort({ createdAt: -1 });

        return res.status(200).json({ success: true, data: historial });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerHistorialConductor = obtenerHistorialSaldos;

// ==================================================================
// 3. CONTROL DE ESTADO OPERATIVO (ENCENDIDO DE MALLA) Y RADAR
// ==================================================================

export const actualizarEstadoConductor = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Datos ausentes." });
        }
        
        const id = req.params.id || req.params.uid || req.body.conductorId || req.body.id;
        const { estado, isOnline } = req.body; 

        if (!id) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador ausente." });
        }

        const conductorExistente = await Conductor.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
                { uid: id },
                { conductorId: id }
            ]
        });

        if (!conductorExistente) {
            return res.status(404).json({ success: false, message: "Conductor no localizado en el sistema." });
        }

        const estadoActual = String(conductorExistente.estado || conductorExistente.estadoAdministrativo || '').toUpperCase();
        const estaAprobado = (estadoActual === 'APROBADO' || estadoActual === 'ACTIVO') && conductorExistente.isActive === true;

        const intentaEncender = isOnline === true || ['active', 'disponible', 'ONLINE'].includes(estado);

        if (intentaEncender && !estaAprobado) {
            return res.status(403).json({
                success: false,
                code: 'DRIVER_NOT_APPROVED',
                message: "Acceso denegado: Su cuenta debe estar en estado APROBADO para poder encender la malla y recibir servicios."
            });
        }

        const conductor = await Conductor.findOneAndUpdate(
            { _id: conductorExistente._id },
            { 
                $set: { 
                    estado,
                    ...(isOnline !== undefined && { isOnline }),
                    ...(intentaEncender && { estadoOperativo: 'DISPONIBLE' })
                } 
            },
            { new: true }
        );

        const docFirestoreId = conductor.uid || conductor._id.toString();
        const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
        await dbFirestore.collection(coleccionConductores).doc(docFirestoreId).set({
            estado,
            isOnline: conductor.isOnline ?? intentaEncender,
            ultimaActualizacion: FieldValue.serverTimestamp()
        }, { merge: true });

        return res.status(200).json({ success: true, message: `Estado operativo actualizado a ${estado}`, data: conductor });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerConductoresCercanos = async (req, res) => {
    try {
        if (!req || !req.query || !req.query.lat || !req.query.lng) {
            return res.status(400).json({ success: false, message: "⚠️ Coordenadas ausentes." });
        }

        const latitud = parseFloat(req.query.lat);
        const longitud = parseFloat(req.query.lng);
        const radioParam = req.query.radio || req.query.radioMaxKm;
        let radioMetros = parseFloat(radioParam) || 5000;
        if (radioParam && parseFloat(radioParam) < 100) {
            radioMetros = parseFloat(radioParam) * 1000;
        }

        if (isNaN(latitud) || isNaN(longitud)) {
            return res.status(400).json({ success: false, message: "⚠️ Coordenadas inválidas." });
        }

        const conductoresCercanos = await Conductor.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [longitud, latitud] },
                    distanceField: "distanciaMetros",
                    maxDistance: radioMetros,
                    query: { 
                        estado: { $in: ["active", "disponible", "APROBADO"] },
                        isActive: true
                    }, 
                    spherical: true
                }
            },
            {
                $project: {
                    saldoWallet: 0
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            unidadesEncontradas: conductoresCercanos.length,
            data: conductoresCercanos
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 4. TELEMETRÍA REACTIVA (PERSISTENCIA ATÓMICA CIMCO-RADAR 2DSPHERE)
// ==================================================================

export const actualizarRadarUbicacion = async (conductorId, lat, lng) => {
    try {
        if (!conductorId || lat === undefined || lng === undefined) {
            return false;
        }
        const longNum = parseFloat(lng);
        const latNum = parseFloat(lat);

        if (isNaN(longNum) || isNaN(latNum)) {
            return false;
        }

        const conductor = await Conductor.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(conductorId) ? conductorId : null },
                { uid: conductorId },
                { conductorId: conductorId }
            ]
        });

        if (!conductor) return false;

        const estadoActual = String(conductor.estado || conductor.estadoAdministrativo || '').toUpperCase();
        if ((estadoActual !== 'APROBADO' && estadoActual !== 'ACTIVO') || conductor.isActive === false) {
            console.warn(`🔒 [RADAR-REJECT] El conductor ${conductor._id} intentó enviar GPS sin estar APROBADO.`);
            return false;
        }

        const conductorActualizado = await Conductor.findOneAndUpdate(
            { _id: conductor._id },
            {
                $set: {
                    'coordenadas.type': 'Point',
                    'coordenadas.coordinates': [longNum, latNum],
                    'ubicacion.type': 'Point',
                    'ubicacion.coordinates': [longNum, latNum]
                }
            },
            { new: true, upsert: false }
        );

        if (!conductorActualizado) return false;

        const docFirestoreId = conductorActualizado.uid || conductorActualizado._id.toString();
        const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
        await dbFirestore.collection(coleccionConductores).doc(docFirestoreId).set({
            coordenadas: {
                latitude: latNum,
                longitude: longNum
            },
            ultimaActualizacion: FieldValue.serverTimestamp()
        }, { merge: true });

        return true;
    } catch (error) {
        console.error(`❌ [RADAR-DB-ERROR] Error en Atlas/Firestore:`, error.message);
        return false;
    }
};

export const actualizarUbicacionGPS = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Payload de telemetría ausente." });
        }
        
        const id = req.params.id || req.params.uid || req.body.conductorId || req.body.id;
        const { lat, lng } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador ausente." });
        }

        const exito = await actualizarRadarUbicacion(id, lat, lng);
        if (!exito) {
            return res.status(403).json({ success: false, message: "Error procesando coordenadas o conductor no aprobado." });
        }

        return res.status(200).json({ success: true, message: "Telemetría sincronizada correctamente." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export default {
    sanitizarPayloadConductor,
    verificarBypassDesarrollo,
    validarConductorUnico,
    cambiarEstadoConductor,
    obtenerTodosConductores,
    obtenerConductores,
    registrarConductor,
    obtenerConductorPorId,
    obtenerPerfil,
    actualizarConductor,
    eliminarConductor,
    obtenerConductoresDisponibles,
    obtenerCapitalCirculante,
    recargarSaldoAdmin,
    recargarBilleteraPorAdmin,
    ajustarSaldo,
    descontarComisionViaje,
    obtenerHistorialSaldos,
    obtenerHistorialConductor,
    actualizarEstadoConductor,
    obtenerConductoresCercanos,
    actualizarRadarUbicacion,
    actualizarUbicacionGPS
};