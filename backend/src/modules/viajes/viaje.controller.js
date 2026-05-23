// Versión Arquitectura: V9.5 - Inyección Quirúrgica de Controlador iniciarViaje y Mantenimiento de Motor Haversine
/**
 * Controlador de Gestión de Viajes - TAXIA CIMCO Core
 * Misión: Procesar solicitudes de viajes calculando matemáticamente la distancia y tarifa por geofencing.
 * Seguridad: Validación estricta anti-undefined en payloads y persistencia contable del 10% para mototaxis.
 */

import Viaje from '../../models/Viaje.js';
import Conductor from '../../models/Conductor.js';
import HistorialSaldo from '../../models/HistorialSaldo.js'; 

/**
 * Función de Utilidad Geoespacial (Haversine Formula)
 * Determina la distancia ortodrómica entre dos puntos del globo terráqueo en Kilómetros.
 */
const calcularDistanciaHaversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en Kilómetros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
};

// 1. Controlador para que un pasajero solicite un viaje con cálculo dinámico de geofencing
export const crearViaje = async (req, res) => {
    try {
        const { pasajeroId, origenTexto, destinoTexto, coordenadasOrigen, coordenadasDestino } = req.body;

        // 🛡️ Guarda de Seguridad - Blindaje Obligatorio Anti-Undefined (Regla de Oro #2)
        if (!pasajeroId || !coordenadasOrigen || !coordenadasDestino || !origenTexto || !destinoTexto) {
            return res.status(400).json({
                success: false,
                message: '⚠️ ALERTA DE ARQUITECTURA: Parámetros geoespaciales o ID de usuario faltantes para procesar el viaje.'
            });
        }

        // 1. Ejecutar cálculo matemático de distancia real en la malla vial simulada
        const km = calcularDistanciaHaversine(
            coordenadasOrigen[0], coordenadasOrigen[1],
            coordenadasDestino[0], coordenadasDestino[1]
        );

        // 2. Aplicar matriz de tarifas dinámicas oficiales de TAXIA CIMCO
        const tarifaBase = 3000;
        const costoPorKm = 1500;
        const tarifaCalculada = Math.round(tarifaBase + (km * costoPorKm));

        // 3. Persistencia atómica en MongoDB Atlas vinculando coordenadas mapeadas
        const nuevoViaje = new Viaje({
            pasajeroId,
            origen: coordenadasOrigen,       // Registra array [lat, lon]
            destino: coordenadasDestino,     // Registra array [lat, lon]
            origenTexto,
            destinoTexto,
            tarifa: tarifaCalculada,
            distanciaKm: parseFloat(km.toFixed(2)),
            estadoViaje: 'buscando'
        });

        await nuevoViaje.save();

        res.status(201).json({
            success: true,
            message: '🚕 ¡Solicitud de viaje creada mediante motor de geofencing! Buscando mototaxi...',
            data: nuevoViaje
        });

    } catch (error) {
        console.error('❌ Error crítico en crearViaje (Geofencing Engine):', error);
        res.status(500).json({
            success: false,
            message: 'Error interno de infraestructura al procesar la solicitud geoespacial.',
            error: error.message
        });
    }
};

// 2. Controlador para que los mototaxis vean los viajes buscando conductor
export const obtenerViajesDisponibles = async (req, res) => {
    try {
        const viajesDisponibles = await Viaje.find({ estadoViaje: 'buscando' });
        res.status(200).json({
            success: true,
            data: viajesDisponibles
        });
    } catch (error) {
        console.error('❌ Error en obtenerViajesDisponibles:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener viajes disponibles de la base de datos transaccional.'
        });
    }
};

// 3. Controlador para que un mototaxi acepte un viaje
export const aceptarViaje = async (req, res) => {
    try {
        const { viajeId } = req.params;
        const { conductorId, conductorNombre, placa } = req.body;

        // 🛡️ Guarda de Seguridad - Validación de payload entrante
        if (!viajeId || !conductorId || !conductorNombre || !placa) {
            return res.status(400).json({
                success: false,
                message: 'Parámetros insuficientes para procesar la aceptación del servicio.'
            });
        }

        const viaje = await Viaje.findById(viajeId);
        if (!viaje) {
            return res.status(404).json({ success: false, message: 'Viaje no encontrado en el sistema central.' });
        }

        if (viaje.estadoViaje !== 'buscando') {
            return res.status(400).json({ success: false, message: 'Este viaje ya fue tomado por otro conductor en tiempo real.' });
        }

        // Asignación de recursos de telemetría hibridada
        viaje.conductorId = conductorId;
        viaje.conductorNombre = conductorNombre;
        viaje.placa = placa;
        viaje.estadoViaje = 'aceptado';
        await viaje.save();

        res.status(200).json({
            success: true,
            message: '🏍️ ¡Viaje aceptado de forma exitosa! Conéctate con el pasajero.',
            data: viaje
        });

    } catch (error) {
        console.error('❌ Error en aceptarViaje:', error);
        res.status(500).json({ success: false, message: 'Error al enganchar conductor al viaje.' });
    }
};

// 🚀 NUEVO INYECTADO: Controlador para que un mototaxi indique que el viaje ha iniciado
export const iniciarViaje = async (req, res) => {
    try {
        const { viajeId } = req.params;

        // 🛡️ Guarda de Seguridad Obligatoria
        if (!viajeId) {
            return res.status(400).json({ success: false, message: 'Identificador de viaje obligatorio.' });
        }

        const viaje = await Viaje.findById(viajeId);
        if (!viaje) {
            return res.status(404).json({ success: false, message: 'Viaje no encontrado en el sistema central.' });
        }

        // Validar lógica de negocio de flujo de estados
        if (viaje.estadoViaje !== 'aceptado') {
            return res.status(400).json({ 
                success: false, 
                message: '⚠️ ALERTA DE ARQUITECTURA: El viaje debe estar en estado "aceptado" antes de poder iniciarse.' 
            });
        }

        // Transición atómica de estado
        viaje.estadoViaje = 'iniciado';
        await viaje.save();

        res.status(200).json({
            success: true,
            message: '🚀 Transbordo Activo. El viaje ha iniciado su curso.',
            data: viaje
        });

    } catch (error) {
        console.error('❌ Error en iniciarViaje:', error);
        res.status(500).json({ success: false, message: 'Error de infraestructura al iniciar el viaje.' });
    }
};

// 4. Controlador para finalizar un viaje y aplicar la retención contable del 10%
export const completarViaje = async (req, res) => {
    try {
        const { viajeId } = req.params;

        if (!viajeId) {
            return res.status(400).json({ success: false, message: 'Identificador de viaje obligatorio.' });
        }

        const viaje = await Viaje.findById(viajeId);
        if (!viaje) {
            return res.status(404).json({ success: false, message: 'Viaje no encontrado.' });
        }

        if (viaje.estadoViaje === 'completado') {
            return res.status(400).json({ success: false, message: 'Este viaje ya fue completado previamente.' });
        }

        const tarifaManual = viaje.tarifa || 0;
        const comisionPlataforma = Math.round(tarifaManual * 0.10); // Liquidación del 10% de comisión corporativa

        // Descuento en Billetera Virtual del Conductor
        const conductor = await Conductor.findOne({ uid: viaje.conductorId });
        let saldoAntesDelDescuento = 0;
        let conductorActualizado = null;

        if (conductor) {
            saldoAntesDelDescuento = conductor.saldo || 0;
            conductor.saldo = saldoAntesDelDescuento - comisionPlataforma;
            conductorActualizado = await conductor.save();
            console.log(`💰 [CONTABILIDAD] Conductor ${viaje.conductorNombre} liquidado. Saldo anterior: $${saldoAntesDelDescuento}, Nuevo Saldo: $${conductor.saldo}`);
        }

        if (!conductor) {
            console.warn(`⚠️ [ADVERTENCIA] El viaje finalizó, pero no se encontró el conductor para descontar la comisión.`);
        } else {
            // 🔥 Asentar registro histórico financiero en auditoría
            const nuevoRegistroHistorial = new HistorialSaldo({
                conductorId: viaje.conductorId,
                viajeId: viaje._id,
                tipo: 'descuento_comision',
                monto: comisionPlataforma,
                saldoAnterior: saldoAntesDelDescuento,
                saldoNuevo: conductorActualizado.saldo,
                descripcion: `Comisión del 10% retenida por viaje finalizado. Tarifa del viaje: $${tarifaManual} COP.`
            });
            await nuevoRegistroHistorial.save();
        }

        // Actualización final del documento
        viaje.estadoViaje = 'completado';
        await viaje.save();

        res.status(200).json({
            success: true,
            message: '🏁 ¡Viaje completado con éxito! Destino alcanzado, comisión liquidada e historial asentado.',
            comisionDescontada: comisionPlataforma,
            nuevoSaldoConductor: conductorActualizado ? conductorActualizado.saldo : 'N/A',
            data: viaje
        });

    } catch (error) {
        console.error('❌ Error en completarViaje con liquidación e historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error al finalizar el viaje y procesar la contabilidad.'
        });
    }
};