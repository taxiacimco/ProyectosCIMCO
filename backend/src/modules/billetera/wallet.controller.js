// Versión Arquitectura: V2.1 - Extracción flexibilizada y validación estandarizada de targetUserId

/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\billetera\wallet.controller.js
 * Misión: Controlador integral de billetera bajo sintaxis ES Modules nativa. Provee consulta concurrente de saldos
 * y administración ejecutiva (Admin/CEO) para recargas/débitos manuales con revaluación automática de estado operativo 
 * (umbral $2.000 COP) y trazabilidad/auditoría transaccional doble en MongoDB y Firestore.
 */

import mongoose from 'mongoose';
import { getFirestore } from 'firebase-admin/firestore';

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
 * Endpoint de nivel Admin/CEO para recargas o débitos manuales sobre Pasajeros, Conductores y Despachadores.
 * Revalúa el estado operativo de conductores/despachadores en base al umbral de $2.000 COP y audita
 * de forma atómica tanto en MongoDB (HistorialSaldo) como en Firestore (transacciones).
 */
export const gestionarSaldoManual = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const adminId = req.user?.id || req.user?.uid;
        const adminRol = req.user?.rol || req.user?.role;

        // Validar permisos de acceso (Admin / CEO)
        if (!adminId || !['ADMIN', 'CEO', 'ADMINISTRADOR'].includes(adminRol?.toUpperCase())) {
            await session.endSession();
            return res.status(403).json({ success: false, message: "Acceso denegado. Se requieren privilegios de Admin/CEO." });
        }

        const targetUserId = req.body?.targetUserId || req.body?.usuarioId || req.body?.id || req.query?.targetUserId || req.query?.usuarioId || req.query?.id;
        const { tipoOperacion, monto, motivo } = req.body || {};

        // Validaciones defensivas de payload
        if (!targetUserId) {
            await session.endSession();
            return res.status(400).json({ success: false, message: "ID de usuario objetivo no proporcionado (targetUserId)" });
        }

        if (!['RECARGA', 'DEBITO'].includes(tipoOperacion?.toUpperCase())) {
            await session.endSession();
            return res.status(400).json({ success: false, message: "Tipo de operación inválido. Use 'RECARGA' o 'DEBITO'." });
        }

        const montoNumerico = Number(monto);
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            await session.endSession();
            return res.status(400).json({ success: false, message: "El monto debe ser un número positivo mayor a cero." });
        }

        const db = mongoose.connection.db;
        if (!db) {
            await session.endSession();
            return res.status(503).json({ success: false, message: "Base de datos no inicializada." });
        }

        // Búsqueda del usuario en todas las colecciones principales en MongoDB
        let targetDoc = null;
        let coleccionOrigen = '';

        const queryFilter = mongoose.Types.ObjectId.isValid(targetUserId)
            ? { $or: [{ uid: targetUserId }, { _id: new mongoose.Types.ObjectId(targetUserId) }] }
            : { uid: targetUserId };

        const colecciones = ['conductores', 'despachadores', 'pasajeros', 'usuarios'];
        for (const colName of colecciones) {
            const doc = await db.collection(colName).findOne(queryFilter, { session });
            if (doc) {
                targetDoc = doc;
                coleccionOrigen = colName;
                break;
            }
        }

        if (!targetDoc) {
            await session.abortTransaction();
            await session.endSession();
            return res.status(404).json({ success: false, message: "Usuario objetivo no encontrado en ninguna colección del sistema." });
        }

        // Cálculo del nuevo saldo
        const saldoAnterior = targetDoc.saldo ?? targetDoc.billetera?.saldo ?? 0;
        const esRecarga = tipoOperacion.toUpperCase() === 'RECARGA';
        const ajusteMonto = esRecarga ? montoNumerico : -montoNumerico;
        const saldoNuevo = saldoAnterior + ajusteMonto;

        // Verificación de saldo negativo
        if (saldoNuevo < 0) {
            await session.abortTransaction();
            await session.endSession();
            return res.status(400).json({
                success: false,
                message: `Fondos insuficientes para débito. Saldo actual: $${saldoAnterior} COP. Intenta debitar: $${montoNumerico} COP.`
            });
        }

        // Revaluación del Estado Operativo (Umbral de $2,000 COP para Conductores y Despachadores)
        const rolUsuario = (targetDoc.rol || targetDoc.tipoUsuario || coleccionOrigen).toLowerCase();
        let nuevoEstadoOperativo = targetDoc.estadoOperativo || null;

        if (['conductores', 'despachadores'].includes(coleccionOrigen) || ['conductor', 'despachador'].includes(rolUsuario)) {
            if (saldoNuevo >= 2000) {
                nuevoEstadoOperativo = 'DISPONIBLE';
            } else {
                nuevoEstadoOperativo = 'BLOQUEADO_SALDO';
            }
        }

        // Preparar actualización en MongoDB
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

        // Registro de Auditoría Atómica en MongoDB (HistorialSaldo)
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

        // Confirmación de la transacción en MongoDB
        await session.commitTransaction();
        await session.endSession();

        // Trazabilidad y Auditoría en Firestore (Transacciones)
        try {
            const firestoreDb = getFirestore();
            if (firestoreDb) {
                const auditPayload = {
                    transaccionId: transaccionId.toString(),
                    usuarioId: targetDoc.uid || targetDoc._id.toString(),
                    tipoOperacion: tipoOperacion.toUpperCase(),
                    monto: montoNumerico,
                    saldoAnterior,
                    saldoNuevo,
                    motivo: motivo || 'Ajuste manual de saldo por administración',
                    ejecutadoPor: adminId,
                    rolEjecutor: adminRol,
                    estadoOperativoResultante: nuevoEstadoOperativo,
                    timestamp: new Date().toISOString()
                };

                await firestoreDb.collection('transacciones').doc(transaccionId.toString()).set(auditPayload);

                // Sincronización de estado operativo y saldo en Firestore en caso de existir perfil activo
                const targetUid = targetDoc.uid || targetDoc._id.toString();
                const userRef = firestoreDb.collection(coleccionOrigen).doc(targetUid);
                const docSnap = await userRef.get();
                if (docSnap.exists) {
                    const firestoreUpdate = { saldo: saldoNuevo };
                    if (nuevoEstadoOperativo) {
                        firestoreUpdate.estadoOperativo = nuevoEstadoOperativo;
                    }
                    await userRef.update(firestoreUpdate);
                }
            }
        } catch (fsError) {
            console.warn("⚠️ [AUDITORIA-FIRESTORE-WARNING]: No se pudo registrar la auditoría secundaria en Firestore:", fsError?.message);
        }

        return res.status(200).json({
            success: true,
            message: `Operación de ${tipoOperacion.toUpperCase()} ejecutada con éxito.`,
            data: {
                transaccionId: transaccionId.toString(),
                usuarioId: targetDoc.uid || targetDoc._id.toString(),
                saldoAnterior,
                saldoNuevo,
                monto: montoNumerico,
                estadoOperativo: nuevoEstadoOperativo,
                moneda: 'COP'
            }
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        await session.endSession();
        console.error("🚨 [GESTIONAR-SALDO-MANUAL-ERROR]:", error);
        return res.status(500).json({
            success: false,
            error: error?.message || "Error interno del servidor al procesar el ajuste de saldo manual."
        });
    }
};