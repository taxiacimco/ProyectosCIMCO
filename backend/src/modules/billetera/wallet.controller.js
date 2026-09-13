// Versión Arquitectura: V3.0 - Eliminación de break, actualización en cascada en usuarios y emisión broadcast multidominio Socket.io
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\billetera\wallet.controller.js
 * Misión: Controlador integral de billetera bajo sintaxis ES Modules nativa. Provee consulta concurrente de saldos con proyección optimizada,
 *         mutaciones con transacciones atómicas ACID (session.withTransaction) para prevenir condiciones de carrera (race conditions),
 *         actualización en cascada sobre la colección usuarios, revaluación automática de estado operativo (umbral $2.000 COP),
 *         auditoría doble (MongoDB y Firestore) con persistencia de pasajeroId, consulta de historial de movimientos por usuario
 *         y emisión de eventos Socket.io a todas las salas del usuario (saldo_actualizado, saldo_actualizado_cliente, actualizar_saldo_pasajero, saldo_actualizado_admin).
 */

import mongoose from 'mongoose';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Helper interno para revaluar el estado operativo de conductores/despachadores según el umbral de $2.000 COP
 */
const calcularEstadoOperativo = (coleccionOrigen, rolUsuario, saldoNuevo, estadoActual) => {
    const esConductorODespachador = 
        ['conductores', 'despachadores'].includes(coleccionOrigen) || 
        ['conductor', 'despachador', 'mototaxi', 'motoparrillero', 'motocarga'].includes((rolUsuario || '').toLowerCase());

    if (esConductorODespachador) {
        return saldoNuevo >= 2000 ? 'DISPONIBLE' : 'BLOQUEADO_SALDO';
    }
    return estadoActual || null;
};

/**
 * Helper interno para transmitir el saldo actualizado a todas las salas Socket.io asociadas al usuario.
 */
const emitirSaldoSocket = (io, uid, payloadCliente, payloadAdmin = null) => {
    if (!io || !uid) return;

    const salasUsuario = Array.from(new Set([
        `usuario_${uid}`,
        `pasajero_${uid}`,
        `conductor_${uid}`,
        `despachador_${uid}`,
        `cliente_${uid}`,
        `billetera_${uid}`,
        String(uid)
    ]));

    salasUsuario.forEach((sala) => {
        io.to(sala).emit('saldo_actualizado', payloadCliente);
        io.to(sala).emit('saldo_actualizado_cliente', payloadCliente);
        io.to(sala).emit('actualizar_saldo_pasajero', payloadCliente);
    });

    if (payloadAdmin) {
        io.to('sala_admins').emit('admin_saldo_usuario_actualizado', payloadAdmin);
        io.to('sala_admins').emit('saldo_actualizado_admin', payloadAdmin);
    }
};

/**
 * Obtiene el saldo actual del usuario autenticado o especificado de forma ultrarrápida mediante Promise.all y proyección de campos reducida.
 */
export const obtenerSaldo = async (req, res) => {
    try {
        const targetUserId = req.body?.targetUserId || req.body?.usuarioId || req.body?.id || req.query?.targetUserId || req.query?.usuarioId || req.query?.id || req.params?.id || req.user?.id || req.user?.uid;

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: "ID de usuario objetivo no proporcionado (targetUserId)" });
        }

        const db = mongoose.connection.db;
        if (!db) {
            return res.status(503).json({ success: false, message: "Base de datos no inicializada" });
        }

        // Proyección optimizada para transferir únicamente los campos requeridos de saldo
        const projection = { projection: { saldo: 1, 'billetera.saldo': 1, uid: 1 } };

        // Paralelización de consultas secuenciales por UID con proyección de red reducida
        const [usuarioUid, pasajeroUid, conductorUid] = await Promise.all([
            db.collection('usuarios').findOne({ uid: targetUserId }, projection),
            db.collection('pasajeros').findOne({ uid: targetUserId }, projection),
            db.collection('conductores').findOne({ uid: targetUserId }, projection)
        ]);

        let usuario = usuarioUid || pasajeroUid || conductorUid;

        if (!usuario) {
            // Intento secundario paralelizado buscando por ObjectId si el uid no arrojó resultados
            try {
                if (mongoose.Types.ObjectId.isValid(targetUserId)) {
                    const objectId = new mongoose.Types.ObjectId(targetUserId);
                    const [usuarioId, pasajeroId, conductorId] = await Promise.all([
                        db.collection('usuarios').findOne({ _id: objectId }, projection),
                        db.collection('pasajeros').findOne({ _id: objectId }, projection),
                        db.collection('conductores').findOne({ _id: objectId }, projection)
                    ]);
                    usuario = usuarioId || pasajeroId || conductorId;
                }
            } catch (e) {
                // El ID no tiene formato ObjectId válido, se ignora
            }
        }

        if (!usuario) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado en los registros del sistema." });
        }

        const saldoActual = usuario.saldo ?? usuario.billetera?.saldo ?? 0;

        return res.status(200).json({
            success: true,
            saldo: saldoActual,
            moneda: 'COP'
        });

    } catch (error) {
        console.error("🚨 [WALLET-CONTROLLER-ERROR]:", error);
        return res.status(500).json({ success: false, error: error?.message || "Error interno del servidor al consultar saldo." });
    }
};

/**
 * Consulta el historial de movimientos financieros del usuario autenticado (pasajero/conductor/usuario).
 */
export const obtenerHistorialMovimientos = async (req, res) => {
    try {
        const uid = req.user?.uid || req.user?.id;
        
        if (!uid) {
            return res.status(400).json({ success: false, message: "ID de usuario autenticado no proporcionado." });
        }

        const db = mongoose.connection.db;
        if (!db) {
            return res.status(503).json({ success: false, message: "Base de datos no inicializada" });
        }

        const historial = await db.collection('historialsaldos')
            .find({ $or: [{ pasajeroId: uid }, { usuarioId: uid }, { entidadId: uid }, { conductorId: uid }] })
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({ success: true, data: historial || [] });
    } catch (error) {
        console.error("🚨 [OBTENER-HISTORIAL-ERROR]:", error);
        return res.status(500).json({ success: false, message: error?.message || "Error al consultar historial de movimientos." });
    }
};

/**
 * Actualiza el saldo de un usuario de forma atómica e informa en tiempo real vía Socket.io.
 */
export const actualizarSaldo = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const usuarioId = req.body?.usuarioId || req.body?.targetUserId || req.body?.id;
        const nuevoSaldoInput = req.body?.nuevoSaldo ?? req.body?.saldo;
        const nuevoSaldo = Number(nuevoSaldoInput);

        if (!usuarioId) {
            return res.status(400).json({ status: 'ERROR', success: false, message: "ID de usuario objetivo requerido (usuarioId)." });
        }

        if (isNaN(nuevoSaldo) || nuevoSaldo < 0) {
            return res.status(400).json({ status: 'ERROR', success: false, message: "El valor de nuevoSaldo debe ser un número válido no negativo." });
        }

        let usuarioActualizado = null;

        await session.withTransaction(async () => {
            const db = mongoose.connection.db;
            if (!db) {
                const err = new Error("Base de datos no inicializada.");
                err.statusCode = 503;
                throw err;
            }

            const queryFilter = mongoose.Types.ObjectId.isValid(usuarioId)
                ? { $or: [{ uid: usuarioId }, { _id: new mongoose.Types.ObjectId(usuarioId) }] }
                : { uid: usuarioId };

            const colecciones = ['conductores', 'despachadores', 'pasajeros', 'usuarios'];
            let encontrado = false;

            for (const colName of colecciones) {
                const targetDoc = await db.collection(colName).findOne(queryFilter, { session });
                if (targetDoc) {
                    encontrado = true;
                    const nuevoEstado = calcularEstadoOperativo(colName, targetDoc.rol, nuevoSaldo, targetDoc.estadoOperativo);
                    const updateFields = {
                        saldo: nuevoSaldo,
                        'billetera.saldo': nuevoSaldo,
                        updatedAt: new Date()
                    };
                    if (nuevoEstado) {
                        updateFields.estadoOperativo = nuevoEstado;
                    }

                    await db.collection(colName).updateOne(
                        { _id: targetDoc._id },
                        { $set: updateFields },
                        { session }
                    );

                    const targetUid = targetDoc.uid || targetDoc._id.toString();

                    // Actualización en cascada sobre la colección usuarios
                    if (['pasajeros', 'conductores', 'despachadores'].includes(colName)) {
                        const userCascadeFilter = mongoose.Types.ObjectId.isValid(targetUid)
                            ? { $or: [{ uid: targetUid }, { _id: new mongoose.Types.ObjectId(targetUid) }] }
                            : { uid: targetUid };

                        await db.collection('usuarios').updateMany(
                            userCascadeFilter,
                            { $set: updateFields },
                            { session }
                        );
                    }

                    usuarioActualizado = {
                        uid: targetUid,
                        coleccion: colName,
                        nuevoEstado
                    };
                }
            }

            if (!encontrado) {
                const err = new Error("Usuario no encontrado para actualizar saldo.");
                err.statusCode = 404;
                throw err;
            }
        });

        // Emisión en tiempo real a través de Socket.io post-transacción a todas las salas del usuario
        try {
            const io = req.app?.get('io');
            if (io && usuarioActualizado) {
                const uid = usuarioActualizado.uid;
                const payloadCliente = { saldo: nuevoSaldo, nuevoSaldo, usuarioId: uid };
                const payloadAdmin = { usuarioId: uid, nuevoSaldo };

                emitirSaldoSocket(io, uid, payloadCliente, payloadAdmin);
            }
        } catch (socketErr) {
            console.warn("⚠️ [SOCKET-EMIT-WARNING]: No se pudo emitir evento de saldo:", socketErr?.message);
        }

        return res.status(200).json({ status: 'OK', success: true, saldo: nuevoSaldo, nuevoSaldo });
    } catch (error) {
        console.error("🚨 [ACTUALIZAR-SALDO-ERROR]:", error);
        return res.status(error.statusCode || 500).json({
            status: 'ERROR',
            success: false,
            message: error?.message || "Error interno al actualizar saldo."
        });
    } finally {
        await session.endSession();
    }
};

/**
 * Recarga de saldo con garantía ACID estricta mediante Mongoose session.withTransaction.
 * Evita condiciones de carrera en acreditaciones concurrentes y persiste la propiedad 'pasajeroId'.
 */
export const recargarSaldo = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const targetUserId = req.body?.targetUserId || req.body?.usuarioId || req.body?.id || req.user?.id || req.user?.uid;
        const montoInput = req.body?.monto || req.body?.montoRecarga;
        const montoNumerico = Number(montoInput);
        const motivo = req.body?.motivo || 'Recarga de saldo en billetera';
        const metodoPago = req.body?.metodoPago || 'TRANSFERENCIA';
        const ejecutadoPor = req.user?.id || req.user?.uid || 'SISTEMA_RECARGAS';
        const rolEjecutor = req.user?.rol || req.user?.role || 'CLIENTE';

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: "ID de usuario objetivo requerido." });
        }

        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            return res.status(400).json({ success: false, message: "El monto de la recarga debe ser un número positivo mayor a cero." });
        }

        let resultadoTransaccion = null;

        await session.withTransaction(async () => {
            const db = mongoose.connection.db;
            if (!db) {
                const err = new Error("Base de datos no inicializada.");
                err.statusCode = 503;
                throw err;
            }

            const queryFilter = mongoose.Types.ObjectId.isValid(targetUserId)
                ? { $or: [{ uid: targetUserId }, { _id: new mongoose.Types.ObjectId(targetUserId) }] }
                : { uid: targetUserId };

            const colecciones = ['conductores', 'despachadores', 'pasajeros', 'usuarios'];
            let targetDocFound = null;
            let coleccionOrigenFound = '';

            for (const colName of colecciones) {
                const doc = await db.collection(colName).findOne(queryFilter, { session });
                if (doc) {
                    if (!targetDocFound) {
                        targetDocFound = doc;
                        coleccionOrigenFound = colName;
                    }

                    const saldoAnterior = doc.saldo ?? doc.billetera?.saldo ?? 0;
                    const saldoNuevo = saldoAnterior + montoNumerico;
                    const rolUsuario = doc.rol || doc.tipoUsuario || colName;
                    const nuevoEstadoOperativo = calcularEstadoOperativo(colName, rolUsuario, saldoNuevo, doc.estadoOperativo);

                    const updateFields = {
                        saldo: saldoNuevo,
                        'billetera.saldo': saldoNuevo,
                        updatedAt: new Date()
                    };

                    if (nuevoEstadoOperativo) {
                        updateFields.estadoOperativo = nuevoEstadoOperativo;
                    }

                    await db.collection(colName).updateOne(
                        { _id: doc._id },
                        { $set: updateFields },
                        { session }
                    );

                    const targetUid = doc.uid || doc._id.toString();

                    // Actualización en cascada sobre la colección usuarios si aplica
                    if (['pasajeros', 'conductores', 'despachadores'].includes(colName)) {
                        const userCascadeFilter = mongoose.Types.ObjectId.isValid(targetUid)
                            ? { $or: [{ uid: targetUid }, { _id: new mongoose.Types.ObjectId(targetUid) }] }
                            : { uid: targetUid };

                        await db.collection('usuarios').updateMany(
                            userCascadeFilter,
                            { $set: updateFields },
                            { session }
                        );
                    }
                }
            }

            if (!targetDocFound) {
                const err = new Error("Usuario objetivo no encontrado en ninguna colección del sistema.");
                err.statusCode = 404;
                throw err;
            }

            const targetDoc = targetDocFound;
            const coleccionOrigen = coleccionOrigenFound;
            const saldoAnterior = targetDoc.saldo ?? targetDoc.billetera?.saldo ?? 0;
            const saldoNuevo = saldoAnterior + montoNumerico;
            const rolUsuario = targetDoc.rol || targetDoc.tipoUsuario || coleccionOrigen;
            const nuevoEstadoOperativo = calcularEstadoOperativo(coleccionOrigen, rolUsuario, saldoNuevo, targetDoc.estadoOperativo);

            const transaccionId = new mongoose.Types.ObjectId();
            const targetUid = targetDoc.uid || targetDoc._id.toString();

            const registroHistorial = {
                _id: transaccionId,
                usuarioId: targetUid,
                pasajeroId: targetUid,
                entidadId: targetUid,
                conductorId: coleccionOrigen === 'conductores' ? targetUid : null,
                tipoEntidad: coleccionOrigen === 'conductores' ? 'Conductor' : 'Usuario',
                targetMongoId: targetDoc._id,
                coleccionOrigen,
                tipoOperacion: 'RECARGA',
                monto: montoNumerico,
                saldoAnterior,
                saldoNuevo,
                metodoPago,
                motivo,
                ejecutadoPor,
                rolEjecutor,
                estadoOperativoResultante: nuevoEstadoOperativo,
                fecha: new Date(),
                createdAt: new Date()
            };

            await db.collection('historialsaldos').insertOne(registroHistorial, { session });

            resultadoTransaccion = {
                transaccionId: transaccionId.toString(),
                usuarioId: targetUid,
                pasajeroId: targetUid,
                coleccionOrigen,
                saldoAnterior,
                saldoNuevo,
                monto: montoNumerico,
                estadoOperativo: nuevoEstadoOperativo,
                motivo
            };
        });

        // Trazabilidad secundaria en Firestore post-transacción
        try {
            const firestoreDb = getFirestore();
            if (firestoreDb && resultadoTransaccion) {
                await firestoreDb.collection('transacciones').doc(resultadoTransaccion.transaccionId).set({
                    ...resultadoTransaccion,
                    tipoOperacion: 'RECARGA',
                    timestamp: new Date().toISOString()
                });

                const userRef = firestoreDb.collection(resultadoTransaccion.coleccionOrigen).doc(resultadoTransaccion.usuarioId);
                const docSnap = await userRef.get();
                if (docSnap.exists) {
                    const firestoreUpdate = { saldo: resultadoTransaccion.saldoNuevo };
                    if (resultadoTransaccion.estadoOperativo) {
                        firestoreUpdate.estadoOperativo = resultadoTransaccion.estadoOperativo;
                    }
                    await userRef.update(firestoreUpdate);
                }
            }
        } catch (fsError) {
            console.warn("⚠️ [AUDITORIA-FIRESTORE-WARNING]: Error sincronizando auditoría en Firestore:", fsError?.message);
        }

        // Emisión de eventos Socket.io a todas las salas asociadas
        try {
            const io = req.app?.get('io');
            if (io && resultadoTransaccion) {
                const uid = resultadoTransaccion.usuarioId;
                const payloadCliente = {
                    saldo: resultadoTransaccion.saldoNuevo,
                    nuevoSaldo: resultadoTransaccion.saldoNuevo,
                    tipoOperacion: 'RECARGA',
                    monto: montoNumerico,
                    usuarioId: uid
                };
                const payloadAdmin = {
                    ...resultadoTransaccion,
                    tipoOperacion: 'RECARGA'
                };

                emitirSaldoSocket(io, uid, payloadCliente, payloadAdmin);
            }
        } catch (socketErr) {
            console.warn("⚠️ [SOCKET-EMIT-WARNING]: Error emitiendo socket de recarga:", socketErr?.message);
        }

        return res.status(200).json({
            success: true,
            message: "Recarga de saldo procesada exitosamente con aislamiento atómico ACID.",
            data: resultadoTransaccion
        });

    } catch (error) {
        console.error("🚨 [RECARGAR-SALDO-ERROR]:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error?.message || "Error interno al procesar la recarga de saldo."
        });
    } finally {
        await session.endSession();
    }
};

/**
 * Débito de saldo con garantía ACID estricta mediante Mongoose session.withTransaction.
 * Bloquea saldos negativos, previene race conditions en cobros y persiste la propiedad 'pasajeroId'.
 */
export const debitarSaldo = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const targetUserId = req.body?.targetUserId || req.body?.usuarioId || req.body?.id || req.user?.id || req.user?.uid;
        const montoInput = req.body?.monto || req.body?.montoDebito;
        const montoNumerico = Number(montoInput);
        const motivo = req.body?.motivo || 'Débito / Cobro de comisión de billetera';
        const ejecutadoPor = req.user?.id || req.user?.uid || 'SISTEMA_DEBITOS';
        const rolEjecutor = req.user?.rol || req.user?.role || 'SISTEMA';

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: "ID de usuario objetivo requerido." });
        }

        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            return res.status(400).json({ success: false, message: "El monto a debitar debe ser un número positivo mayor a cero." });
        }

        let resultadoTransaccion = null;

        await session.withTransaction(async () => {
            const db = mongoose.connection.db;
            if (!db) {
                const err = new Error("Base de datos no inicializada.");
                err.statusCode = 503;
                throw err;
            }

            const queryFilter = mongoose.Types.ObjectId.isValid(targetUserId)
                ? { $or: [{ uid: targetUserId }, { _id: new mongoose.Types.ObjectId(targetUserId) }] }
                : { uid: targetUserId };

            const colecciones = ['conductores', 'despachadores', 'pasajeros', 'usuarios'];
            let targetDocFound = null;
            let coleccionOrigenFound = '';

            for (const colName of colecciones) {
                const doc = await db.collection(colName).findOne(queryFilter, { session });
                if (doc) {
                    if (!targetDocFound) {
                        targetDocFound = doc;
                        coleccionOrigenFound = colName;
                    }

                    const saldoAnterior = doc.saldo ?? doc.billetera?.saldo ?? 0;
                    const saldoNuevo = saldoAnterior - montoNumerico;

                    // Bloqueo de saldo negativo dentro de la transacción
                    if (saldoNuevo < 0) {
                        const err = new Error(`Fondos insuficientes para realizar el débito. Saldo disponible: $${saldoAnterior} COP. Intenta debitar: $${montoNumerico} COP.`);
                        err.statusCode = 400;
                        throw err;
                    }

                    const rolUsuario = doc.rol || doc.tipoUsuario || colName;
                    const nuevoEstadoOperativo = calcularEstadoOperativo(colName, rolUsuario, saldoNuevo, doc.estadoOperativo);

                    const updateFields = {
                        saldo: saldoNuevo,
                        'billetera.saldo': saldoNuevo,
                        updatedAt: new Date()
                    };

                    if (nuevoEstadoOperativo) {
                        updateFields.estadoOperativo = nuevoEstadoOperativo;
                    }

                    await db.collection(colName).updateOne(
                        { _id: doc._id },
                        { $set: updateFields },
                        { session }
                    );

                    const targetUid = doc.uid || doc._id.toString();

                    // Actualización en cascada sobre la colección usuarios
                    if (['pasajeros', 'conductores', 'despachadores'].includes(colName)) {
                        const userCascadeFilter = mongoose.Types.ObjectId.isValid(targetUid)
                            ? { $or: [{ uid: targetUid }, { _id: new mongoose.Types.ObjectId(targetUid) }] }
                            : { uid: targetUid };

                        await db.collection('usuarios').updateMany(
                            userCascadeFilter,
                            { $set: updateFields },
                            { session }
                        );
                    }
                }
            }

            if (!targetDocFound) {
                const err = new Error("Usuario objetivo no encontrado en ninguna colección del sistema.");
                err.statusCode = 404;
                throw err;
            }

            const targetDoc = targetDocFound;
            const coleccionOrigen = coleccionOrigenFound;
            const saldoAnterior = targetDoc.saldo ?? targetDoc.billetera?.saldo ?? 0;
            const saldoNuevo = saldoAnterior - montoNumerico;
            const rolUsuario = targetDoc.rol || targetDoc.tipoUsuario || coleccionOrigen;
            const nuevoEstadoOperativo = calcularEstadoOperativo(coleccionOrigen, rolUsuario, saldoNuevo, targetDoc.estadoOperativo);

            const transaccionId = new mongoose.Types.ObjectId();
            const targetUid = targetDoc.uid || targetDoc._id.toString();

            const registroHistorial = {
                _id: transaccionId,
                usuarioId: targetUid,
                pasajeroId: targetUid,
                entidadId: targetUid,
                conductorId: coleccionOrigen === 'conductores' ? targetUid : null,
                tipoEntidad: coleccionOrigen === 'conductores' ? 'Conductor' : 'Usuario',
                targetMongoId: targetDoc._id,
                coleccionOrigen,
                tipoOperacion: 'DEBITO',
                monto: montoNumerico,
                saldoAnterior,
                saldoNuevo,
                motivo,
                ejecutadoPor,
                rolEjecutor,
                estadoOperativoResultante: nuevoEstadoOperativo,
                fecha: new Date(),
                createdAt: new Date()
            };

            await db.collection('historialsaldos').insertOne(registroHistorial, { session });

            resultadoTransaccion = {
                transaccionId: transaccionId.toString(),
                usuarioId: targetUid,
                pasajeroId: targetUid,
                coleccionOrigen,
                saldoAnterior,
                saldoNuevo,
                monto: montoNumerico,
                estadoOperativo: nuevoEstadoOperativo,
                motivo
            };
        });

        // Trazabilidad secundaria en Firestore post-transacción
        try {
            const firestoreDb = getFirestore();
            if (firestoreDb && resultadoTransaccion) {
                await firestoreDb.collection('transacciones').doc(resultadoTransaccion.transaccionId).set({
                    ...resultadoTransaccion,
                    tipoOperacion: 'DEBITO',
                    timestamp: new Date().toISOString()
                });

                const userRef = firestoreDb.collection(resultadoTransaccion.coleccionOrigen).doc(resultadoTransaccion.usuarioId);
                const docSnap = await userRef.get();
                if (docSnap.exists) {
                    const firestoreUpdate = { saldo: resultadoTransaccion.saldoNuevo };
                    if (resultadoTransaccion.estadoOperativo) {
                        firestoreUpdate.estadoOperativo = resultadoTransaccion.estadoOperativo;
                    }
                    await userRef.update(firestoreUpdate);
                }
            }
        } catch (fsError) {
            console.warn("⚠️ [AUDITORIA-FIRESTORE-WARNING]: Error sincronizando auditoría en Firestore:", fsError?.message);
        }

        // Emisión de eventos Socket.io a todas las salas asociadas
        try {
            const io = req.app?.get('io');
            if (io && resultadoTransaccion) {
                const uid = resultadoTransaccion.usuarioId;
                const payloadCliente = {
                    saldo: resultadoTransaccion.saldoNuevo,
                    nuevoSaldo: resultadoTransaccion.saldoNuevo,
                    tipoOperacion: 'DEBITO',
                    monto: montoNumerico,
                    usuarioId: uid
                };
                const payloadAdmin = {
                    ...resultadoTransaccion,
                    tipoOperacion: 'DEBITO'
                };

                emitirSaldoSocket(io, uid, payloadCliente, payloadAdmin);
            }
        } catch (socketErr) {
            console.warn("⚠️ [SOCKET-EMIT-WARNING]: Error emitiendo socket de débito:", socketErr?.message);
        }

        return res.status(200).json({
            success: true,
            message: "Débito de saldo procesado exitosamente con aislamiento atómico ACID.",
            data: resultadoTransaccion
        });

    } catch (error) {
        console.error("🚨 [DEBITAR-SALDO-ERROR]:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error?.message || "Error interno al procesar el débito de saldo."
        });
    } finally {
        await session.endSession();
    }
};

/**
 * Endpoint de nivel Admin/CEO para recargas o débitos manuales sobre Pasajeros, Conductores y Despachadores.
 * Utiliza session.withTransaction() para asegurar consistencia ACID atómica y persiste la propiedad 'pasajeroId'.
 */
export const gestionarSaldoManual = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const adminId = req.user?.id || req.user?.uid;
        const adminRol = req.user?.rol || req.user?.role;

        // Validar permisos de acceso (Admin / CEO / Nivel 99)
        const accessLevel = req.user?.access_level !== undefined ? Number(req.user.access_level) : 0;
        const esAutorizado = accessLevel >= 99 || ['ADMIN', 'CEO', 'ADMINISTRADOR'].includes(adminRol?.toUpperCase());

        if (!adminId || !esAutorizado) {
            return res.status(403).json({ success: false, message: "Acceso denegado. Se requieren privilegios de Admin/CEO." });
        }

        const targetUserId = req.body?.targetUserId || req.body?.usuarioId || req.body?.id || req.query?.targetUserId || req.query?.usuarioId || req.query?.id;
        const { tipoOperacion, monto, motivo } = req.body || {};

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: "ID de usuario objetivo no proporcionado (targetUserId)" });
        }

        if (!['RECARGA', 'DEBITO'].includes(tipoOperacion?.toUpperCase())) {
            return res.status(400).json({ success: false, message: "Tipo de operación inválido. Use 'RECARGA' o 'DEBITO'." });
        }

        const montoNumerico = Number(monto);
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            return res.status(400).json({ success: false, message: "El monto debe ser un número positivo mayor a cero." });
        }

        let resultadoTransaccion = null;

        await session.withTransaction(async () => {
            const db = mongoose.connection.db;
            if (!db) {
                const err = new Error("Base de datos no inicializada.");
                err.statusCode = 503;
                throw err;
            }

            const queryFilter = mongoose.Types.ObjectId.isValid(targetUserId)
                ? { $or: [{ uid: targetUserId }, { _id: new mongoose.Types.ObjectId(targetUserId) }] }
                : { uid: targetUserId };

            const colecciones = ['conductores', 'despachadores', 'pasajeros', 'usuarios'];
            let targetDocFound = null;
            let coleccionOrigenFound = '';

            for (const colName of colecciones) {
                const doc = await db.collection(colName).findOne(queryFilter, { session });
                if (doc) {
                    if (!targetDocFound) {
                        targetDocFound = doc;
                        coleccionOrigenFound = colName;
                    }

                    const saldoAnterior = doc.saldo ?? doc.billetera?.saldo ?? 0;
                    const esRecarga = tipoOperacion.toUpperCase() === 'RECARGA';
                    const ajusteMonto = esRecarga ? montoNumerico : -montoNumerico;
                    const saldoNuevo = saldoAnterior + ajusteMonto;

                    if (saldoNuevo < 0) {
                        const err = new Error(`Fondos insuficientes para débito. Saldo actual: $${saldoAnterior} COP. Intenta debitar: $${montoNumerico} COP.`);
                        err.statusCode = 400;
                        throw err;
                    }

                    const rolUsuario = doc.rol || doc.tipoUsuario || colName;
                    const nuevoEstadoOperativo = calcularEstadoOperativo(colName, rolUsuario, saldoNuevo, doc.estadoOperativo);

                    const updateFields = {
                        saldo: saldoNuevo,
                        'billetera.saldo': saldoNuevo,
                        updatedAt: new Date()
                    };

                    if (nuevoEstadoOperativo) {
                        updateFields.estadoOperativo = nuevoEstadoOperativo;
                    }

                    await db.collection(colName).updateOne(
                        { _id: doc._id },
                        { $set: updateFields },
                        { session }
                    );

                    const targetUid = doc.uid || doc._id.toString();

                    // Actualización en cascada sobre la colección usuarios
                    if (['pasajeros', 'conductores', 'despachadores'].includes(colName)) {
                        const userCascadeFilter = mongoose.Types.ObjectId.isValid(targetUid)
                            ? { $or: [{ uid: targetUid }, { _id: new mongoose.Types.ObjectId(targetUid) }] }
                            : { uid: targetUid };

                        await db.collection('usuarios').updateMany(
                            userCascadeFilter,
                            { $set: updateFields },
                            { session }
                        );
                    }
                }
            }

            if (!targetDocFound) {
                const err = new Error("Usuario objetivo no encontrado en ninguna colección del sistema.");
                err.statusCode = 404;
                throw err;
            }

            const targetDoc = targetDocFound;
            const coleccionOrigen = coleccionOrigenFound;
            const saldoAnterior = targetDoc.saldo ?? targetDoc.billetera?.saldo ?? 0;
            const esRecarga = tipoOperacion.toUpperCase() === 'RECARGA';
            const ajusteMonto = esRecarga ? montoNumerico : -montoNumerico;
            const saldoNuevo = saldoAnterior + ajusteMonto;
            const rolUsuario = targetDoc.rol || targetDoc.tipoUsuario || coleccionOrigen;
            const nuevoEstadoOperativo = calcularEstadoOperativo(coleccionOrigen, rolUsuario, saldoNuevo, targetDoc.estadoOperativo);

            const transaccionId = new mongoose.Types.ObjectId();
            const targetUid = targetDoc.uid || targetDoc._id.toString();

            const registroHistorial = {
                _id: transaccionId,
                usuarioId: targetUid,
                pasajeroId: targetUid,
                entidadId: targetUid,
                conductorId: coleccionOrigen === 'conductores' ? targetUid : null,
                tipoEntidad: coleccionOrigen === 'conductores' ? 'Conductor' : 'Usuario',
                targetMongoId: targetDoc._id,
                coleccionOrigen,
                tipoOperacion: tipoOperacion.toUpperCase(),
                monto: montoNumerico,
                saldoAnterior,
                saldoNuevo,
                motivo: motivo || 'Ajuste manual de saldo por administración',
                ejecutadoPor: adminId,
                rolEjecutor: adminRol,
                estadoOperativoResultante: nuevoEstadoOperativo,
                fecha: new Date(),
                createdAt: new Date()
            };

            await db.collection('historialsaldos').insertOne(registroHistorial, { session });

            resultadoTransaccion = {
                transaccionId: transaccionId.toString(),
                usuarioId: targetUid,
                pasajeroId: targetUid,
                coleccionOrigen,
                saldoAnterior,
                saldoNuevo,
                monto: montoNumerico,
                estadoOperativo: nuevoEstadoOperativo,
                tipoOperacion: tipoOperacion.toUpperCase()
            };
        });

        // Trazabilidad y Auditoría Asíncrona en Firestore
        try {
            const firestoreDb = getFirestore();
            if (firestoreDb && resultadoTransaccion) {
                const registrarAuditoriaFirestore = async () => {
                    await firestoreDb.collection('transacciones').doc(resultadoTransaccion.transaccionId).set({
                        ...resultadoTransaccion,
                        motivo: motivo || 'Ajuste manual de saldo por administración',
                        ejecutadoPor: adminId,
                        rolEjecutor: adminRol,
                        timestamp: new Date().toISOString()
                    });

                    const userRef = firestoreDb.collection(resultadoTransaccion.coleccionOrigen).doc(resultadoTransaccion.usuarioId);
                    const docSnap = await userRef.get();
                    if (docSnap.exists) {
                        const firestoreUpdate = { saldo: resultadoTransaccion.saldoNuevo };
                        if (resultadoTransaccion.estadoOperativo) {
                            firestoreUpdate.estadoOperativo = resultadoTransaccion.estadoOperativo;
                        }
                        await userRef.update(firestoreUpdate);
                    }
                };

                registrarAuditoriaFirestore().catch(fsError => {
                    console.warn("⚠️ [AUDITORIA-FIRESTORE-WARNING]: Error sincronizando auditoría en Firestore:", fsError?.message);
                });
            }
        } catch (fsError) {
            console.warn("⚠️ [AUDITORIA-FIRESTORE-WARNING]: Error inicializando auditoría asíncrona en Firestore:", fsError?.message);
        }

        // Emisión de eventos en tiempo real mediante Socket.io a todas las salas de usuario
        try {
            const io = req.app?.get('io');
            if (io && resultadoTransaccion) {
                const uidTarget = resultadoTransaccion.usuarioId;

                const payloadCliente = {
                    saldo: resultadoTransaccion.saldoNuevo,
                    nuevoSaldo: resultadoTransaccion.saldoNuevo,
                    tipoOperacion: tipoOperacion.toUpperCase(),
                    monto: montoNumerico,
                    usuarioId: uidTarget
                };

                const payloadAdmin = {
                    usuarioId: uidTarget,
                    targetUserId,
                    nuevoSaldo: resultadoTransaccion.saldoNuevo,
                    saldoAnterior: resultadoTransaccion.saldoAnterior,
                    monto: montoNumerico,
                    tipoOperacion: tipoOperacion.toUpperCase(),
                    ejecutadoPor: adminId,
                    estadoOperativo: resultadoTransaccion.estadoOperativo
                };

                const uidsParaEmitir = Array.from(new Set([uidTarget, targetUserId].filter(Boolean)));
                uidsParaEmitir.forEach((uid) => {
                    emitirSaldoSocket(io, uid, payloadCliente, payloadAdmin);
                });
            }
        } catch (socketError) {
            console.warn("⚠️ [SOCKET-EMIT-WARNING]: Error emitiendo evento de saldo vía Socket.io:", socketError?.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Operación realizada con éxito',
            data: {
                nuevoSaldo: resultadoTransaccion?.saldoNuevo ?? 0,
                usuarioId: resultadoTransaccion?.usuarioId || targetUserId,
                transaccion: {
                    id: resultadoTransaccion?.transaccionId || null,
                    monto: resultadoTransaccion?.monto ?? 0,
                    tipo: resultadoTransaccion?.tipoOperacion || tipoOperacion,
                    fecha: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        console.error("🚨 [GESTIONAR-SALDO-MANUAL-ERROR]:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error?.message || "Error interno del servidor al procesar el ajuste de saldo manual."
        });
    } finally {
        await session.endSession();
    }
};

export default {
    obtenerSaldo,
    obtenerHistorialMovimientos,
    actualizarSaldo,
    recargarSaldo,
    debitarSaldo,
    gestionarSaldoManual
};