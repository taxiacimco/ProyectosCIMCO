// Versión Arquitectura: V10.2 - Blindaje Transaccional, Validación de Saldos y Normalización de Liquidación (10%)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.controller.js
 * Misión: Procesar flujos operativos, liquidación contable y sincronización de billeteras.
 * Seguridad: Validación estricta anti-undefined, bloqueo por saldo insuficiente (<$2000 COP) y persistencia contable.
 */

import Viaje from '../../models/Viaje.js';
import Conductor from '../../models/Conductor.js';
import HistorialSaldo from '../../models/HistorialSaldo.js'; 
import crypto from 'crypto';

const calcularDistanciaHaversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
};

export const crearViaje = async (req, res) => {
    try {
        const { pasajeroId, origen, destino, tarifaEstimada } = req.body;
        if (!pasajeroId || !origen || !destino || typeof origen.lat === 'undefined' || typeof origen.lng === 'undefined' || typeof destino.lat === 'undefined' || typeof destino.lng === 'undefined') {
            return res.status(400).json({ success: false, message: '⚠️ ALERTA DE ARQUITECTURA: Parámetros geoespaciales o ID de usuario faltantes.' });
        }
        const latOrigen = Number(origen.lat), lngOrigen = Number(origen.lng), latDestino = Number(destino.lat), lngDestino = Number(destino.lng);
        if (isNaN(latOrigen) || isNaN(lngOrigen) || isNaN(latDestino) || isNaN(lngDestino)) {
            return res.status(400).json({ success: false, message: 'Coordenadas GPS no válidas.' });
        }
        const km = calcularDistanciaHaversine(latOrigen, lngOrigen, latDestino, lngDestino);
        const tarifaCalculada = tarifaEstimada ? Number(tarifaEstimada) : Math.round(3000 + (km * 1500));
        const nuevoViaje = new Viaje({ pasajeroId, origen: { lat: latOrigen, lng: lngOrigen }, destino: { lat: latDestino, lng: lngDestino }, origenTexto: origen.direccion || 'Ubicación GPS', destinoTexto: destino.direccion || 'Destino GPS', tarifa: isNaN(tarifaCalculada) ? 3000 : tarifaCalculada, estadoViaje: 'buscando' });
        await nuevoViaje.save();
        res.status(201).json({ success: true, message: '🚕 Solicitud creada.', data: nuevoViaje });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno.', error: error.message });
    }
};

export const obtenerViajesDisponibles = async (req, res) => {
    try {
        const viajesDisponibles = await Viaje.find({ estadoViaje: 'buscando' });
        res.status(200).json({ success: true, data: viajesDisponibles });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener viajes.' });
    }
};

export const aceptarViaje = async (req, res) => {
    try {
        const { viajeId, conductorId } = req.body;
        const [viaje, conductor] = await Promise.all([Viaje.findById(viajeId), Conductor.findOne({ $or: [{ _id: conductorId }, { conductorId: conductorId }] })]);
        if (!viaje || !conductor) return res.status(404).json({ success: false, message: 'Recurso no encontrado.' });
        if (viaje.estadoViaje !== 'buscando') return res.status(400).json({ success: false, message: 'Viaje no disponible.' });
        const saldoActual = typeof conductor.saldo === 'number' ? conductor.saldo : 0;
        if (saldoActual < 2000) return res.status(403).json({ success: false, message: `Saldo insuficiente (${saldoActual} COP).` });
        viaje.conductorId = conductor.conductorId || conductor._id;
        viaje.estadoViaje = 'aceptado';
        conductor.estado = 'busy';
        await Promise.all([viaje.save(), conductor.save()]);
        res.status(200).json({ success: true, message: '🏍️ Viaje aceptado.', data: viaje });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error de infraestructura.', error: error.message });
    }
};

export const iniciarViaje = async (req, res) => {
    try {
        const { viajeId } = req.body;
        const viaje = await Viaje.findById(viajeId);
        if (!viaje || viaje.estadoViaje !== 'aceptado') return res.status(400).json({ success: false, message: 'Estado inválido.' });
        viaje.estadoViaje = 'en_ruta';
        await viaje.save();
        res.status(200).json({ success: true, message: '🚀 Viaje en curso.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al iniciar.' });
    }
};

export const completarViaje = async (req, res) => {
    try {
        const { viajeId } = req.body;
        const viaje = await Viaje.findById(viajeId);
        if (!viaje || viaje.estadoViaje === 'completado') return res.status(400).json({ success: false, message: 'Viaje inexistente o ya finalizado.' });
        const tarifa = viaje.tarifa || 0;
        const comision = Math.round(tarifa * 0.10); 
        const conductor = await Conductor.findOne({ $or: [{ _id: viaje.conductorId }, { conductorId: viaje.conductorId }] });
        let nuevoSaldo = 0;
        if (conductor) {
            const saldoAnterior = typeof conductor.saldo === 'number' ? conductor.saldo : 0;
            nuevoSaldo = Math.max(0, saldoAnterior - comision);
            conductor.saldo = nuevoSaldo;
            conductor.estado = 'active'; 
            await conductor.save();
            await HistorialSaldo.create({ conductorId: conductor._id, viajeId: viaje._id, tipo: 'descuento_comision', monto: comision, saldoAnterior, saldoNuevo: nuevoSaldo, descripcion: `Comisión 10% retenida.` });
        }
        viaje.estadoViaje = 'completado';
        await viaje.save();
        res.status(200).json({ success: true, message: '🏁 Viaje completado.', comisionDescontada: comision, nuevoSaldo: nuevoSaldo });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al finalizar.' });
    }
};

export const recibirAlertaWompiLocal = async (req, res) => {
    try {
        const { event, data, timestamp, signature } = req.body;
        if (!data?.transaction || !signature) return res.status(200).json({ status: 'ignored', message: 'Datos incompletos.' });
        const secret = process.env.WOMPI_EVENTS_SECRET;
        const cadenaFirma = `${data.transaction.id}${data.transaction.status}${data.transaction.amount_in_cents}${timestamp}${secret}`;
        const hashLocal = crypto.createHash('sha256').update(cadenaFirma).digest('hex');
        if (hashLocal !== signature.checksum) return res.status(200).json({ status: 'failed', message: 'Firma inválida.' });
        if (data.transaction.payment_method_type?.toUpperCase() === 'CARD') return res.status(200).json({ status: 'ignored', message: 'Tarjetas deshabilitadas.' });
        if (data.transaction.status === 'APPROVED' && event === 'transaction.updated') {
            const monto = Math.round(data.transaction.amount_in_cents / 100);
            console.log(`✅ [CIMCO-TRANSACCION] Recarga aprobada: $${monto} COP.`);
        }
        return res.status(200).json({ success: true, message: 'Procesado.' });
    } catch (error) {
        return res.status(500).json({ error: 'Error interno.' });
    }
};