// Versión Arquitectura: V2.3 - Transacciones Atómicas Mongoose (session.withTransaction) para recargarSaldo, debitarSaldo y gestionarSaldoManual
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\billetera\wallet.controller.js
 * Misión: Controlador integral de billetera bajo sintaxis ES Modules nativa. Provee consulta concurrente de saldos,
 *         mutaciones con transacciones atómicas ACID (session.withTransaction) para prevenir condiciones de carrera (race conditions),
 *         revaluación automática de estado operativo (umbral $2.000 COP), auditoría doble (MongoDB y Firestore)
 *         y emisión de eventos Socket.io a la sala gerencial y canales de usuario.
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
 * Obtiene el saldo actual del usuario autenticado o especificado de forma ultrarrápida mediante Promise.all.
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

        // Paralelización de consultas secuenciales por UID
        const [usuarioUid, pasajeroUid, conductorUid] = await Promise.all([
            db.collection('usuarios').findOne({ uid: targetUserId }),
            db.collection('pasajeros').findOne({ uid: targetUserId }),
            db.collection('conductores').findOne({ uid: targetUserId })
        ]);

        let usuario = usuarioUid || pasajeroUid || conductorUid;

        if (!usuario) {
            // Intento secundario paralelizado buscando por ObjectId si el uid no arrojó resultados
            try {
                if (mongoose.Types.ObjectId.isValid(targetUserId)) {
                    const objectId = new mongoose.Types.ObjectId(targetUserId);
                    const [usuarioId, pasajeroId, conductorId] = await Promise.all([
                        db.collection('usuarios').findOne({ _id: objectId }),
                        db.collection('pasajeros').findOne({ _id: objectId }),
                        db.collection('conductores').findOne({ _id: objectId })
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

                    usuarioActualizado = {
                        uid: targetDoc.uid || targetDoc._id.toString(),
                        coleccion: colName,
                        nuevoEstado
                    };
                    break;
                }
            }

            if (!encontrado) {
                const err = new Error("Usuario no encontrado para actualizar saldo.");
                err.statusCode = 404;
                throw err;
            }
        });

        // Emisión en tiempo real a través de Socket.io post-transacción
        try {
            const io = req.app?.get('io');
            if (io && usuarioActualizado) {
                io.to(`usuario_${usuarioActualizado.uid}`).emit('saldo_actualizado', { saldo: nuevoSaldo });
                io.to('sala_admins').emit('admin_saldo_usuario_actualizado', {
                    usuarioId: usuarioActualizado.uid,
                    nuevoSaldo
                });
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
 * Evita condiciones de carrera en acreditaciones concurrentes.
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
            let targetDoc = null;
            let coleccionOrigen = '';

            for (const colName of colecciones) {
                const doc = await db.collection(colName).findOne(queryFilter, { session });
                if (doc) {
                    targetDoc = doc;
                    coleccionOrigen = colName;
                    break;
                }
            }

            if (!targetDoc) {
                const err = new Error("Usuario objetivo no encontrado en ninguna colección del sistema.");
                err.statusCode = 404;
                throw err;
            }

            const saldoAnterior = targetDoc.saldo ?? targetDoc.billetera?.saldo ?? 0;
            const saldoNuevo = saldoAnterior + montoNumerico;
            const rolUsuario = targetDoc.rol || targetDoc.tipoUsuario || coleccionOrigen;
            const nuevoEstadoOperativo = calcularEstadoOperativo(coleccionOrigen, rolUsuario, saldoNuevo, targetDoc.estadoOperativo);

            const updateFields = {
                saldo: saldoNuevo,
                'billetera.saldo': saldoNuevo,
                updatedAt: new Date()
            };

            if (nuevoEstadoOperativo) {
                updateFields.estadoOperativo = nuevoEstadoOperativo;
            }

            await db.collection(coleccionOrigen).updateOne(
                { _id: targetDoc._id },
                { $set: updateFields },
                { session }
            );

            const transaccionId = new mongoose.Types.ObjectId();
            const registroHistorial = {
                _id: transaccionId,
                usuarioId: targetDoc.uid || targetDoc._id.toString(),
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

            await db.collection('HistorialSaldo').insertOne(registroHistorial, { session });

            resultadoTransaccion = {
                transaccionId: transaccionId.toString(),
                usuarioId: targetDoc.uid || targetDoc._id.toString(),
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

        // Emisión de eventos Socket.io
        try {
            const io = req.app?.get('io');
            if (io && resultadoTransaccion) {
                io.to(`usuario_${resultadoTransaccion.usuarioId}`).emit('saldo_actualizado', {
                    saldo: resultadoTransaccion.saldoNuevo,
                    tipoOperacion: 'RECARGA',
                    monto: montoNumerico
                });

                io.to('sala_admins').emit('admin_saldo_usuario_actualizado', {
                    ...resultadoTransaccion,
                    tipoOperacion: 'RECARGA'
                });
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
 * Bloquea saldos negativos y previene race conditions en cobros o comisiones simultáneas.
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
            let targetDoc = null;
            let coleccionOrigen = '';

            for (const colName of colecciones) {
                const doc = await db.collection(colName).findOne(queryFilter, { session });
                if (doc) {
                    targetDoc = doc;
                    coleccionOrigen = colName;
                    break;
                }
            }

            if (!targetDoc) {
                const err = new Error("Usuario objetivo no encontrado en ninguna colección del sistema.");
                err.statusCode = 404;
                throw err;
            }

            const saldoAnterior = targetDoc.saldo ?? targetDoc.billetera?.saldo ?? 0;
            const saldoNuevo = saldoAnterior - montoNumerico;

            // Bloqueo de saldo negativo dentro de la transacción
            if (saldoNuevo < 0) {
                const err = new Error(`Fondos insuficientes para realizar el débito. Saldo disponible: $${saldoAnterior} COP. Intenta debitar: $${montoNumerico} COP.`);
                err.statusCode = 400;
                throw err;
            }

            const rolUsuario = targetDoc.rol || targetDoc.tipoUsuario || coleccionOrigen;
            const nuevoEstadoOperativo = calcularEstadoOperativo(coleccionOrigen, rolUsuario, saldoNuevo, targetDoc.estadoOperativo);

            const updateFields = {
                saldo: saldoNuevo,
                'billetera.saldo': saldoNuevo,
                updatedAt: new Date()
            };

            if (nuevoEstadoOperativo) {
                updateFields.estadoOperativo = nuevoEstadoOperativo;
            }

            await db.collection(coleccionOrigen).updateOne(
                { _id: targetDoc._id },
                { $set: updateFields },
                { session }
            );

            const transaccionId = new mongoose.Types.ObjectId();
            const registroHistorial = {
                _id: transaccionId,
                usuarioId: targetDoc.uid || targetDoc._id.toString(),
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

            await db.collection('HistorialSaldo').insertOne(registroHistorial, { session });

            resultadoTransaccion = {
                transaccionId: transaccionId.toString(),
                usuarioId: targetDoc.uid || targetDoc._id.toString(),
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

        // Emisión de eventos Socket.io
        try {
            const io = req.app?.get('io');
            if (io && resultadoTransaccion) {
                io.to(`usuario_${resultadoTransaccion.usuarioId}`).emit('saldo_actualizado', {
                    saldo: resultadoTransaccion.saldoNuevo,
                    tipoOperacion: 'DEBITO',
                    monto: montoNumerico
                });

                io.to('sala_admins').emit('admin_saldo_usuario_actualizado', {
                    ...resultadoTransaccion,
                    tipoOperacion: 'DEBITO'
                });
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
 * Utiliza session.withTransaction() para asegurar consistencia ACID atómica.
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
            let targetDoc = null;
            let coleccionOrigen = '';

            for (const colName of colecciones) {
                const doc = await db.collection(colName).findOne(queryFilter, { session });
                if (doc) {
                    targetDoc = doc;
                    coleccionOrigen = colName;
                    break;
                }
            }

            if (!targetDoc) {
                const err = new Error("Usuario objetivo no encontrado en ninguna colección del sistema.");
                err.statusCode = 404;
                throw err;
            }

            const saldoAnterior = targetDoc.saldo ?? targetDoc.billetera?.saldo ?? 0;
            const esRecarga = tipoOperacion.toUpperCase() === 'RECARGA';
            const ajusteMonto = esRecarga ? montoNumerico : -montoNumerico;
            const saldoNuevo = saldoAnterior + ajusteMonto;

            if (saldoNuevo < 0) {
                const err = new Error(`Fondos insuficientes para débito. Saldo actual: $${saldoAnterior} COP. Intenta debitar: $${montoNumerico} COP.`);
                err.statusCode = 400;
                throw err;
            }

            const rolUsuario = targetDoc.rol || targetDoc.tipoUsuario || coleccionOrigen;
            const nuevoEstadoOperativo = calcularEstadoOperativo(coleccionOrigen, rolUsuario, saldoNuevo, targetDoc.estadoOperativo);

            const updateFields = {
                saldo: saldoNuevo,
                'billetera.saldo': saldoNuevo,
                updatedAt: new Date()
            };

            if (nuevoEstadoOperativo) {
                updateFields.estadoOperativo = nuevoEstadoOperativo;
            }

            await db.collection(coleccionOrigen).updateOne(
                { _id: targetDoc._id },
                { $set: updateFields },
                { session }
            );

            const transaccionId = new mongoose.Types.ObjectId();
            const registroHistorial = {
                _id: transaccionId,
                usuarioId: targetDoc.uid || targetDoc._id.toString(),
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

            await db.collection('HistorialSaldo').insertOne(registroHistorial, { session });

            resultadoTransaccion = {
                transaccionId: transaccionId.toString(),
                usuarioId: targetDoc.uid || targetDoc._id.toString(),
                coleccionOrigen,
                saldoAnterior,
                saldoNuevo,
                monto: montoNumerico,
                estadoOperativo: nuevoEstadoOperativo,
                tipoOperacion: tipoOperacion.toUpperCase()
            };
        });

        // Trazabilidad y Auditoría en Firestore post-transacción
        try {
            const firestoreDb = getFirestore();
            if (firestoreDb && resultadoTransaccion) {
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
            }
        } catch (fsError) {
            console.warn("⚠️ [AUDITORIA-FIRESTORE-WARNING]: Error sincronizando auditoría en Firestore:", fsError?.message);
        }

        // Emisión de eventos en tiempo real mediante Socket.io
        try {
            const io = req.app?.get('io');
            if (io && resultadoTransaccion) {
                const uidTarget = resultadoTransaccion.usuarioId;

                io.to(`usuario_${uidTarget}`).emit('saldo_actualizado', {
                    saldo: resultadoTransaccion.saldoNuevo,
                    tipoOperacion: tipoOperacion.toUpperCase(),
                    monto: montoNumerico
                });

                if (targetUserId && targetUserId !== uidTarget) {
                    io.to(`usuario_${targetUserId}`).emit('saldo_actualizado', {
                        saldo: resultadoTransaccion.saldoNuevo,
                        tipoOperacion: tipoOperacion.toUpperCase(),
                        monto: montoNumerico
                    });
                }

                io.to('sala_admins').emit('admin_saldo_usuario_actualizado', {
                    usuarioId: uidTarget,
                    targetUserId,
                    nuevoSaldo: resultadoTransaccion.saldoNuevo,
                    saldoAnterior: resultadoTransaccion.saldoAnterior,
                    monto: montoNumerico,
                    tipoOperacion: tipoOperacion.toUpperCase(),
                    ejecutadoPor: adminId,
                    estadoOperativo: resultadoTransaccion.estadoOperativo
                });
            }
        } catch (socketError) {
            console.warn("⚠️ [SOCKET-EMIT-WARNING]: Error emitiendo evento de saldo vía Socket.io:", socketError?.message);
        }

        return res.status(200).json({
            success: true,
            message: `Operación de ${tipoOperacion.toUpperCase()} ejecutada con éxito bajo garantía ACID.`,
            data: resultadoTransaccion
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
    actualizarSaldo,
    recargarSaldo,
    debitarSaldo,
    gestionarSaldoManual
};