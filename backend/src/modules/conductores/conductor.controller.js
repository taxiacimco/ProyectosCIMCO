// Versión Arquitectura: V12.6 - Inyección Transaccional Concurrente en Descuento de Comisión
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\conductores\conductor.controller.js
 * Misión: Gestión unificada de operarios, telemetría GPS reactiva, inyección contable y motor de radar radial.
 * Ajuste V12.6: Erradicación del anti-patrón de lectura en memoria en `descontarComisionViaje`.
 * Se delega la validación y la matemática concurrente directamente a MongoDB Atlas mediante `findOneAndUpdate` 
 * con protección de balance e inyección atómica en una única operación transaccional ACID.
 */

import mongoose from 'mongoose';
import Conductor from '../../models/Conductor.js';
import HistorialSaldo from '../../models/HistorialSaldo.js';
import { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js'; 
import { FieldValue } from 'firebase-admin/firestore'; 

// ==================================================================
// 1. CONSULTAS LOGÍSTICAS BÁSICAS Y COMPATIBILIDAD DE ENRUTAMIENTO
// ==================================================================

export const registrarConductor = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Payload de registro ausente." });
        }
        const nuevoConductor = new Conductor(req.body);
        await nuevoConductor.save();
        return res.status(201).json({ success: true, data: nuevoConductor });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerConductores = async (req, res) => {
    try {
        const conductores = await Conductor.find();
        return res.status(200).json({ success: true, data: conductores });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerConductorPorId = async (req, res) => {
    try {
        if (!req || !req.params || !req.params.id) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de conductor ausente en los parámetros." });
        }
        const conductor = await Conductor.findById(req.params.id);
        if (!conductor) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }
        return res.status(200).json({ success: true, data: conductor });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const actualizarConductor = async (req, res) => {
    try {
        if (!req || !req.params || !req.params.id || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Datos o identificador ausentes para la actualización." });
        }
        const conductorActualizado = await Conductor.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!conductorActualizado) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }
        return res.status(200).json({ success: true, data: conductorActualizado });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const eliminarConductor = async (req, res) => {
    try {
        if (!req || !req.params || !req.params.id) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de conductor ausente para la eliminación." });
        }
        const conductorEliminado = await Conductor.findByIdAndDelete(req.params.id);
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
        const conductoresDisponibles = await Conductor.find({ estado: 'active' });
        return res.status(200).json({
            success: true,
            contador: conductoresDisponibles.length,
            data: conductoresDisponibles
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 2. BILLETERA ATÓMICA CIMCO (RECARGAS Y CONTABILIDAD DE SALDOS)
// ==================================================================

export const recargarSaldoAdmin = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        if (!req || !req.body) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "⚠️ Payload contable ausente." });
        }
        const { conductorId, monto, referencia, nota } = req.body;
        const montoNum = parseFloat(monto);

        if (!conductorId || isNaN(montoNum) || montoNum <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Datos de recarga inválidos." });
        }

        const conductor = await Conductor.findById(conductorId).session(session);
        if (!conductor) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Conductor no localizado." });
        }

        const saldoAnterior = conductor.saldo || 0;
        const nuevoSaldo = saldoAnterior + montoNum;
        conductor.saldo = nuevoSaldo;
        await conductor.save({ session });

        const nuevoHistorial = new HistorialSaldo({
            conductor: conductorId,
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

        return res.status(200).json({
            success: true,
            message: `Recarga exitosa. Nuevo saldo: $${nuevoSaldo} COP`,
            data: { nuevoSaldo }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * ALIAS DE ADAPTACIÓN CONTABLE (recargarBilleteraPorAdmin):
 * Resuelve directamente el SyntaxError mapeando la petición del router hacia la lógica atómica core.
 */
export const recargarBilleteraPorAdmin = recargarSaldoAdmin;

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

        // 🛡️ Delegar la matemática y la validación concurrente a MongoDB Atlas directamente para evitar condiciones de carrera
        const conductor = await Conductor.findOneAndUpdate(
            { _id: conductorId, saldo: { $gte: comisionNum } },
            { $inc: { saldo: -comisionNum, balance: -comisionNum } },
            { new: false, session } // Capturamos saldoAnterior pre-mutación de manera atómica
        );

        if (!conductor) {
            throw new Error("Conductor no localizado o saldo en billetera insuficiente ($0) para esta operación simultánea.");
        }

        const saldoAnterior = conductor.saldo || 0;
        const nuevoSaldo = saldoAnterior - comisionNum;

        const historialDescuento = new HistorialSaldo({
            conductor: conductorId,
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

        return res.status(200).json({ 
            success: true, 
            message: "Comisión debitada correctamente.", 
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
        const conductorId = req.params.conductorId || req.params.id;
        if (!conductorId) {
            return res.status(400).json({ success: false, message: "⚠️ Parámetro conductorId requerido en la ruta." });
        }
        const historial = await HistorialSaldo.find({ conductor: conductorId }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: historial });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * ADAPTADOR DE TRAZABILIDAD INTEGRAL:
 * Mapea 'obtenerHistorialConductor' de manera directa sobre el modelo de saldos indexados.
 * Ajuste V11.10: Soporte híbrido para destructuración robusta de params sin importar si se inyecta como :id o :conductorId
 */
export const obtenerHistorialConductor = async (req, res) => {
    try {
        if (!req || !req.params) {
            return res.status(400).json({ success: false, message: "⚠️ Parámetros de ruta ausentes." });
        }
        const targetId = req.params.conductorId || req.params.id;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Parámetro identificador de conductor requerido." });
        }
        const historial = await HistorialSaldo.find({ conductor: targetId }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: historial });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 3. CONTROL DE ESTADO OPERATIVO Y RADAR DE PROXIMIDAD
// ==================================================================

/**
 * ACTUALIZACIÓN DE ESTADO OPERATIVO HÍBRIDO
 * Ajuste V11.10: Extracción segura de datos para acomodar el endpoint PUT /estado sin parámetros de ruta directos si vienen en el body
 */
export const actualizarEstadoConductor = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Datos de solicitud ausentes para actualizar el estado operativo." });
        }
        
        const id = req.params.id || req.body.conductorId || req.body.id;
        const { estado } = req.body; 

        if (!id) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador del conductor ausente en la petición." });
        }

        if (!['active', 'inactive', 'suspended', 'busy', 'offline'].includes(estado)) {
            return res.status(400).json({ success: false, message: "⚠️ Estado operativo inválido." });
        }

        const conductor = await Conductor.findByIdAndUpdate(id, { estado }, { new: true });
        if (!conductor) {
            return res.status(404).json({ success: false, message: "Conductor no localizado en base de datos Atlas." });
        }

        const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
        await dbFirestore.collection(coleccionConductores).doc(id).set({
            estado,
            ultimaActualizacion: FieldValue.serverTimestamp()
        }, { merge: true });

        return res.status(200).json({ success: true, message: `Estado actualizado a ${estado}`, data: conductor });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * MOTOR DE RADAR GEOGRÁFICO: Localiza las unidades activas más cercanas al pasajero.
 * Consume coordenadas Query Parameters (?lat=...&lng=...&radio=...) para realizar la agregación 2dsphere.
 */
export const obtenerConductoresCercanos = async (req, res) => {
    try {
        if (!req || !req.query || !req.query.lat || !req.query.lng) {
            return res.status(400).json({ success: false, message: "⚠️ Coordenadas de origen de búsqueda (lat, lng) ausentes." });
        }

        const latitud = parseFloat(req.query.lat);
        const longitud = parseFloat(req.query.lng);
        const radioMetros = parseFloat(req.query.radio) || 5000; 

        if (isNaN(latitud) || isNaN(longitud)) {
            return res.status(400).json({ success: false, message: "⚠️ Formato de coordenadas geográficas inválido." });
        }

        const conductoresCercanos = await Conductor.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [longitud, latitud] },
                    distanceField: "distanciaMetros",
                    maxDistance: radioMetros,
                    query: { estado: "active" }, 
                    spherical: true
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

        await Conductor.findByIdAndUpdate(
            conductorId,
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

        const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
        await dbFirestore.collection(coleccionConductores).doc(conductorId).set({
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

/**
 * RECEPCIÓN EN CALIENTE DE TELEMETRÍA SATEUTAL
 * Ajuste V11.10: Soporte robusto para POST masivo donde el id del conductor puede ser enviado vía req.body.conductorId
 */
export const actualizarUbicacionGPS = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: "⚠️ Payload de telemetría HTTP ausente." });
        }
        
        const id = req.params.id || req.body.conductorId || req.body.id;
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