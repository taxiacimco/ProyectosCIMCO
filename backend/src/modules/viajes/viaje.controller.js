// Versión Arquitectura: V14.11 - Blindaje de Aislamiento ACID, Mitigación de Concurrencia y Sincronización Contable
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.controller.js
 * Misión: Procesar flujos operativos, liquidación contable (10% comisión) y sincronización Firestore.
 * Ajuste V14.11: Corrección de simetría en HistorialSaldo sustituyendo el campo erróneo `conductorId` 
 * por la propiedad de relación correcta `conductor` para evitar descalces en auditorías de saldo.
 */

import Viaje from '#models/Viaje.js';
import Conductor from '#models/Conductor.js';
import Usuario from '#models/Usuario.js';
import HistorialSaldo from '#models/HistorialSaldo.js';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { dbFirestore, FIRESTORE_PATHS } from '#config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// Auxiliar de retardo con aleatoriedad (Jitter) para dispersar la ráfaga concurrentemente
const esperarGarantizado = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

// ==================================================================
// 0. CREACIÓN Y DESPACHO INMEDIATO (BLOQUEO TRANSACCIONAL DESDE ANDÉN)
// ==================================================================
export const crearYDespacharViajeAtomico = async (req, res) => {
    if (!req || !req.body) {
        return res.status(400).json({ success: false, message: 'Payload de inyección logística corrupto o ausente.' });
    }

    const { viajeId, pasajeroId, origen, destino, origenTexto, destinoTexto, tarifa, valor, metodoPago, conductorId } = req.body;
    const tarifaFinal = tarifa !== undefined ? tarifa : valor;

    // Guardas de Validación Estricta
    if (!conductorId) return res.status(400).json({ success: false, message: 'Falta parámetro obligatorio: conductorId' });
    if (!pasajeroId) return res.status(400).json({ success: false, message: 'Falta parámetro obligatorio: pasajeroId' });
    if (tarifaFinal === undefined || tarifaFinal === null) return res.status(400).json({ success: false, message: 'Falta parámetro obligatorio: tarifa o valor' });
    if (!origen || isNaN(parseFloat(origen.lat)) || isNaN(parseFloat(origen.lng))) return res.status(400).json({ success: false, message: 'Falta parámetro obligatorio o estructurado: origen (lat/lng)' });
    if (!destino || isNaN(parseFloat(destino.lat)) || isNaN(parseFloat(destino.lng))) return res.status(400).json({ success: false, message: 'Falta parámetro obligatorio o estructurado: destino (lat/lng)' });
    if (!origenTexto || typeof origenTexto !== 'string' || origenTexto.trim() === '') return res.status(400).json({ success: false, message: 'Falta parámetro obligatorio: origenTexto' });
    if (!destinoTexto || typeof destinoTexto !== 'string' || destinoTexto.trim() === '') return res.status(400).json({ success: false, message: 'Falta parámetro obligatorio: destinoTexto' });

    if (!req.usuario || !req.usuario.id) {
        return res.status(401).json({ success: false, message: 'Credenciales de operador ausentes en la terminal de despacho.' });
    }

    const despachadorId = String(req.usuario.id);
    const despachadorRol = String(req.usuario.rol || req.usuario.role || '').toLowerCase();

    if (despachadorRol !== 'despachador' && despachadorRol !== 'admin' && despachadorRol !== 'ceo') {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Su rol no cuenta con privilegios de asignación en andén.' });
    }

    // ⚡ FIX DETECCIÓN CASTEO OBJETOID: Genera un ObjectId hexadecimal de 24 caracteres válido para Mongoose
    let idViajeFinal;
    if (viajeId && mongoose.Types.ObjectId.isValid(viajeId)) {
        idViajeFinal = new mongoose.Types.ObjectId(viajeId);
    } else {
        idViajeFinal = new mongoose.Types.ObjectId();
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 🔥 OPTIMIZACIÓN CONCURRENTE: Mutación directa con filtro atómico para prevenir doble asignación simultánea del conductor
        const conductor = await Conductor.findOneAndUpdate(
            { _id: conductorId, estadoOperativo: 'DISPONIBLE' },
            { 
                $set: { 
                    estado: 'busy', 
                    estadoOperativo: 'OCUPADO', 
                    viajeActualId: String(idViajeFinal) 
                } 
            },
            { new: true, session }
        );

        if (!conductor) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({
                success: false,
                code: 'DRIVER_CONCURRENT_CONFLICT',
                message: 'Conflicto de despacho. El conductor no existe o ya cambió a estado OCUPADO/INACTIVO por otra asignación.'
            });
        }

        if ((conductor.saldo || 0) < 2000) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Despacho denegado. El conductor posee saldo insuficiente en billetera ($${conductor.saldo || 0} COP).`
            });
        }

        // 2. Inserción aislada del nuevo viaje asignado directamente con el ObjectId verificado
        const [nuevoViaje] = await Viaje.create([{
            _id: idViajeFinal,
            pasajeroId,
            conductorId,
            despachadorId,
            origen,
            destino,
            origenTexto,
            destinoTexto,
            tarifa: parseFloat(tarifaFinal),
            valor: parseFloat(tarifaFinal),
            metodoPago: metodoPago || 'EFECTIVO',
            estado: 'aceptado', 
            estadoViaje: 'aceptado'
        }], { session });

        await session.commitTransaction();
        session.endSession();

        // 📡 Sincronización post-commit no bloqueante en Firebase Firestore
        if (dbFirestore) {
            const viajeRef = dbFirestore.collection(FIRESTORE_PATHS.viajes || 'viajes').doc(String(idViajeFinal));
            const conductorRef = dbFirestore.collection(FIRESTORE_PATHS.conductores || 'conductores').doc(String(conductorId));

            Promise.all([
                viajeRef.set({
                    viajeId: String(idViajeFinal),
                    pasajeroId: String(pasajeroId),
                    conductorId: String(conductorId),
                    despachadorId: despachadorId,
                    origen,
                    destino,
                    origenTexto,
                    destinoTexto,
                    tarifa: parseFloat(tarifaFinal),
                    valor: parseFloat(tarifaFinal),
                    metodoPago: metodoPago || 'EFECTIVO',
                    estadoViaje: 'aceptado',
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                }),
                conductorRef.update({
                    estado: 'busy',
                    estadoOperativo: 'OCUPADO',
                    viajeActualId: String(idViajeFinal),
                    updatedAt: FieldValue.serverTimestamp()
                })
            ]).catch(e => console.error("🚨 Error diferido Firestore en creación atómica:", e));
        }

        return res.status(201).json({
            success: true,
            message: "Viaje intermunicipal creado e inyectado limpiamente bajo aislamiento ACID.",
            viajeId: String(idViajeFinal),
            data: nuevoViaje
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();

        console.error("❌ [CIMCO-CREAR-DESPACHO-ERR]:", error.message);

        const esErrorDuplicado = error.code === 11000 || 
                                 error.code === 112 ||
                                 error.message.includes('E11000') || 
                                 error.message.includes('WiredTigerIdIndex') ||
                                 error.message.includes('WriteConflict') ||
                                 error.message.includes('Write conflict');

        if (esErrorDuplicado) {
            return res.status(409).json({
                success: false,
                code: 'CIMCO_ACID_LOCK_REJECT',
                message: "🛡️ [CIMCO-ACID]: Bloqueo preventivo de concurrencia rápida. El recurso ya está siendo modificado por otro hilo de despacho."
            });
        }

        return res.status(500).json({ 
            success: false, 
            message: 'Fallo crítico transaccional al ejecutar el despacho en andén.' 
        });
    }
};

// ==================================================================
// 1. SOLICITUD DE SERVICIO (RADAR RADIAL DE CERCANÍA)
// ==================================================================
export const solicitarViaje = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: 'Payload de solicitud nulo o inválido.' });
        }

        const { pasajeroId, origen, destino, origenTexto, destinoTexto, tarifa, valor, metodoPago } = req.body;
        const tarifaFinal = tarifa !== undefined ? tarifa : valor;

        if (!pasajeroId || !origen || !destino || !origenTexto || !destinoTexto || tarifaFinal === undefined) {
            return res.status(400).json({ success: false, message: 'Parámetros obligatorios incompletos para procesar despacho.' });
        }

        if (String(metodoPago).toUpperCase() === 'WALLET') {
            const pasajero = await Usuario.findById(pasajeroId).lean();
            if (!pasajero) {
                return res.status(404).json({ success: false, message: 'El perfil de pasajero no se encuentra en el sistema central.' });
            }

            const saldoDisponible = pasajero.saldo || pasajero.balance || 0;
            if (saldoDisponible < parseFloat(tarifaFinal)) {
                return res.status(400).json({
                    success: false,
                    message: "Fondos insuficientes en tu billetera digital para realizar este viaje."
                });
            }
        }

        const nuevoViaje = await Viaje.create({
            pasajeroId,
            origen,
            destino,
            origenTexto,
            destinoTexto,
            tarifa: parseFloat(tarifaFinal),
            valor: parseFloat(tarifaFinal),
            metodoPago: metodoPago || 'EFECTIVO',
            estado: 'solicitado',
            estadoViaje: 'solicitado'
        });

        if (dbFirestore && FIRESTORE_PATHS?.viajes) {
            dbFirestore.collection(FIRESTORE_PATHS.viajes).doc(String(nuevoViaje._id)).set({
                viajeId: String(nuevoViaje._id),
                pasajeroId: String(pasajeroId),
                origen,
                destino,
                origenTexto,
                destinoTexto,
                tarifa: parseFloat(tarifaFinal),
                valor: parseFloat(tarifaFinal),
                metodoPago: metodoPago || 'EFECTIVO',
                estadoViaje: 'solicitado',
                conductorId: null,
                createdAt: FieldValue.serverTimestamp()
            }).catch(e => console.error("🚨 Error diferido Firestore en solicitarViaje:", e));
        }

        const conductoresCercanos = await Conductor.find({
            estadoOperativo: 'DISPONIBLE',
            ubicacion: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(origen.lng), parseFloat(origen.lat)]
                    },
                    $maxDistance: 5000 
                }
            }
        }).lean();

        const aptos = (conductoresCercanos || []).filter(c => (c.saldo || 0) >= 2000);

        return res.status(201).json({
            success: true,
            viajeId: nuevoViaje._id,
            conductoresNotificados: aptos.length,
            data: nuevoViaje
        });

    } catch (error) {
        console.error("🚨 [CIMCO-DESPACHO-ERR]:", error);
        return res.status(500).json({ success: false, message: 'Fallo crítico al inicializar la orden radial.' });
    }
};

// ==================================================================
// 2. ASIGNACIÓN ATÓMICA CON LOCK ANTI-COLLISION (RACE CONDITION FIX)
// ==================================================================
export const aceptarViaje = async (req, res) => {
    if (!req || !req.body) {
        return res.status(400).json({ success: false, message: 'Payload de aceptación corrupto.' });
    }

    const { viajeId, conductorId } = req.body;
    if (!viajeId || !conductorId) {
        return res.status(400).json({ success: false, message: 'ID de viaje y de conductor mandatorios.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const conductor = await Conductor.findOneAndUpdate(
            { _id: conductorId, estadoOperativo: 'DISPONIBLE' }, 
            { $set: { estado: 'busy', estadoOperativo: 'OCUPADO', viajeActualId: String(viajeId) } },
            { new: true, session }
        );

        if (!conductor) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({
                success: false,
                code: 'DRIVER_BUSY_OR_OFFLINE',
                message: 'Operación declinada. El conductor ya se encuentra en estado OCUPADO o cambió su perfil operativo.'
            });
        }

        const saldoConductor = conductor.saldo || 0;
        if (saldoConductor < 2000) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Transacción rechazada. Saldo de billetera insuficiente ($${saldoConductor} COP).`
            });
        }

        const viajeAsignado = await Viaje.findOneAndUpdate(
            { _id: viajeId, estado: 'solicitado' }, 
            { $set: { conductorId: conductorId, estado: 'aceptado', estadoViaje: 'aceptado' } },
            { new: true, session }
        );

        if (!viajeAsignado) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({
                success: false,
                code: 'RACE_CONDITION_DETECTED',
                message: 'Lo sentimos, este servicio ya fue asignado o tomado por otro conductor en tránsito.'
            });
        }

        await session.commitTransaction();
        session.endSession();

        if (dbFirestore) {
            Promise.all([
                dbFirestore.collection(FIRESTORE_PATHS.viajes || 'viajes').doc(String(viajeId)).update({
                    conductorId: String(conductorId),
                    estadoViaje: 'aceptado',
                    updatedAt: FieldValue.serverTimestamp()
                }),
                dbFirestore.collection(FIRESTORE_PATHS.conductores || 'conductores').doc(String(conductorId)).update({
                    estado: 'busy',
                    estadoOperativo: 'OCUPADO',
                    viajeActualId: String(viajeId),
                    updatedAt: FieldValue.serverTimestamp()
                })
            ]).catch(e => console.error("🚨 Error diferido Firestore al actualizar asignación:", e));
        }

        return res.status(200).json({
            success: true,
            message: 'Servicio bloqueado y asignado a su terminal con éxito bajo aislamiento ACID.',
            data: viajeAsignado
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        console.error("🚨 [CIMCO-LOCK-ERR]: Fallo de concurrencia en hilos de base de datos:", error);
        return res.status(500).json({ success: false, message: 'Fallo de concurrencia en hilos de base de datos de asignación.' });
    }
};

// ==================================================================
// 3. SUBSISTEMA DE LIQUIDACIÓN Y CIERRE DE SERVICIOS (VERSIÓN ACID V14.11)
// ==================================================================
export const completarViaje = async (req, res) => {
    const MAX_REINTENTOS = 8;
    let intento = 0;
    const tiempoInicio = Date.now();

    if (!req || !req.body) {
        return res.status(400).json({ success: false, message: 'Payload de liquidación inválido.' });
    }
    
    const { viajeId } = req.body;
    if (!viajeId) {
        return res.status(400).json({ success: false, message: 'ID del viaje requerido para cierre contable.' });
    }

    while (intento < MAX_REINTENTOS) {
        intento++;
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const viaje = await Viaje.findById(viajeId).session(session);
            if (!viaje) {
                throw new Error('Servicio no encontrado en el historial.');
            }
            if (viaje.estado === 'finalizado' || viaje.estadoViaje === 'completado') {
                await session.abortTransaction();
                session.endSession();
                return res.status(200).json({
                    success: true,
                    message: 'Este servicio ya se encuentra liquidado y auditado por un hilo previo.',
                    saldoRestante: 'MANTENIDO'
                });
            }

            const conductorId = viaje.conductorId;
            if (!conductorId) {
                throw new Error('El viaje no tiene un conductor asociado para debitar.');
            }

            const valorReferencia = viaje.valor || viaje.tarifa || 0;
            const comision = Math.round(valorReferencia * 0.10);

            const conductorActualizado = await Conductor.findOneAndUpdate(
                { _id: conductorId, saldo: { $gte: comision } },
                { 
                    $inc: { saldo: -comision, balance: -comision },
                    $set: { estado: 'active', estadoOperativo: 'DISPONIBLE', viajeActualId: null }
                },
                { new: false, session }
            );

            if (!conductorActualizado) {
                throw new Error('Conductor no hallado o fondos insuficientes para cubrir la comisión en tiempo real.');
            }

            const saldoAnterior = conductorActualizado.saldo || 0;
            const saldoNuevo = saldoAnterior - comision;

            viaje.estado = 'finalizado';
            viaje.estadoViaje = 'completado';
            await viaje.save({ session });

            // 🚀 CORRECCIÓN CRÍTICA DE ASIMETRÍA: Se cambia conductorId por conductor
            await HistorialSaldo.create([{
                conductor: conductorId, 
                viajeId,
                tipo: 'descuento_comision',
                monto: comision,
                saldoAnterior,
                saldoNuevo,
                procesadoPor: 'SISTEMA_DESPACHO_AUTOMATICO',
                descripcion: `Débito automático del 10% por concepto de comisión del viaje ID: ${viaje._id}`
            }], { session });

            await session.commitTransaction();
            session.endSession();

            const latenciaTotal = Date.now() - tiempoInicio;
            if (intento > 1) {
                console.log(`📈 [CIMCO-PRODUCCION-AUDIT] Viaje ${viajeId} liquidado con éxito tras mitigar colisiones. Intentos: ${intento}. Latencia total: ${latenciaTotal}ms.`);
            }

            if (dbFirestore && FIRESTORE_PATHS?.conductores) {
                dbFirestore.collection(FIRESTORE_PATHS.conductores).doc(String(conductorId)).update({
                    saldo: FieldValue.increment(-comision),
                    balance: FieldValue.increment(-comision),
                    estado: 'active',
                    estadoOperativo: 'DISPONIBLE',
                    viajeActualId: null,
                    updatedAt: FieldValue.serverTimestamp()
                }).catch(e => console.error("🚨 Error diferido Firestore (Conductor):", e));
            }

            if (dbFirestore && FIRESTORE_PATHS?.viajes) {
                dbFirestore.collection(FIRESTORE_PATHS.viajes).doc(String(viajeId)).update({
                    estadoViaje: 'completado', 
                    updatedAt: FieldValue.serverTimestamp()
                }).catch(e => console.error("🚨 Error diferido Firestore (Viaje):", e));
            }

            return res.status(200).json({
                success: true,
                message: 'Servicio completado y balance liquidado de forma segura.',
                comisionDebitada: comision,
                saldoRestante: saldoNuevo
            });

        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            const esWriteConflict = error.code === 112 || 
                                    error.code === 11600 ||
                                    error.message.includes('Write conflict') || 
                                    error.message.includes('WriteConflict') ||
                                    (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError'));

            if (esWriteConflict && intento < MAX_REINTENTOS) {
                const baseMs = 50; 
                const maxBackoffMs = 1200;
                const tempBackoff = Math.min(maxBackoffMs, baseMs * Math.pow(2, intento));
                const backoffMs = Math.floor(Math.random() * tempBackoff);
                
                console.warn(`⚠️ [CIMCO-CONCURRENCIA] WriteConflict detectado en liquidación. Reintentando (Intento ${intento}/${MAX_REINTENTOS}) en ${backoffMs}ms...`);
                await esperarGarantizado(backoffMs);
                continue; 
            }

            console.error("🚨 [CIMCO-FINANCE-ERR]: Transacción abortada definitivamente.", error.message);
            const statusError = error.message.includes('insuficientes') ? 402 : 500;
            return res.status(statusError).json({ success: false, message: error.message });
        }
    }
};

// ==================================================================
// 4. WEBHOOK WOMPI
// ==================================================================
export const recibirAlertaWompiLocal = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(200).json({ status: 'ignored', message: 'Payload vacío.' });
        }

        const { event, data, timestamp, signature } = req.body;
        if (!data?.transaction || !signature) return res.status(200).json({ status: 'ignored', message: 'Datos incompletos.' });
        
        const secret = process.env.WOMPI_EVENTS_SECRET;
        const cadenaFirma = `${data.transaction.id}${data.transaction.status}${data.transaction.amount_in_cents}${timestamp}${secret}`;
        const hashLocal = crypto.createHash('sha256').update(cadenaFirma).digest('hex');
        
        if (hashLocal !== signature.checksum) return res.status(200).json({ status: 'failed', message: 'Firma inválida.' });
        if (data.transaction.payment_method_type?.toUpperCase() === 'CARD') return res.status(200).json({ status: 'ignored', message: 'Tarjetas deshabilitadas.' });
        
        if (data.transaction.status === 'APPROVED' && event === 'transaction.updated') {
            console.log(`✅ [CIMCO-TRANSACCION] Recarga Wompi processed.`);
        }
        return res.status(200).json({ success: true, status: 'processed' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 5. DISTRIBUCIÓN LOGÍSTICA ATÓMICA BLINDADA (FUSIÓN MONGO-FIREBASE ACID)
// ==================================================================
export const despacharViajeAtomico = async (req, res) => {
    if (!req || !req.body) {
        return res.status(400).json({ success: false, message: 'Payload de despacho nulo o inválido.' });
    }

    const { viajeId, conductorId, tarifa, valor, metodoPago } = req.body;
    const tarifaFinal = tarifa !== undefined ? tarifa : valor;
    
    if (!req.usuario || !req.usuario.id) {
        return res.status(401).json({ success: false, message: 'Credenciales de operador ausentes en la terminal.' });
    }

    const despachadorId = String(req.usuario.id); 
    const despachadorRol = String(req.usuario.rol || req.usuario.role || '').toLowerCase();

    if (despachadorRol !== 'despachador' && despachadorRol !== 'admin' && despachadorRol !== 'ceo') {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Rol no autorizado para inyección logística.' });
    }

    if (!viajeId || !conductorId) {
        return res.status(400).json({ success: false, message: 'Identificadores de viaje y conductor obligatorios.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const conductor = await Conductor.findOneAndUpdate(
            { _id: conductorId, estadoOperativo: 'DISPONIBLE' },
            { $set: { estado: 'busy', estadoOperativo: 'OCUPADO', viajeActualId: String(viajeId) } },
            { new: true, session }
        );

        if (!conductor) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({ success: false, message: 'El conductor objetivo ya no se encuentra en estado DISPONIBLE.' });
        }

        const updateMongoViaje = { 
            estado: 'asignado', 
            estadoViaje: 'asignado', 
            conductorId, 
            despachadorId 
        };
        
        if (tarifaFinal !== undefined) {
            updateMongoViaje.tarifa = parseFloat(tarifaFinal);
            updateMongoViaje.valor = parseFloat(tarifaFinal);
        }
        if (metodoPago !== undefined) updateMongoViaje.metodoPago = String(metodoPago);

        const viajeAsignado = await Viaje.findOneAndUpdate(
            { _id: viajeId, estado: { $in: ['solicitado', 'pending'] } },
            { $set: updateMongoViaje },
            { new: true, session }
        );

        if (!viajeAsignado) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({ success: false, message: 'El viaje ya ha sido tomado, asignado o revocado por otro hilo.' });
        }

        await session.commitTransaction();
        session.endSession();

        if (dbFirestore) {
            const viajeRef = dbFirestore.collection(FIRESTORE_PATHS.viajes || 'viajes').doc(String(viajeId));
            const conductorRef = dbFirestore.collection(FIRESTORE_PATHS.conductores || 'conductores').doc(String(conductorId));

            const actualizacionViajeFirebase = {
                estadoViaje: 'asignado',
                conductorId: String(conductorId),
                despachadorId: despachadorId,
                asignadoEn: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            };

            if (tarifaFinal !== undefined) {
                actualizacionViajeFirebase.tarifa = parseFloat(tarifaFinal);
                actualizacionViajeFirebase.valor = parseFloat(tarifaFinal);
            }
            if (metodoPago !== undefined) actualizacionViajeFirebase.metodoPago = String(metodoPago);

            Promise.all([
                viajeRef.set(actualizacionViajeFirebase, { merge: true }),
                conductorRef.update({
                    estado: 'busy',
                    estadoOperativo: 'OCUPADO',
                    viajeActualId: String(viajeId),
                    updatedAt: FieldValue.serverTimestamp()
                })
            ]).catch(firebaseError => {
                console.error("🚨 Error diferido de sincronización en Firebase Firestore:", firebaseError.message);
            });
        }

        return res.status(200).json({
            success: true,
            message: "Viaje interceptado, bloqueado y despachado de forma atómica bajo aislamiento ACID.",
            viajeId
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        console.error("❌ [CIMCO-ATOMIC-DISPATCH-ERR]:", error.message);
        return res.status(500).json({ success: false, message: 'Fallo crítico transaccional al ejecutar el despacho en andén.' });
    }
};

export default {
    crearYDespacharViajeAtomico,
    solicitarViaje,
    aceptarViaje,
    completarViaje,
    recibirAlertaWompiLocal,
    despacharViajeAtomico
};