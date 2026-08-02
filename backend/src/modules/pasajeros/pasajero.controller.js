// Versión Arquitectura: V18.1 - Módulo Pasajeros (Deduplicación de Registros, Semántica de Historial y Mapeo Seguro)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\pasajeros\pasajero.controller.js
 * Misión: Gestión integral deduplicada de perfiles de pasajeros, direcciones favoritas, historial de trayectos y operaciones de saldo/billetera.
 * Ajuste V18.1: Corrección de asignación semántica en HistorialSaldo (usuario/pasajero en lugar de conductor) al recargar saldo.
 */

import mongoose from 'mongoose';
import Pasajero from '../../models/Pasajero.js';
import Usuario from '../../models/Usuario.js';
import Viaje from '../../models/Viaje.js';
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
            subrol: subrol || 'cliente',
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
// 1. GESTIÓN GENERAL DE PASAJEROS Y PERFIL (DEDUPLICADO)
// ==================================================================

/**
 * 📋 Obtener listado de pasajeros deduplicado (Uso administrativo)
 */
export const obtenerPasajeros = async (req, res) => {
    try {
        const pasajerosBrutos = await Pasajero.find().select('-password').lean();

        // Aplicar filtrado defensivo anti-duplicados por _id, email o teléfono
        const mapaUnico = new Map();

        pasajerosBrutos.forEach((p) => {
            const key = p._id ? p._id.toString() : (p.uid || p.email || p.telefonoMovil || p.telefono);
            if (key && !mapaUnico.has(key)) {
                mapaUnico.set(key, {
                    ...p,
                    id: p._id ? p._id.toString() : p.uid,
                    telefono: p.telefonoMovil || p.telefono || '',
                    rol: p.rol || p.role || 'pasajero',
                    origenColeccion: 'PASAJEROS'
                });
            }
        });

        const listaLimpia = Array.from(mapaUnico.values());

        return res.status(200).json({ 
            success: true, 
            contador: listaLimpia.length, 
            data: listaLimpia,
            pasajeros: listaLimpia 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🛡️ Middleware/Validación de Registro Único para Pasajeros
 */
export const validarPasajeroUnico = async (req, res, next) => {
    try {
        const { email, telefono, telefonoMovil } = req.body;
        const telContacto = telefono || telefonoMovil;

        const condicionesPasajero = [];
        if (email) condicionesPasajero.push({ email: email.toLowerCase().trim() });
        if (telContacto) condicionesPasajero.push({ telefonoMovil: telContacto }, { telefono: telContacto });

        if (condicionesPasajero.length > 0) {
            // Validar en ambas colecciones para prevenir duplicados entre Pasajero y Usuario
            const [existeEnPasajeros, existeEnUsuarios] = await Promise.all([
                Pasajero.findOne({ $or: condicionesPasajero }).lean(),
                Usuario.findOne({ $or: condicionesPasajero }).lean()
            ]);

            if (existeEnPasajeros || existeEnUsuarios) {
                return res.status(400).json({
                    success: false,
                    message: "⚠️ El número de teléfono o correo ya pertenece a un usuario/pasajero registrado."
                });
            }
        }
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 👤 Consulta de Perfil de Pasajero por ID o Token de Sesión
 */
export const obtenerPerfilPasajero = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de pasajero ausente." });
        }

        const pasajero = await Pasajero.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        }).select('-password').lean();

        if (!pasajero) {
            return res.status(404).json({ success: false, message: 'Pasajero no encontrado' });
        }

        return res.status(200).json({ success: true, data: pasajero, pasajero });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🔄 Actualización de Perfil con Sincronización a Firestore
 */
export const actualizarPerfilPasajero = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de pasajero ausente para la actualización." });
        }

        const updateData = { ...req.body };
        delete updateData.password; // Evitar la sobreescritura accidental de la contraseña

        const pasajero = await Pasajero.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ]
            },
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password').lean();

        if (!pasajero) {
            return res.status(404).json({ success: false, message: 'Pasajero no encontrado' });
        }

        // Espejo en Firebase Firestore
        try {
            const docFirestoreId = pasajero.uid || pasajero._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';

            const payloadFs = {};
            if (pasajero.nombre) {
                payloadFs.nombre = pasajero.nombre;
                payloadFs.fullName = pasajero.nombre;
            }
            if (pasajero.telefonoMovil || pasajero.telefono) {
                const tel = pasajero.telefonoMovil || pasajero.telefono;
                payloadFs.telefono = tel;
                payloadFs.telefonoMovil = tel;
            }

            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set(payloadFs, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ [CIMCO-PASAJERO-SYNC-WARN] Error al replicar actualización en Firestore:", fsErr.message);
        }

        return res.status(200).json({ success: true, message: 'Perfil actualizado con éxito', data: pasajero, pasajero });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 2. DIRECCIONES FAVORITAS E HISTORIAL DE TRAYECTOS
// ==================================================================

/**
 * 📍 Guardar Dirección Favorita con Replicación a Firestore
 */
export const agregarDireccionFavorita = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        const { alias, direccion, latitud, longitud } = req.body;

        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de pasajero ausente." });
        }

        if (!alias || !direccion || latitud === undefined || longitud === undefined) {
            return res.status(400).json({ success: false, message: "⚠️ Todos los campos de la dirección son requeridos." });
        }

        const nuevaDireccion = {
            alias: String(alias).trim(),
            direccion: String(direccion).trim(),
            coordenadas: { latitud: Number(latitud), longitud: Number(longitud) }
        };

        const pasajero = await Pasajero.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ]
            },
            { $push: { direccionesFavoritas: nuevaDireccion } },
            { new: true }
        ).select('-password').lean();

        if (!pasajero) {
            return res.status(404).json({ success: false, message: 'Pasajero no encontrado' });
        }

        // Espejo del arreglo de direcciones en Firestore
        try {
            const docFirestoreId = pasajero.uid || pasajero._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';

            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set({
                direccionesFavoritas: pasajero.direccionesFavoritas || []
            }, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ Error replicando dirección favorita a Firestore:", fsErr.message);
        }

        return res.status(200).json({ success: true, message: 'Dirección guardada correctamente', data: pasajero });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🗑️ Eliminar Dirección Favorita
 */
export const eliminarDireccionFavorita = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        const { direccionId } = req.params;

        if (!targetId || !direccionId) {
            return res.status(400).json({ success: false, message: "⚠️ Parámetros insuficientes para eliminar la dirección." });
        }

        const pasajero = await Pasajero.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ]
            },
            { $pull: { direccionesFavoritas: { _id: direccionId } } },
            { new: true }
        ).select('-password').lean();

        if (!pasajero) {
            return res.status(404).json({ success: false, message: 'Pasajero no encontrado' });
        }

        // Sincronización del arreglo actualizado en Firestore
        try {
            const docFirestoreId = pasajero.uid || pasajero._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';

            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set({
                direccionesFavoritas: pasajero.direccionesFavoritas || []
            }, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ Error al sincronizar eliminación en Firestore:", fsErr.message);
        }

        return res.status(200).json({ success: true, message: 'Dirección eliminada correctamente', data: pasajero });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 📜 Historial de Viajes del Pasajero
 */
export const obtenerHistorialViajesPasajero = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;

        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de pasajero ausente." });
        }

        const pasajero = await Pasajero.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        });

        const queryId = pasajero ? pasajero._id : targetId;

        const viajes = await Viaje.find({
            $or: [{ pasajeroId: queryId }, { pasajero: queryId }]
        }).sort({ createdAt: -1 }).lean();

        return res.status(200).json({ success: true, contador: viajes.length, data: viajes });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 3. BILLETERA VIRTUAL Y SALDO DEL PASAJERO
// ==================================================================

/**
 * 💰 Consultar saldo del pasajero
 */
export const obtenerSaldoPasajero = async (req, res) => {
    try {
        const targetId = req.params.id || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de pasajero ausente." });
        }

        const pasajero = await Pasajero.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        }).select('saldo nombre email').lean();

        if (!pasajero) {
            return res.status(404).json({ success: false, message: 'Pasajero no encontrado.' });
        }

        return res.status(200).json({
            success: true,
            saldo: pasajero.saldo || 0,
            data: pasajero
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 💳 Recargar saldo a Pasajero con incremento atómico ($inc) y auditoría
 */
export const recargarSaldoPasajero = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { pasajeroId, id, uid, monto, referencia, nota } = req.body;
        const targetId = pasajeroId || id || uid;
        const montoNum = parseFloat(monto);
        const adminId = req.user?.id || req.user?._id || 'SISTEMA_PASAJERO';

        if (!targetId || isNaN(montoNum) || montoNum <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Parámetros de recarga inválidos." });
        }

        const pasajero = await Pasajero.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ]
            },
            { $inc: { saldo: montoNum } },
            { new: false, session } // Devuelve el estado anterior
        );

        if (!pasajero) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Pasajero no localizado." });
        }

        const saldoAnterior = Number(pasajero.saldo || 0);
        const saldoNuevo = saldoAnterior + montoNum;

        // ✅ Historial en MongoDB con mapeo semántico limpio (usuario / pasajero)
        const nuevoHistorial = new HistorialSaldo({
            usuario: pasajero._id,
            pasajero: pasajero._id,
            monto: montoNum,
            tipo: 'RECARGA',
            rolTarget: 'pasajero',
            saldoAnterior,
            saldoNuevo,
            realizadoPor: adminId,
            referencia: referencia || `PAS-${Date.now()}`,
            descripcion: nota || 'Recarga de saldo a pasajero realizada por central/admin'
        });
        await nuevoHistorial.save({ session });

        await session.commitTransaction();
        session.endSession();

        const docFirestoreId = pasajero.uid || pasajero._id.toString();

        // Actualizar espejo Billetera en Firestore
        try {
            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
            await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
                id: docFirestoreId,
                nombreUsuario: pasajero.nombre,
                saldo: saldoNuevo,
                balance: saldoNuevo,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsWalletErr) {
            console.warn("⚠️ Error actualizando billetera de pasajero en Firestore:", fsWalletErr.message);
        }

        // Auditoría centralizada Firestore
        await registrarTransaccionFirestore({
            idUsuario: docFirestoreId,
            rol: 'pasajero',
            subrol: 'cliente',
            monto: montoNum,
            saldoAnterior,
            saldoNuevo,
            tipoOperacion: 'RECARGA_PASAJERO',
            autorizadoPor: adminId,
            referencia: referencia || `PAS-${Date.now()}`
        });

        return res.status(200).json({
            success: true,
            message: `Recarga de pasajero exitosa. Nuevo saldo: $${saldoNuevo} COP`,
            saldoNuevo,
            data: { saldoNuevo }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, message: error.message });
    }
};