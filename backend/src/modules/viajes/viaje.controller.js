// Versión Arquitectura: V10.3 - Sincronización Síncrona Firestore y Liquidación de Flota (10%)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.controller.js
 * Misión: Procesar flujos operativos, liquidación contable (10% comisión), y sincronización de estado de viaje hacia Firebase Firestore.
 * Seguridad: Validación estricta anti-undefined, bloqueo por saldo insuficiente (<$2000 COP) y persistencia contable.
 */

import Viaje from '../../models/Viaje.js';
import Conductor from '../../models/Conductor.js';
import HistorialSaldo from '../../models/HistorialSaldo.js'; 
import crypto from 'crypto';

// 🚀 GOBERNANZA DE RUTAS: Puente Híbrido con Firestore
import { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js';

// 🧠 Algoritmo de Distancia Esférica (Haversine)
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

// 1. CREACIÓN DEL VIAJE (PASAJERO)
export const crearViaje = async (req, res) => {
    try {
        const { pasajeroId, origen, destino, tarifaEstimada } = req.body;
        
        // 🛡️ GUARDA DE SEGURIDAD GEOESPACIAL
        if (!pasajeroId || !origen || !destino || typeof origen.lat === 'undefined' || typeof origen.lng === 'undefined' || typeof destino.lat === 'undefined' || typeof destino.lng === 'undefined') {
            return res.status(400).json({ success: false, message: '⚠️ ALERTA DE ARQUITECTURA: Parámetros geoespaciales o ID de usuario faltantes.' });
        }
        
        const latOrigen = Number(origen.lat), lngOrigen = Number(origen.lng), latDestino = Number(destino.lat), lngDestino = Number(destino.lng);
        
        if (isNaN(latOrigen) || isNaN(lngOrigen) || isNaN(latDestino) || isNaN(lngDestino)) {
            return res.status(400).json({ success: false, message: 'Coordenadas GPS no válidas.' });
        }
        
        // 🧮 CALIBRACIÓN DEL ALGORITMO DE TARIFA (Base $3000 + $1500/Km)
        const km = calcularDistanciaHaversine(latOrigen, lngOrigen, latDestino, lngDestino);
        const tarifaCalculada = tarifaEstimada ? Number(tarifaEstimada) : Math.round(3000 + (km * 1500));
        
        const nuevoViaje = new Viaje({ 
            pasajeroId, 
            origen: { lat: latOrigen, lng: lngOrigen }, 
            destino: { lat: latDestino, lng: lngDestino }, 
            origenTexto: origen.direccion || 'Ubicación GPS', 
            destinoTexto: destino.direccion || 'Destino GPS', 
            tarifa: isNaN(tarifaCalculada) ? 3000 : tarifaCalculada, 
            estadoViaje: 'buscando' 
        });
        
        await nuevoViaje.save();

        // ⚡ PUENTE FIRESTORE: Publicar solicitud en tiempo real para el Radar Geoespacial
        if (dbFirestore && FIRESTORE_PATHS.viajes) {
            await dbFirestore.collection(FIRESTORE_PATHS.viajes).doc(nuevoViaje._id.toString()).set({
                id: nuevoViaje._id.toString(),
                pasajeroId,
                estado: 'buscando',
                origen: { latitude: latOrigen, longitude: lngOrigen },
                destino: { latitude: latDestino, longitude: lngDestino },
                tarifa: tarifaCalculada,
                createdAt: new Date().toISOString()
            });
        }

        console.log(`🚕 [CIMCO-DESPACHO] Viaje solicitado. ID: ${nuevoViaje._id} | Tarifa: $${tarifaCalculada}`);
        res.status(201).json({ success: true, message: '🚕 Solicitud creada exitosamente en el clúster.', data: nuevoViaje });
        
    } catch (error) {
        console.error('❌ Error en creación de viaje:', error.message);
        res.status(500).json({ success: false, message: 'Falla crítica interna en creación de servicio.', error: error.message });
    }
};

export const obtenerViajesDisponibles = async (req, res) => {
    try {
        const viajesDisponibles = await Viaje.find({ estadoViaje: 'buscando' }).lean();
        res.status(200).json({ success: true, count: viajesDisponibles.length, data: viajesDisponibles });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener bolsa de viajes disponibles.' });
    }
};

// 2. ASIGNACIÓN DEL VIAJE (CONDUCTOR)
export const aceptarViaje = async (req, res) => {
    try {
        const { viajeId, conductorId } = req.body;
        const [viaje, conductor] = await Promise.all([
            Viaje.findById(viajeId), 
            Conductor.findOne({ $or: [{ _id: conductorId }, { conductorId: conductorId }] })
        ]);

        if (!viaje || !conductor) return res.status(404).json({ success: false, message: 'Viaje o unidad de transporte no localizados.' });
        if (viaje.estadoViaje !== 'buscando') return res.status(400).json({ success: false, message: 'El servicio ya ha sido asignado a otra unidad.' });
        
        // 🛡️ REGLA INQUEBRANTABLE DE NEGOCIO: Bloqueo de Billetera Exhausta
        const saldoActual = typeof conductor.saldo === 'number' ? conductor.saldo : 0;
        if (saldoActual < 2000) {
            console.warn(`⚠️ [CIMCO-TESORERÍA] Unidad ${conductor.nombre} rechazada. Saldo: $${saldoActual}`);
            return res.status(403).json({ success: false, message: `Billetera bloqueada. Saldo insuficiente ($${saldoActual} COP). Requiere mínimo $2000 COP.` });
        }

        viaje.conductorId = conductor.conductorId || conductor._id;
        viaje.estadoViaje = 'aceptado';
        conductor.estado = 'busy';
        
        await Promise.all([viaje.save(), conductor.save()]);

        // ⚡ PUENTE FIRESTORE: Actualizar estado de viaje y bloquear nodo en el mapa
        if (dbFirestore && FIRESTORE_PATHS.viajes && FIRESTORE_PATHS.conductores) {
            const batch = dbFirestore.batch();
            const viajeRef = dbFirestore.collection(FIRESTORE_PATHS.viajes).doc(viaje._id.toString());
            const conductorRef = dbFirestore.collection(FIRESTORE_PATHS.conductores).doc(conductor._id.toString());
            
            batch.update(viajeRef, { estado: 'aceptado', conductorId: conductor._id.toString() });
            batch.update(conductorRef, { estado: 'busy' });
            await batch.commit();
        }

        console.log(`🏍️ [CIMCO-DESPACHO] Viaje ${viaje._id} asignado a ${conductor.nombre}.`);
        res.status(200).json({ success: true, message: '🏍️ Viaje asignado y sincronizado.', data: viaje });
        
    } catch (error) {
        console.error('❌ Error en aceptación de viaje:', error.message);
        res.status(500).json({ success: false, message: 'Error de infraestructura en el nodo de despacho.', error: error.message });
    }
};

export const iniciarViaje = async (req, res) => {
    try {
        const { viajeId } = req.body;
        const viaje = await Viaje.findById(viajeId);
        if (!viaje || viaje.estadoViaje !== 'aceptado') return res.status(400).json({ success: false, message: 'Estado operativo inválido para inicio.' });
        
        viaje.estadoViaje = 'en_ruta';
        await viaje.save();

        if (dbFirestore && FIRESTORE_PATHS.viajes) {
            await dbFirestore.collection(FIRESTORE_PATHS.viajes).doc(viaje._id.toString()).update({ estado: 'en_ruta' });
        }

        res.status(200).json({ success: true, message: '🚀 Ruta iniciada.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al cambiar estado operativo.' });
    }
};

// 3. FINALIZACIÓN Y LIQUIDACIÓN CONTABLE (10% COMISIÓN)
export const completarViaje = async (req, res) => {
    try {
        const { viajeId } = req.body;
        const viaje = await Viaje.findById(viajeId);
        
        if (!viaje || viaje.estadoViaje === 'completado') return res.status(400).json({ success: false, message: 'Viaje inexistente o ya liquidado en el clúster.' });
        
        const tarifa = viaje.tarifa || 0;
        // 💰 REGLA MATEMÁTICA: Extracción exacta del 10% para la plataforma
        const comision = Math.round(tarifa * 0.10); 
        
        const conductor = await Conductor.findOne({ $or: [{ _id: viaje.conductorId }, { conductorId: viaje.conductorId }] });
        let nuevoSaldo = 0;
        
        if (conductor) {
            const saldoAnterior = typeof conductor.saldo === 'number' ? conductor.saldo : 0;
            nuevoSaldo = Math.max(0, saldoAnterior - comision);
            conductor.saldo = nuevoSaldo;
            conductor.estado = 'active'; 
            
            await conductor.save();
            await HistorialSaldo.create({ 
                conductorId: conductor._id, 
                viajeId: viaje._id, 
                tipo: 'descuento_comision', 
                monto: comision, 
                saldoAnterior, 
                saldoNuevo: nuevoSaldo, 
                descripcion: `Liquidación: 10% retenido del viaje ${viaje._id}.` 
            });
        }
        
        viaje.estadoViaje = 'completado';
        await viaje.save();

        // ⚡ PUENTE FIRESTORE: Liberar unidad y cerrar viaje en el mapa
        if (dbFirestore && FIRESTORE_PATHS.viajes && FIRESTORE_PATHS.conductores && conductor) {
            const batch = dbFirestore.batch();
            batch.update(dbFirestore.collection(FIRESTORE_PATHS.viajes).doc(viaje._id.toString()), { estado: 'completado' });
            batch.update(dbFirestore.collection(FIRESTORE_PATHS.conductores).doc(conductor._id.toString()), { estado: 'active' });
            await batch.commit();
        }

        console.log(`🏁 [CIMCO-LIQUIDACIÓN] Viaje cerrado. Comisión (10%): $${comision} COP. Nuevo Saldo Operador: $${nuevoSaldo}`);
        res.status(200).json({ success: true, message: '🏁 Liquidación de viaje completada y unidad liberada.', comisionDescontada: comision, nuevoSaldo: nuevoSaldo });
        
    } catch (error) {
        console.error('❌ Error en liquidación:', error.message);
        res.status(500).json({ success: false, message: 'Falla atómica al liquidar el viaje.', error: error.message });
    }
};

// 4. WEBHOOK WOMPI (IGNORAR TARJETAS)
export const recibirAlertaWompiLocal = async (req, res) => {
    try {
        const { event, data, timestamp, signature } = req.body;
        if (!data?.transaction || !signature) return res.status(200).json({ status: 'ignored', message: 'Datos incompletos.' });
        
        const secret = process.env.WOMPI_EVENTS_SECRET;
        const cadenaFirma = `${data.transaction.id}${data.transaction.status}${data.transaction.amount_in_cents}${timestamp}${secret}`;
        const hashLocal = crypto.createHash('sha256').update(cadenaFirma).digest('hex');
        
        if (hashLocal !== signature.checksum) return res.status(200).json({ status: 'failed', message: 'Firma inválida.' });
        if (data.transaction.payment_method_type?.toUpperCase() === 'CARD') return res.status(200).json({ status: 'ignored', message: 'Tarjetas deshabilitadas por política CIMCO.' });
        
        if (data.transaction.status === 'APPROVED' && event === 'transaction.updated') {
            const monto = Math.round(data.transaction.amount_in_cents / 100);
            console.log(`✅ [CIMCO-TRANSACCION] Recarga de tesorería aprobada (Wompi): $${monto} COP.`);
        }
        return res.status(200).json({ success: true, message: 'Evento analizado.' });
    } catch (error) {
        return res.status(500).json({ error: 'Falla interna en Webhook Wompi.' });
    }
};