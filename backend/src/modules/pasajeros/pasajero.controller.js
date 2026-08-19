// Versión Arquitectura: V19.4 - Sincronización Explícita y Aprovisionamiento Firebase Auth en Registro de Pasajeros
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\pasajeros\pasajero.controller.js
 * Misión: Gestión integral deduplicada de perfiles de pasajeros, direcciones favoritas, historial de trayectos, operaciones de saldo/billetera y blindaje contra colisiones de duplicidad E11000/Firebase Auth en peticiones concurrentes.
 * Ajuste V19.4: Importación de admin desde firebase.js y aprovisionamiento explícito de UID vía Firebase Auth (getUserByEmail/createUser) si la petición nace desde el backend sin UID previo del frontend.
 */

import mongoose from 'mongoose';
import Pasajero from '../../models/Pasajero.js';
import Usuario from '../../models/Usuario.js';
import Viaje from '../../models/Viaje.js';
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
        
        // Normalización y sanitización estricta de autorizadoPor
        let adminIdSanitizado = 'SISTEMA';
        if (autorizadoPor) {
            if (typeof autorizadoPor === 'object' && autorizadoPor._id) {
                adminIdSanitizado = autorizadoPor._id.toString();
            } else if (typeof autorizadoPor === 'object' && autorizadoPor.id) {
                adminIdSanitizado = autorizadoPor.id.toString();
            } else {
                adminIdSanitizado = String(autorizadoPor).trim();
            }
        }

        await dbFirestore.collection(pathTransacciones).add({
            idUsuario: idUsuario?.toString(),
            rol,
            subrol: subrol || 'cliente',
            monto,
            saldoAnterior,
            saldoNuevo,
            tipoOperacion,
            autorizadoPor: adminIdSanitizado,
            referencia: referencia || `TX-${Date.now()}`,
            timestamp: FieldValue.serverTimestamp(),
            fechaRegistro: new Date().toISOString()
        });
    } catch (error) {
        console.warn("⚠️ [FIRESTORE-TX-WARN] No se pudo registrar la transacción en Firestore:", error.message);
    }
};

// ==================================================================
// 1. GESTIÓN GENERAL DE PASAJEROS Y PERFIL (DEDUPLICADO POR AGGREGATION)
// ==================================================================

/**
 * 📋 Obtener listado de pasajeros deduplicado en DB mediante Pipeline de Agregación
 */
export const obtenerPasajeros = async (req, res) => {
    try {
        const listaLimpia = await Pasajero.aggregate([
            {
                $project: {
                    password: 0
                }
            },
            {
                $addFields: {
                    keyDeduplicacion: {
                        $cond: {
                            if: { $ne: ["$_id", null] },
                            then: { $toString: "$_id" },
                            else: {
                                $ifNull: [
                                    "$uid",
                                    {
                                        $ifNull: [
                                            "$email",
                                            { $ifNull: ["$telefonoMovil", "$telefono"] }
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    id: { $toString: "$_id" },
                    telefono: { $ifNull: ["$telefonoMovil", { $ifNull: ["$telefono", ""] }] },
                    rol: { $ifNull: ["$rol", { $ifNull: ["$role", "pasajero"] }] },
                    origenColeccion: "PASAJEROS"
                }
            },
            {
                $group: {
                    _id: "$keyDeduplicacion",
                    doc: { $first: "$$ROOT" }
                }
            },
            {
                $replaceRoot: { newRoot: "$doc" }
            },
            {
                $project: {
                    keyDeduplicacion: 0
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);

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
 * 📝 Registrar / Crear Pasajero con Captura de Duplicidad E11000 y Resiliencia Firebase Auth
 */
export const registrarPasajero = async (req, res) => {
    try {
        const { nombre, email, telefono, telefonoMovil, password, uid, direccion, fotoPerfil } = req.body;
        const telContacto = (telefonoMovil || telefono) ? String(telefonoMovil || telefono).trim() : null;
        const emailSanitizado = email ? String(email).toLowerCase().trim() : null;

        // 1. Validar campos requeridos mínimos
        if (!nombre || (!emailSanitizado && !telContacto)) {
            return res.status(400).json({
                success: false,
                code: 'MISSING_REQUIRED_FIELDS',
                message: "⚠️ El nombre y al menos un método de contacto (correo o teléfono) son obligatorios."
            });
        }

        // 2. Comprobar duplicados previos en MongoDB (Pasajero y Usuario)
        const condiciones = [];
        if (emailSanitizado) condiciones.push({ email: emailSanitizado });
        if (telContacto) condiciones.push({ telefonoMovil: telContacto }, { telefono: telContacto });

        if (condiciones.length > 0) {
            const [existePasajero, existeUsuario] = await Promise.all([
                Pasajero.findOne({ $or: condiciones }).lean(),
                Usuario.findOne({ $or: condiciones }).lean()
            ]);

            if (existePasajero || existeUsuario) {
                return res.status(400).json({
                    success: false,
                    code: 'DUPLICATE_USER',
                    message: "⚠️ El correo electrónico o número móvil ya pertenece a un usuario/pasajero registrado."
                });
            }
        }

        // 3. Aprovisionamiento y sincronización explícita con Firebase Auth si no viene desde el cliente
        let targetUid = uid ? String(uid).trim() : undefined;

        if (!targetUid && admin && admin.auth) {
            if (emailSanitizado) {
                try {
                    const userRecord = await admin.auth().getUserByEmail(emailSanitizado);
                    targetUid = userRecord.uid;
                } catch (authErr) {
                    if (authErr.code === 'auth/user-not-found') {
                        try {
                            const nuevoUsuarioAuth = await admin.auth().createUser({
                                email: emailSanitizado,
                                displayName: String(nombre).trim(),
                                phoneNumber: (telContacto && telContacto.startsWith('+')) ? telContacto : undefined,
                                password: password || undefined,
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
            } else if (telContacto && telContacto.startsWith('+')) {
                try {
                    const userRecord = await admin.auth().getUserByPhoneNumber(telContacto);
                    targetUid = userRecord.uid;
                } catch (authErr) {
                    if (authErr.code === 'auth/user-not-found') {
                        try {
                            const nuevoUsuarioAuth = await admin.auth().createUser({
                                displayName: String(nombre).trim(),
                                phoneNumber: telContacto,
                                disabled: false
                            });
                            targetUid = nuevoUsuarioAuth.uid;
                        } catch (createErr) {
                            console.warn("⚠️ [FIREBASE-AUTH-CREATE-WARN] No se pudo aprovisionar usuario en Firebase Auth por teléfono:", createErr.message);
                        }
                    }
                }
            }
        }

        // 4. Crear el documento en MongoDB
        const nuevoPasajero = new Pasajero({
            nombre: String(nombre).trim(),
            email: emailSanitizado || undefined,
            telefonoMovil: telContacto || undefined,
            telefono: telContacto || undefined,
            uid: targetUid,
            direccion: direccion ? String(direccion).trim() : '',
            fotoPerfil: fotoPerfil || '',
            rol: 'pasajero',
            saldo: 0
        });

        await nuevoPasajero.save();

        // 5. Réplica de perfil inicial en Firebase Firestore
        try {
            const docFirestoreId = nuevoPasajero.uid || nuevoPasajero._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';
            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set({
                id: docFirestoreId,
                nombre: nuevoPasajero.nombre,
                fullName: nuevoPasajero.nombre,
                email: nuevoPasajero.email || '',
                telefono: telContacto || '',
                telefonoMovil: telContacto || '',
                rol: 'pasajero',
                saldo: 0,
                balance: 0,
                createdAt: new Date().toISOString()
            }, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ [CIMCO-PASAJERO-REG-FS-WARN] No se pudo replicar perfil inicial en Firestore:", fsErr.message);
        }

        return res.status(201).json({
            success: true,
            message: 'Pasajero registrado exitosamente.',
            data: nuevoPasajero,
            pasajero: nuevoPasajero
        });

    } catch (error) {
        console.error("❌ [CIMCO-PASAJERO-REG-ERROR] Error en registro de pasajero:", error);

        // Captura de error de índice único duplicado E11000 (Mongoose / MongoDB)
        if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
            const campoDuplicado = error.keyValue ? Object.keys(error.keyValue).join(', ') : 'correo o teléfono';
            return res.status(400).json({
                success: false,
                code: 'DUPLICATE_KEY_E11000',
                message: `⚠️ El ${campoDuplicado} ingresado ya se encuentra registrado por otro usuario.`
            });
        }

        // Captura de errores provenientes de Firebase Auth
        if (error.code && String(error.code).startsWith('auth/')) {
            return res.status(400).json({
                success: false,
                code: error.code,
                message: `⚠️ Error de autenticación en Firebase Auth: ${error.message}`
            });
        }

        // Captura de errores de validación de esquema Mongoose
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                message: `⚠️ Error en formato de datos: ${error.message}`
            });
        }

        return res.status(500).json({
            success: false,
            code: 'SYSTEM_FAULT',
            message: `SYSTEM_FAULT: ${error.message || 'Error interno del servidor al procesar el registro.'}`
        });
    }
};

/**
 * 🛡️ Middleware/Validación de Registro Único para Pasajeros
 */
export const validarPasajeroUnico = async (req, res, next) => {
    try {
        const { email, telefono, telefonoMovil } = req.body;
        const telContacto = (telefono || telefonoMovil) ? String(telefono || telefonoMovil).trim() : null;
        const emailSanitizado = email ? String(email).toLowerCase().trim() : null;

        const condicionesPasajero = [];
        if (emailSanitizado) condicionesPasajero.push({ email: emailSanitizado });
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
                    code: 'DUPLICATE_USER',
                    message: "⚠️ El número de teléfono o correo ya pertenece a un usuario/pasajero registrado."
                });
            }
        }
        next();
    } catch (error) {
        if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
            return res.status(400).json({
                success: false,
                code: 'DUPLICATE_KEY_E11000',
                message: "⚠️ El número de teléfono o correo ya pertenece a un usuario/pasajero registrado."
            });
        }
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
        if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
            const campoDuplicado = error.keyValue ? Object.keys(error.keyValue).join(', ') : 'correo o teléfono';
            return res.status(400).json({
                success: false,
                code: 'DUPLICATE_KEY_E11000',
                message: `⚠️ El ${campoDuplicado} ingresado ya está asignado a otro usuario.`
            });
        }
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
 * 💰 Consultar saldo del pasajero con timeout estricto de 3000ms y fallback resiliente $0 COP
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
        })
        .select('saldo nombre email')
        .maxTimeMS(3000)
        .lean();

        if (!pasajero) {
            return res.status(200).json({
                success: true,
                saldo: 0,
                message: 'Pasajero no encontrado, asignado saldo por defecto $0 COP.',
                data: { saldo: 0 }
            });
        }

        const saldoNumerico = Number(pasajero.saldo ?? 0);

        return res.status(200).json({
            success: true,
            saldo: isNaN(saldoNumerico) ? 0 : saldoNumerico,
            data: pasajero
        });
    } catch (error) {
        console.warn("⚠️ [CIMCO-PASAJERO-SALDO] Error o latencia en DB Mongoose (maxTimeMS 3000ms alcanzado). Fallback activo $0 COP:", error?.message);
        return res.status(200).json({
            success: true,
            saldo: 0,
            error: error?.message || "Excepción de base de datos capturada",
            data: { saldo: 0 }
        });
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
        
        // Normalización y sanitización estricta de adminId
        const rawAdminId = req.user?.id || req.user?._id || 'SISTEMA_PASAJERO';
        const adminIdSanitizado = (typeof rawAdminId === 'object' && rawAdminId !== null)
            ? rawAdminId.toString()
            : String(rawAdminId).trim();

        const adminObjectId = mongoose.Types.ObjectId.isValid(adminIdSanitizado)
            ? new mongoose.Types.ObjectId(adminIdSanitizado)
            : null;

        if (!targetId || isNaN(montoNum) || montoNum <= 0) {
            await session.abortTransaction();
            session.endSession();
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
            session.endSession();
            return res.status(404).json({ success: false, message: "Pasajero no localizado." });
        }

        const saldoAnterior = Number(pasajero.saldo || 0);
        const saldoNuevo = saldoAnterior + montoNum;

        // ✅ Historial en MongoDB con mapeo semántico limpio (usuario / pasajero) y ObjectId/String sanitizado
        const nuevoHistorial = new HistorialSaldo({
            usuario: pasajero._id,
            pasajero: pasajero._id,
            monto: montoNum,
            tipo: 'RECARGA',
            rolTarget: 'pasajero',
            saldoAnterior,
            saldoNuevo,
            realizadoPor: adminObjectId || adminIdSanitizado,
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
            autorizadoPor: adminIdSanitizado,
            referencia: referencia || `PAS-${Date.now()}`
        });

        return res.status(200).json({
            success: true,
            message: `Recarga de pasajero exitosa. Nuevo saldo: $${saldoNuevo} COP`,
            saldoNuevo,
            data: { saldoNuevo }
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        return res.status(500).json({ success: false, message: error.message });
    }
};

export default {
    obtenerPasajeros,
    registrarPasajero,
    validarPasajeroUnico,
    obtenerPerfilPasajero,
    actualizarPerfilPasajero,
    agregarDireccionFavorita,
    eliminarDireccionFavorita,
    obtenerHistorialViajesPasajero,
    obtenerSaldoPasajero,
    recargarSaldoPasajero
};