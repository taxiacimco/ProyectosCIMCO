// Versión Arquitectura: V16.6 - Agregación Atómica de Capital Circulante en MongoDB Atlas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\conductores\conductor.controller.js
 * Misión: Gestión unificada de operarios, telemetría GPS reactiva, inyección contable, motor de radar radial y cálculo atómico de capital circulante.
 * Ajuste V16.6: Integración de la función obtenerCapitalCirculante utilizando la pipeline de agregación $group.
 */

import mongoose from 'mongoose';
import Conductor from '../../models/Conductor.js';
import HistorialSaldo from '../../models/HistorialSaldo.js';
import { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js'; 
import { FieldValue } from 'firebase-admin/firestore'; 

// ==================================================================
// 🛡️ GUARDAS DE ARQUITECTURA AVANZADAS Y SANITIZACIÓN (ANTI-FRAUDE)
// ==================================================================

/**
 * 🛡️ Helper de sanitización: Garantiza que cualquier valor de saldo/saldoWallet
 * se unifique en la propiedad 'saldo' y elimina claves duplicadas.
 */
export const sanitizarPayloadConductor = (data) => {
    if (!data || typeof data !== 'object') return {};
    const payload = { ...data };
    
    // Si viene saldoWallet o saldo, se consolida strictly en saldo
    if (payload.saldoWallet !== undefined || payload.saldo !== undefined) {
        const monto = Number(payload.saldo ?? payload.saldoWallet ?? 0);
        payload.saldo = isNaN(monto) || monto < 0 ? 0 : monto;
        delete payload.saldoWallet; // Eliminación activa de la clave obsoleta
    }
    
    return payload;
};

/**
 * Detiene inmediatamente la ejecución si se intenta procesar una recarga artificial 
 * a través de endpoints de depuración dentro de un entorno de producción real.
 */
export const verificarBypassDesarrollo = (req, res, next) => {
    const ENTORNO_ACTUAL = process.env.NODE_ENV || 'development';
    if (ENTORNO_ACTUAL === 'production') {
        console.error("⚠️ [ALERTA DE ARQUITECTURA] Intento de evasión de saldos detectado y neutralizado en producción.");
        return res.status(403).json({
            success: false,
            message: "⚠️ ALERTA DE ARQUITECTURA: Las recargas de stress-test están ESTRICTAMENTE PROHIBIDAS en el clúster de producción."
        });
    }
    next();
};

// ==================================================================
// 1. CONSULTAS LOGÍSTICAS BÁSICAS Y COMPATIBILIDAD DE ENRUTAMIENTO
// ==================================================================

export const registrarConductor = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Payload de registro ausente." });
        }
        
        const payloadSanitizado = sanitizarPayloadConductor(req.body);
        const nuevoConductor = new Conductor(payloadSanitizado);
        await nuevoConductor.save();

        // Espejo inicial en Firestore
        try {
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
            const docFirestoreId = nuevoConductor.uid || nuevoConductor._id.toString();

            await dbFirestore.collection(coleccionConductores).doc(docFirestoreId).set({
                uid: docFirestoreId,
                nombre: nuevoConductor.nombre,
                email: nuevoConductor.email,
                telefono: nuevoConductor.telefonoMovil,
                estado: nuevoConductor.estado || 'inactive',
                isActive: nuevoConductor.isActive ?? true,
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
            console.warn("⚠️ [CIMCO-CONDUCTOR-SYNC-WARN] Error inicializando Firestore:", fsErr.message);
        }
        
        return res.status(201).json({ success: true, data: nuevoConductor });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerConductores = async (req, res) => {
    try {
        const conductores = await Conductor.find().lean();
        
        // Limpieza preventiva de campos obsoletos en lecturas masivas
        const conductoresSanitizados = conductores.map(c => {
            delete c.saldoWallet;
            return c;
        });

        return res.status(200).json({ success: true, data: conductoresSanitizados });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerConductorPorId = async (req, res) => {
    try {
        if (!req || !req.params || (!req.params.id && !req.params.uid && !req.params.conductorId)) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de conductor ausente en los parámetros." });
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
            return res.status(400).json({ success: false, message: "⚠️ Datos ausentes para la actualización." });
        }
        
        const targetId = req.params.id || req.params.uid || req.params.conductorId || req.body.conductorId || req.body.id;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de conductor ausente para la actualización." });
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
                $unset: { saldoWallet: "" } // $unset forzado para purgar la clave de MongoDB Atlas
            },
            { new: true, runValidators: true }
        ).lean();

        if (!conductorActualizado) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }

        delete conductorActualizado.saldoWallet;

        // Sincronizar actualización en Firestore
        try {
            const docFirestoreId = conductorActualizado.uid || conductorActualizado._id.toString();
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
            
            const firestoreUpdate = {};
            if (conductorActualizado.nombre) firestoreUpdate.nombre = conductorActualizado.nombre;
            if (conductorActualizado.telefonoMovil) firestoreUpdate.telefono = conductorActualizado.telefonoMovil;
            if (conductorActualizado.estado) firestoreUpdate.estado = conductorActualizado.estado;

            await dbFirestore.collection(coleccionConductores).doc(docFirestoreId).set(firestoreUpdate, { merge: true });
        } catch (fsError) {
            console.warn("⚠️ [CIMCO-CONDUCTOR-UPDATE-WARN] Falló la réplica a Firestore:", fsError.message);
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
        const targetId = req.params.id || req.params.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de conductor ausente para la eliminación." });
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

        return res.status(200).json({ success: true, message: 'Conductor eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * ADAPTADOR DE COMPATIBILIDAD FLOTA DISPONIBLE:
 * Retorna de forma directa todos los conductores en estado operativo activo ('active').
 */
export const obtenerConductoresDisponibles = async (req, res) => {
    try {
        const conductoresDisponibles = await Conductor.find({ 
            $or: [{ estado: 'active' }, { estado: 'disponible' }]
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

/**
 * 🧮 OBTENER CAPITAL CIRCULANTE CONSOLIDADO
 * Realiza una agregación $group directamente en MongoDB Atlas
 * para calcular la sumatoria total de saldos sin transferir documentos.
 */
export const obtenerCapitalCirculante = async (req, res) => {
    try {
        const resultado = await Conductor.aggregate([
            {
                $group: {
                    _id: null,
                    totalCapital: { $sum: "$saldo" }
                }
            }
        ]);

        const capitalTotal = resultado.length > 0 ? resultado[0].totalCapital : 0;

        return res.status(200).json({
            success: true,
            totalCapital: capitalTotal
        });
    } catch (error) {
        console.error("❌ Error calculando capital circulante:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error interno calculando el capital circulante." 
        });
    }
};

// ==================================================================
// 2. BILLETERA ATÓMICA CIMCO (RECARGAS, AJUSTES Y CONTABILIDAD DE SALDOS)
// ==================================================================

export const recargarSaldoAdmin = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        if (!req || !req.body) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "⚠️ Payload contable ausente." });
        }
        const { conductorId, id, uid, monto, referencia, nota } = req.body;
        const targetId = conductorId || id || uid;
        const montoNum = parseFloat(monto);

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

        const conductor = await Conductor.findOne(query).session(session);
        if (!conductor) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Conductor no localizado." });
        }

        const saldoAnterior = Number(conductor.saldo || 0);
        const nuevoSaldo = saldoAnterior + montoNum;
        
        conductor.saldo = nuevoSaldo;
        if (conductor._doc && conductor._doc.saldoWallet !== undefined) {
            delete conductor._doc.saldoWallet;
        }
        await conductor.save({ session });

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

        // Réplica defensiva hacia la colección de billeteras en Firestore
        try {
            const docFirestoreId = conductor.uid || conductor._id.toString();
            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
            await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
                id: docFirestoreId,
                nombreUsuario: conductor.nombre,
                saldo: nuevoSaldo,
                balance: nuevoSaldo,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsWalletErr) {
            console.warn("⚠️ [CIMCO-WALLET-SYNC-WARN] Falló réplica de recarga a Firestore:", fsWalletErr.message);
        }

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

/**
 * ALIAS DE ADAPTACIÓN CONTABLE (recargarBilleteraPorAdmin)
 */
export const recargarBilleteraPorAdmin = recargarSaldoAdmin;

export const ajustarSaldo = async (req, res) => {
    try {
        const targetId = req.params.uid || req.params.id || req.body.conductorId;
        const { monto, operacion } = req.body; // operacion: 'recarga' | 'descuento'

        const montoNum = Number(monto);
        if (!targetId || isNaN(montoNum) || montoNum <= 0) {
            return res.status(400).json({ success: false, message: "⚠️ Parámetros de ajuste de saldo inválidos." });
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
            { new: true, runValidators: true }
        );

        if (!conductor) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }

        // Espejo en Firestore
        try {
            const docFirestoreId = conductor.uid || conductor._id.toString();
            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
            await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
                saldo: conductor.saldo,
                balance: conductor.saldo,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ Error replicando ajuste de saldo a Firestore:", fsErr.message);
        }

        return res.status(200).json({
            success: true,
            nuevoSaldo: conductor.saldo,
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
            throw new Error("⚠️ Payload contable de débito ausente.");
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
            throw new Error("Conductor no localizado o saldo en billetera insuficiente para esta operación.");
        }

        const saldoAnterior = Number(conductor.saldo || 0);
        const nuevoSaldo = saldoAnterior - comisionNum;

        const historialDescuento = new HistorialSaldo({
            conductor: conductor._id,
            tipo: 'debito',
            monto: comisionNum,
            saldoAnterior,
            saldoNuevo: nuevoSaldo,
            referencia: viajeId ? `VIAJE-${viajeId}` : `DEB-${Date.now()}`,
            descripcion: `Comisión por servicio de viaje ${viajeId || ''}`
        });
        await historialDescuento.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Réplica defensiva hacia Firestore
        try {
            const docFirestoreId = conductor.uid || conductor._id.toString();
            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
            await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
                saldo: nuevoSaldo,
                balance: nuevoSaldo,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ Error replicando descuento en Firestore:", fsErr.message);
        }

        return res.status(200).json({ 
            success: true, 
            message: "Comisión debitada correctamente.", 
            nuevoSaldo,
            data: { nuevoSaldo } 
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(error.message.includes('insuficiente') ? 402 : 500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

export const obtenerHistorialSaldos = async (req, res) => {
    try {
        if (!req || !req.params) {
            return res.status(400).json({ success: false, message: "⚠️ Parámetros de solicitud ausentes." });
        }
        const targetId = req.params.conductorId || req.params.id || req.params.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Parámetro conductorId requerido en la ruta." });
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

/**
 * ADAPTADOR DE TRAZABILIDAD INTEGRAL
 */
export const obtenerHistorialConductor = obtenerHistorialSaldos;

// ==================================================================
// 3. CONTROL DE ESTADO OPERATIVO Y RADAR DE PROXIMIDAD
// ==================================================================

export const actualizarEstadoConductor = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Datos de solicitud ausentes para actualizar el estado operativo." });
        }
        
        const id = req.params.id || req.params.uid || req.body.conductorId || req.body.id;
        const { estado } = req.body; 

        if (!id) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador del conductor ausente en la petición." });
        }

        if (!['active', 'inactive', 'suspended', 'busy', 'offline', 'disponible', 'ocupado'].includes(estado)) {
            return res.status(400).json({ success: false, message: "⚠️ Estado operativo inválido." });
        }

        const conductor = await Conductor.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
                    { uid: id },
                    { conductorId: id }
                ]
            },
            { $set: { estado } },
            { new: true }
        );

        if (!conductor) {
            return res.status(404).json({ success: false, message: "Conductor no localizado en base de datos Atlas." });
        }

        const docFirestoreId = conductor.uid || conductor._id.toString();
        const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
        await dbFirestore.collection(coleccionConductores).doc(docFirestoreId).set({
            estado,
            ultimaActualizacion: FieldValue.serverTimestamp()
        }, { merge: true });

        return res.status(200).json({ success: true, message: `Estado actualizado a ${estado}`, data: conductor });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerConductoresCercanos = async (req, res) => {
    try {
        if (!req || !req.query || !req.query.lat || !req.query.lng) {
            return res.status(400).json({ success: false, message: "⚠️ Coordenadas de origen de búsqueda (lat, lng) ausentes." });
        }

        const latitud = parseFloat(req.query.lat);
        const longitud = parseFloat(req.query.lng);
        // Soporte para radio recibido en metros o kilómetros
        const radioParam = req.query.radio || req.query.radioMaxKm;
        let radioMetros = parseFloat(radioParam) || 5000;
        if (radioParam && parseFloat(radioParam) < 100) {
            radioMetros = parseFloat(radioParam) * 1000; // Si venía en KM (ej: 5km -> 5000m)
        }

        if (isNaN(latitud) || isNaN(longitud)) {
            return res.status(400).json({ success: false, message: "⚠️ Formato de coordenadas geográficas inválido." });
        }

        const conductoresCercanos = await Conductor.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [longitud, latitud] },
                    distanceField: "distanciaMetros",
                    maxDistance: radioMetros,
                    query: { estado: { $in: ["active", "disponible"] } }, 
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
            console.error("❌ [RADAR-DB-ERROR] Telemetría incompleta o valores indefinidos recibidos.");
            return false;
        }
        const longNum = parseFloat(lng);
        const latNum = parseFloat(lat);

        if (isNaN(longNum) || isNaN(latNum)) {
            console.error(`❌ [RADAR-DB-ERROR] Valores numéricos inválidos para Conductor [${conductorId}]: lng=${lng}, lat=${lat}`);
            return false;
        }

        const conductor = await Conductor.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(conductorId) ? conductorId : null },
                    { uid: conductorId },
                    { conductorId: conductorId }
                ]
            },
            {
                $set: {
                    'coordenadas.type': 'Point',
                    'coordenadas.coordinates': [longNum, latNum],
                    'ubicacion.type': 'Point',
                    'ubicacion.coordinates': [longNum, latNum],
                    estado: 'active' 
                }
            },
            { new: true, upsert: false }
        );

        if (!conductor) return false;

        const docFirestoreId = conductor.uid || conductor._id.toString();
        const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
        await dbFirestore.collection(coleccionConductores).doc(docFirestoreId).set({
            coordenadas: {
                latitude: latNum,
                longitude: longNum
            },
            estado: 'active',
            ultimaActualizacion: FieldValue.serverTimestamp()
        }, { merge: true });

        return true;
    } catch (error) {
        console.error(`❌ [RADAR-DB-ERROR] Error crítico de persistencia en Atlas/Firestore:`, error.message);
        return false;
    }
};

export const actualizarUbicacionGPS = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Payload de telemetría HTTP ausente." });
        }
        
        const id = req.params.id || req.params.uid || req.body.conductorId || req.body.id;
        const { lat, lng } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de unidad ausente para inyección GPS." });
        }

        const exito = await actualizarRadarUbicacion(id, lat, lng);
        if (!exito) {
            return res.status(500).json({ success: false, message: "Error interno procesando las coordenadas geográficas." });
        }

        return res.status(200).json({ success: true, message: "Telemetría satelital sincronizada correctamente." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};