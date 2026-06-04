// Versión Arquitectura: V3.1 - Consolidación Atómica de Recargas Administrativas y Telemetría GPS
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\conductores\conductor.controller.js
 * Misión: Gestión de conductores, telemetría de estado, búsquedas radiales geoespaciales, recargas matemáticas exactas y procesar ráfagas de coordenadas de la malla vial.
 */

import mongoose from 'mongoose';
import Conductor from '../../models/Conductor.js';
import HistorialSaldo from '../../models/HistorialSaldo.js';

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

        // Obtener el estado previo del saldo para la traza del historial usando conductorId (String) o _id (ObjectId)
        const queryTarget = mongoose.Types.ObjectId.isValid(conductorId) 
            ? { _id: conductorId } 
            : { conductorId: conductorId };

        const conductorPrevio = await Conductor.findOne(queryTarget).lean();
        
        if (!conductorPrevio) {
            return res.status(404).json({ success: false, message: "❌ Conductor no localizado en el clúster." });
        }

        const saldoAnterior = conductorPrevio.saldo || 0;

        // ⚡ MODIFICACIÓN MATEMÁTICA ATÓMICA DIRECTA: Previene condiciones de carrera
        const conductorActualizado = await Conductor.findOneAndUpdate(
            queryTarget,
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

        console.log(`💰 [CIMCO-TESORERÍA] CEO/Secretaría inyectó +$${montoNumerico} al ID: ${conductorId}. Saldo Actual: $${conductorActualizado.saldo}`);

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
/**
 * Misión: Consultar conductores activos dentro de un radio geográfico en La Jagua de Ibirico.
 * Operador Atómico: MongoDB $geoNear (Requiere índice 2dsphere activo en el campo 'coordenadas').
 */
export const obtenerConductoresCercanos = async (req, res) => {
    try {
        const { lat, lng, radioMaxKm } = req.query;

        // 🛡️ GUARDA DE SEGURIDAD INTERNA: Validar presencia de parámetros de telemetría GPS
        if (!lat || !lng) {
            return res.status(400).json({
                ok: false,
                error: "PARAMS_MISSING",
                message: "La latitud (lat) y longitud (lng) son requeridas para calibrar el radar."
            });
        }

        // Conversión estricta de tipos de datos y asignación de radio por defecto (5 Km si no se especifica)
        const latitud = parseFloat(lat);
        const longitud = parseFloat(lng);
        const radioMetros = (parseFloat(radioMaxKm) || 5) * 1000; 

        console.log(`📡 [CIMCO-RADAR] Ejecutando escaneo radial desde: [Lat: ${latitud}, Lng: ${longitud}] | Radio: ${radioMetros}mts`);

        // 🚀 PIPELINE DE AGREGACIÓN GEOESPACIAL ATÓMICA
        const conductoresCercanos = await Conductor.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        // ⚠️ REGLA GEOJSON OBLIGATORIA: El orden siempre es [Longitud, Latitud]
                        coordinates: [longitud, latitud]
                    },
                    distanceField: "distanciaMetros", // Inyecta dinámicamente la distancia calculada en cada documento
                    maxDistance: radioMetros,
                    query: { estado: "active" }, // Filtrado indexado: Solo conductores listos para recibir ofertas
                    spherical: true
                }
            },
            {
                // Limitamos la proyección para optimizar el ancho de banda del satélite de datos
                $project: {
                    _id: 1,
                    nombre: 1,
                    email: 1,
                    telefono: 1,
                    estado: 1,
                    coordenadas: 1,
                    distanciaKm: { $divide: ["$distanciaMetros", 1000] } // Transforma metros a kilómetros para el frontend
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

/**
 * 📡 ENDPOINT: Actualización de Ubicación GPS a Alta Velocidad (Ráfaga de Telemetría)
 * Optimizado para minimizar ciclos de CPU de computadoras locales.
 */
export const actualizarUbicacionGPS = async (req, res) => {
    try {
        const { conductorId, latitud, longitud, estado } = req.body;

        // 🛡️ GUARDA ANTI-UNDEFINED PERIMETRAL
        if (!conductorId || latitud === undefined || longitud === undefined || !estado) {
            return res.status(400).json({ success: false, message: "⚠️ [CIMCO-TELEMETRÍA] Telemetría corrupta. Payload incompleto." });
        }

        const parsedLat = parseFloat(latitud);
        const parsedLng = parseFloat(longitud);
        const estadoLcase = String(estado).toLowerCase().trim();

        if (isNaN(parsedLat) || isNaN(parsedLng)) {
            return res.status(400).json({ success: false, message: "⚠️ [CIMCO-TELEMETRÍA] Coordenadas no numéricas detectadas." });
        }

        // Mapeo rápido al formato estricto GeoJSON [Lng, Lat] de MongoDB
        const nuevasCoordenadas = {
            type: 'Point',
            coordinates: [parsedLng, parsedLat]
        };

        // Actualización directa sin instanciar documentos completos (Ahorro masivo de procesamiento de CPU)
        const conductorActualizado = await Conductor.findByIdAndUpdate(
            conductorId,
            { 
                $set: { 
                    coordenadas: nuevasCoordenadas,
                    estado: estadoLcase
                } 
            },
            { new: true, select: '_id nombre estado' } // Retorna solo campos mínimos
        ).lean();

        if (!conductorActualizado) {
            return res.status(404).json({ success: false, message: "❌ Unidad de transporte no registrada." });
        }

        // Trazabilidad premium compacta para la terminal de Nodemon
        console.log(`📡 [GPS] ID: ${conductorId.substring(18)}... | Est: ${estadoLcase.toUpperCase()} | Coord: [${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)}]`);

        return res.status(200).json({
            success: true,
            message: "📡 Telemetría GPS inyectada correctamente en malla vial local.",
            estadoActual: conductorActualizado.estado
        });

    } catch (error) {
        console.error('❌ [CIMCO-GPS-ERR] Error en ráfaga de posicionamiento:', error.message);
        return res.status(500).json({ success: false, message: "Falla crítica en el canal de telemetría.", error: error.message });
    }
};