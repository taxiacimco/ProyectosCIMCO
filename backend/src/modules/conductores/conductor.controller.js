// Versión Arquitectura: V4.3 - Motor Polimórfico Estricto y Telemetría Híbrida Consolidada
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\conductores\conductor.controller.js
 * Misión: Gestión de conductores, telemetría de estado, búsquedas radiales geoespaciales, recargas matemáticas exactas, 
 * y procesamiento de ráfagas de coordenadas con duplicación síncrona hacia Firebase Firestore.
 * Ajuste: Importación unificada del SDK para evitar el Error 500 por desconexión de FIRESTORE_PATHS.
 */

import mongoose from 'mongoose';
import Conductor from '../../models/Conductor.js';
import HistorialSaldo from '../../models/HistorialSaldo.js';

// 🚀 GOBERNANZA DE TIEMPO REAL: Importación Unificada del SDK Administrativo
import { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js'; 

// 📡 FUNCIÓN DE TELEMETRÍA: Obtener conductores activos
export const obtenerConductoresDisponibles = async (req, res) => {
    try {
        // 🛡️ GUARDA DE SEGURIDAD (Anti-Undefined)
        const disponibles = await Conductor.find({ estado: 'active' }).lean();
        
        if (!disponibles) {
            return res.status(404).json({ success: false, message: "No se encontraron conductores activos." });
        }

        res.status(200).json({ 
            success: true, 
            count: disponibles.length, 
            data: disponibles 
        });
    } catch (error) {
        console.error('❌ Error en telemetría de conductores:', error);
        res.status(500).json({ success: false, message: "Error en telemetría de conductores", error: error.message });
    }
};

export const registrarConductor = async (req, res) => {
    try {
        const { nombre, email, coordenadas, saldo, conductorId } = req.body;

        // 🛡️ GUARDA ANTI-UNDEFINED
        if (!nombre || !email) {
            return res.status(400).json({ success: false, message: 'Nombre y email son obligatorios.' });
        }

        const emailLimpio = email.trim().toLowerCase();
        const existeConductor = await Conductor.findOne({ email: emailLimpio });
        if (existeConductor) {
            return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado.' });
        }

        const nuevoConductor = new Conductor({
            conductorId: conductorId || `DRV-${Math.floor(Math.random() * 10000)}`,
            nombre: nombre.trim(),
            email: emailLimpio,
            coordenadas: coordenadas || { type: 'Point', coordinates: [-73.33, 9.55] },
            saldo: typeof saldo === 'number' && saldo >= 0 ? saldo : 0,
            estado: 'active'
        });

        await nuevoConductor.save();
        res.status(201).json({ success: true, data: nuevoConductor });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno de servidor', error: error.message });
    }
};

export const obtenerConductores = async (req, res) => {
    try {
        const lista = await Conductor.find({});
        res.status(200).json({ success: true, data: lista });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener conductores' });
    }
};

export const obtenerHistorialConductor = async (req, res) => {
    try {
        const { conductorId } = req.params;
        const historial = await HistorialSaldo.find({ conductorId });
        res.status(200).json({ success: true, data: historial });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener historial' });
    }
};

// ==================================================================
// 💰 BILLETERA MANUAL Y RECARGAS DE ADMINISTRACIÓN (Fusión Atómica)
// ==================================================================
/**
 * 💰 ENDPOINT MAESTRO: Recarga Manual de Saldos (CEO / Secretaría Auxiliar)
 * Operación Atómica $inc para blindaje contable ante hilos concurrentes.
 */
export const recargarBilleteraPorAdmin = async (req, res) => {
    try {
        const { conductorId, monto, operador } = req.body;

        // 🛡️ GUARDA ANTI-UNDEFINED & VALIDACIÓN DE PAYLOAD
        if (!conductorId || !monto) {
            return res.status(400).json({ success: false, message: "⚠️ [CIMCO-ERROR] Faltan parámetros obligatorios (conductorId, monto)." });
        }

        const montoNumerico = Number(monto);
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            return res.status(400).json({ success: false, message: "⚠️ El monto de recarga debe ser superior a $0 COP." });
        }

        // 🧠 MOTOR DE BÚSQUEDA POLIMÓRFICA ESTRICTA
        const paramBusqueda = String(conductorId).trim();
        let queryTarget;

        if (paramBusqueda.includes('@')) {
            // Caso 1: Correo Electrónico
            queryTarget = { email: paramBusqueda.toLowerCase() };
        } else if (/^\d{10}$/.test(paramBusqueda)) {
            // Caso 2: Número de celular (10 dígitos exactos)
            queryTarget = { telefono: paramBusqueda };
        } else if (mongoose.Types.ObjectId.isValid(paramBusqueda)) {
            // Caso 3: ID de MongoDB
            queryTarget = { _id: paramBusqueda };
        } else {
            // Caso 4: Custom ID Legacy (Ej: DRV-1234)
            queryTarget = { conductorId: paramBusqueda };
        }

        // Búsqueda inicial estricta para resolver la identidad del operador
        const conductorPrevio = await Conductor.findOne(queryTarget).lean();
        
        if (!conductorPrevio) {
            return res.status(404).json({ success: false, message: `❌ Operador no localizado mediante el identificador provisto: ${paramBusqueda}` });
        }

        const saldoAnterior = conductorPrevio.saldo || 0;

        // ⚡ MODIFICACIÓN MATEMÁTICA ATÓMICA DIRECTA (Anclado al _id exacto resuelto)
        const conductorActualizado = await Conductor.findOneAndUpdate(
            { _id: conductorPrevio._id },
            { $inc: { saldo: montoNumerico } },
            { new: true, runValidators: true }
        );

        // Inyección en la bitácora contable de auditoría
        const registroContable = new HistorialSaldo({
            conductorId: conductorActualizado._id,
            tipo: 'recarga_manual',
            monto: montoNumerico,
            saldoAnterior: saldoAnterior,
            saldoNuevo: conductorActualizado.saldo,
            procesadoPor: operador || 'ADMIN_AUXILIAR_CIMCO',
            descripcion: `Recarga manual en efectivo aprobada en consola por: ${operador || 'CEO/Secretaría'}.`
        });
        await registroContable.save();

        console.log(`💰 [CIMCO-TESORERÍA] CEO/Secretaría inyectó +$${montoNumerico} al Operador: ${conductorActualizado.nombre}. Saldo Actual: $${conductorActualizado.saldo}`);

        return res.status(200).json({
            success: true,
            message: "Recarga procesada de forma atómica.",
            saldo: conductorActualizado.saldo,
            data: {
                conductor: conductorActualizado.nombre,
                saldoAnterior: saldoAnterior,
                saldoNuevo: conductorActualizado.saldo
            }
        });

    } catch (error) {
        console.error("❌ Error en inyección de saldo:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 📍 EXTENSIÓN GEOLOCALIZADA: MOTOR DEL RADAR RADIAL Y ACTUALIZACIÓN GPS
// ==================================================================
export const obtenerConductoresCercanos = async (req, res) => {
    try {
        const { lat, lng, radioMaxKm } = req.query;

        // 🛡️ GUARDA DE SEGURIDAD INTERNA
        if (!lat || !lng) {
            return res.status(400).json({
                ok: false,
                error: "PARAMS_MISSING",
                message: "La latitud (lat) y longitud (lng) son requeridas para calibrar el radar."
            });
        }

        const latitud = parseFloat(lat);
        const longitud = parseFloat(lng);
        const radioMetros = (parseFloat(radioMaxKm) || 5) * 1000; 

        console.log(`📡 [CIMCO-RADAR] Ejecutando escaneo radial desde: [Lat: ${latitud}, Lng: ${longitud}] | Radio: ${radioMetros}mts`);

        const conductoresCercanos = await Conductor.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [longitud, latitud]
                    },
                    distanceField: "distanciaMetros",
                    maxDistance: radioMetros,
                    query: { estado: "active" },
                    spherical: true
                }
            },
            {
                $project: {
                    _id: 1,
                    nombre: 1,
                    email: 1,
                    telefono: 1,
                    estado: 1,
                    coordenadas: 1,
                    distanciaKm: { $divide: ["$distanciaMetros", 1000] } 
                }
            }
        ]);

        return res.status(200).json({
            ok: true,
            contador: conductoresCercanos.length,
            datos: conductoresCercanos
        });

    } catch (error) {
        console.error("❌ [CIMCO-RADAR ERR] Falla crítica en el hilo de agregación espacial:", error.message);
        return res.status(500).json({
            ok: false,
            error: "RADAR_CORE_FAILURE",
            message: "Error interno en el motor de agregación geoespacial."
        });
    }
};

export const actualizarUbicacionGPS = async (req, res) => {
    try {
        const { conductorId, latitud, longitud, estado } = req.body;

        if (!conductorId || latitud === undefined || longitud === undefined || !estado) {
            return res.status(400).json({ success: false, message: "⚠️ [CIMCO-TELEMETRÍA] Telemetría corrupta. Payload incompleto." });
        }

        const parsedLat = parseFloat(latitud);
        const parsedLng = parseFloat(longitud);
        const estadoLcase = String(estado).toLowerCase().trim();

        if (isNaN(parsedLat) || isNaN(parsedLng)) {
            return res.status(400).json({ success: false, message: "⚠️ [CIMCO-TELEMETRÍA] Coordenadas no numéricas detectadas." });
        }

        const nuevasCoordenadas = {
            type: 'Point',
            coordinates: [parsedLng, parsedLat]
        };

        const conductorActualizado = await Conductor.findByIdAndUpdate(
            conductorId,
            { 
                $set: { 
                    coordenadas: nuevasCoordenadas,
                    estado: estadoLcase
                } 
            },
            { new: true, select: '_id nombre estado' }
        ).lean();

        if (!conductorActualizado) {
            return res.status(404).json({ success: false, message: "❌ Unidad de transporte no registrada en la base central MDB." });
        }

        if (dbFirestore && FIRESTORE_PATHS && FIRESTORE_PATHS.conductores) {
            const firestoreDocRef = dbFirestore.collection(FIRESTORE_PATHS.conductores).doc(conductorId);
            
            await firestoreDocRef.set({
                id: conductorId,
                nombre: conductorActualizado.nombre,
                estado: estadoLcase,
                coordenadas: {
                    latitude: parsedLat,
                    longitude: parsedLng
                },
                updatedAt: new Date().toISOString()
            }, { merge: true }); 
        } else {
            console.warn("⚠️ [CIMCO-FIREBASE-WARN] El puente Firestore no está inicializado o FIRESTORE_PATHS está ausente.");
        }

        return res.status(200).json({
            success: true,
            message: "📡 Telemetría GPS inyectada correctamente en la base central y sincronizada con Firestore en tiempo real.",
            estadoActual: conductorActualizado.estado
        });

    } catch (error) {
        console.error('❌ [CIMCO-GPS-ERR] Error en ráfaga de posicionamiento híbrido:', error.message);
        return res.status(500).json({ success: false, message: "Falla crítica en el canal de telemetría híbrido.", error: error.message });
    }
};