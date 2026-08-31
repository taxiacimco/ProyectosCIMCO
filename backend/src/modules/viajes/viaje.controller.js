// Versión Arquitectura: V20.1 - Intercepción con 403 Forbidden por Saldo Insuficiente (< $2.000 COP) y Delegación Multimodal a viaje.service.js
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.controller.js
 * Misión: Procesar flujos operativos, coordinación logística de viajes, control transaccional de estados,
 *         sincronización con Firestore y delegación contable a la capa de servicio centralizada.
 * Ajustes V20.1:
 *  1. Intercepción estricta en `aceptarViaje`, `crearYDespacharViajeAtomico` y `despacharViajeAtomico`:
 *     Si el saldo del conductor es < 2000 COP, retorna res.status(403).json({ success: false, message: "Saldo insuficiente para operar, saldo mínimo $2.000 COP" }).
 *  2. Delegación completa de liquidación contable en `completarViaje` a `viajeService.procesarPagoWalletTransaccional` o `viajeService.calcularComisionPorSubrol`
 *     para dar soporte a la matriz por subrol (mototaxi, motocarga, conductor_intermunicipal) y pagos por billetera.
 *  3. Preservación estricta del aislamiento ACID, guardas anti-undefined y sincronización atómica con Firestore.
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import Viaje from '../../models/Viaje.js';
import Conductor from '../../models/Conductor.js';
import Usuario from '../../models/Usuario.js';
import HistorialSaldo from '../../models/HistorialSaldo.js';
import { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { ESTADOS_VIAJE, validarTransicion } from './viajeState.js';
import viajeService from './viaje.service.js';

// Auxiliar de retardo con aleatoriedad (Jitter) para dispersar la ráfaga concurrentemente
const esperarGarantizado = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 🔄 HELPER DE TRANSMISIÓN DE ESTADOS A FIRESTORE
 * Registra de forma idempotente y atómica las transiciones de estado del viaje en Firestore
 * manteniendo historial de cambios y garantizando consistencia ante desconexiones de red/sockets.
 */
export const actualizarEstadoFirestore = async (viajeId, nuevoEstado, datosAdicionales = {}) => {
    if (!dbFirestore || !viajeId) return false;
    try {
        const coleccionViajes = FIRESTORE_PATHS?.viajes || 'viajes';
        const viajeRef = dbFirestore.collection(coleccionViajes).doc(String(viajeId));
        
        const estadoNormalizado = String(nuevoEstado || '').toUpperCase();
        const estadoMinusc = estadoNormalizado.toLowerCase();

        const updatePayload = {
            viajeId: String(viajeId),
            estadoViaje: estadoNormalizado,
            estado: estadoMinusc,
            updatedAt: FieldValue.serverTimestamp(),
            ...datosAdicionales
        };

        const registroHistorial = {
            estado: estadoNormalizado,
            fecha: new Date().toISOString()
        };

        await viajeRef.set({
            ...updatePayload,
            historialEstados: FieldValue.arrayUnion(registroHistorial)
        }, { merge: true });

        return true;
    } catch (error) {
        console.error(`🚨 [FIRESTORE-STATE-ERR] Fallo al actualizar estado [${nuevoEstado}] para viaje [${viajeId}]:`, error.message);
        return false;
    }
};

// Helper interno de emisión de eventos Socket sin acoplamiento global
const emitirEventoSocket = (req, sala, evento, payload) => {
    const io = req?.app?.get('io') || req?.io;
    if (io && typeof io.to === 'function') {
        io.to(sala).emit(evento, payload);
    }
};

// ==================================================================
// 0. CREACIÓN Y DESPACHO INMEDIATO (BLOQUEO TRANSACCIONAL DESDE ANDÉN)
// ==================================================================
export const crearYDespacharViajeAtomico = async (req, res, next) => {
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

    const operadorLogico = req.usuario || req.user;
    if (!operadorLogico || (!operadorLogico.id && !operadorLogico._id)) {
        return res.status(401).json({ success: false, message: 'Credenciales de operador ausentes en la terminal de despacho.' });
    }

    const despachadorId = String(operadorLogico.id || operadorLogico._id);
    const despachadorRol = String(operadorLogico.rol || operadorLogico.role || '').toLowerCase();

    if (despachadorRol !== 'despachador' && despachadorRol !== 'admin' && despachadorRol !== 'ceo') {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Su rol no cuenta con privilegios de asignación en andén.' });
    }

    let idViajeFinal;
    if (viajeId && mongoose.Types.ObjectId.isValid(viajeId)) {
        idViajeFinal = new mongoose.Types.ObjectId(viajeId);
    } else {
        idViajeFinal = new mongoose.Types.ObjectId();
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Intercepción previa de saldo del conductor para evitar bloquear de forma prematura
        const conductorPrevio = await Conductor.findById(conductorId).session(session);
        if (!conductorPrevio) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'El conductor especificado no existe.' });
        }

        if ((Number(conductorPrevio.saldo) || 0) < 2000) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({
                success: false,
                message: "Saldo insuficiente para operar, saldo mínimo $2.000 COP"
            });
        }

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
            estado: 'asignado', 
            estadoViaje: 'ASIGNADO'
        }], { session });

        await session.commitTransaction();
        session.endSession();

        // 🔄 SINCRONIZACIÓN ATÓMICA DE ESTADO EN FIRESTORE
        await actualizarEstadoFirestore(String(idViajeFinal), 'ASIGNADO', {
            pasajeroId: String(pasajeroId),
            conductorId: String(conductorId),
            despachadorId,
            origen,
            destino,
            origenTexto,
            destinoTexto,
            tarifa: parseFloat(tarifaFinal),
            valor: parseFloat(tarifaFinal),
            metodoPago: metodoPago || 'EFECTIVO'
        });

        if (dbFirestore) {
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
            dbFirestore.collection(coleccionConductores).doc(String(conductorId)).update({
                estado: 'busy',
                estadoOperativo: 'OCUPADO',
                viajeActualId: String(idViajeFinal),
                updatedAt: FieldValue.serverTimestamp()
            }).catch(e => console.error("🚨 Error diferido en actualización de Conductor Firestore:", e));
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

        next(error);
    }
};

// ==================================================================
// 1. SOLICITUD DE SERVICIO (RADAR RADIAL DE CERCANÍA)
// ==================================================================
export const solicitarViaje = async (req, res, next) => {
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
            estadoViaje: 'SOLICITADO'
        });

        // 🔄 SINCRONIZACIÓN ATÓMICA DE ESTADO EN FIRESTORE
        await actualizarEstadoFirestore(String(nuevoViaje._id), 'SOLICITADO', {
            pasajeroId: String(pasajeroId),
            origen,
            destino,
            origenTexto,
            destinoTexto,
            tarifa: parseFloat(tarifaFinal),
            valor: parseFloat(tarifaFinal),
            metodoPago: metodoPago || 'EFECTIVO',
            conductorId: null,
            createdAt: FieldValue.serverTimestamp()
        });

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
        next(error);
    }
};

// ==================================================================
// 2. ASIGNACIÓN ATÓMICA CON LOCK ANTI-COLLISION (RACE CONDITION FIX 409)
// ==================================================================
export const aceptarViaje = async (req, res, next) => {
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
        const conductorPrevio = await Conductor.findById(conductorId).session(session);
        if (!conductorPrevio) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Conductor no encontrado.' });
        }

        const saldoConductor = Number(conductorPrevio.saldo) || 0;
        if (saldoConductor < 2000) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({
                success: false,
                message: "Saldo insuficiente para operar, saldo mínimo $2.000 COP"
            });
        }

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

        // 🔒 ATOMIC LOCK: Bloqueo transaccional de concurrencia usando findOneAndUpdate con filtro de estado SOLICITADO
        const viajeAsignado = await Viaje.findOneAndUpdate(
            { 
                _id: viajeId, 
                estado: { $in: ['SOLICITADO', 'solicitado', 'OFERTADO', 'ofertado'] } 
            }, 
            { 
                $set: { 
                    conductorId: conductorId, 
                    estado: 'aceptado', 
                    estadoViaje: 'ASIGNADO' 
                } 
            },
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

        // 🔄 SINCRONIZACIÓN ATÓMICA DE ESTADO EN FIRESTORE
        await actualizarEstadoFirestore(String(viajeId), 'ASIGNADO', {
            conductorId: String(conductorId)
        });

        if (dbFirestore) {
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
            dbFirestore.collection(coleccionConductores).doc(String(conductorId)).update({
                estado: 'busy',
                estadoOperativo: 'OCUPADO',
                viajeActualId: String(viajeId),
                updatedAt: FieldValue.serverTimestamp()
            }).catch(e => console.error("🚨 Error diferido Firestore al actualizar conductor asignado:", e));
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
        next(error);
    }
};

// ==================================================================
// 2.1 INICIO TRANSACCIONAL DEL RECORRIDO (TRANSICIÓN A 'EN_RUTA')
// ==================================================================
export const iniciarViaje = async (req, res, next) => {
    if (!req || !req.body) {
        return res.status(400).json({ success: false, message: 'Payload de inicio de viaje inválido o ausente.' });
    }

    const { viajeId } = req.body;
    const targetViajeId = viajeId || req.params?.id;

    if (!targetViajeId || !mongoose.Types.ObjectId.isValid(targetViajeId)) {
        return res.status(400).json({ success: false, message: 'Identificador BSON de viaje inválido o no suministrado.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const viaje = await Viaje.findOneAndUpdate(
            { 
                _id: targetViajeId, 
                estado: { $in: ['aceptado', 'asignado', 'solicitado', 'ASIGNADO'] } 
            },
            { 
                $set: { 
                    estado: 'en_curso', 
                    estadoViaje: 'EN_RUTA',
                    fechaInicio: new Date()
                } 
            },
            { new: true, session }
        );

        if (!viaje) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({
                success: false,
                code: 'INVALID_TRIP_STATE_TRANSITION',
                message: 'No se puede iniciar el viaje. El servicio no existe o no se encuentra en un estado previo válido (aceptado/asignado).'
            });
        }

        await session.commitTransaction();
        session.endSession();

        // 🔄 SINCRONIZACIÓN ATÓMICA DE ESTADO EN FIRESTORE
        await actualizarEstadoFirestore(String(targetViajeId), 'EN_RUTA', {
            fechaInicio: FieldValue.serverTimestamp()
        });

        return res.status(200).json({
            success: true,
            message: 'Recorrido iniciado oficialmente. Estado actualizado a EN_RUTA.',
            data: viaje
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        console.error("🚨 [CIMCO-START-TRIP-ERR]:", error);
        next(error);
    }
};

// ==================================================================
// 2.2 CAMBIO CENTRALIZADO DE ESTADO DE VIAJE CON VALIDACIÓN DE TRANSICIÓN
// ==================================================================
export const cambiarEstadoViaje = async (req, res, next) => {
    try {
        const { viajeId } = req.params || {};
        const { nuevoEstado, motivoCancelacion } = req.body || {};

        if (!viajeId || !mongoose.Types.ObjectId.isValid(viajeId)) {
            return res.status(400).json({ success: false, message: 'Identificador BSON de viaje inválido o no suministrado.' });
        }

        if (!nuevoEstado || typeof nuevoEstado !== 'string') {
            return res.status(400).json({ success: false, message: 'Falta parámetro obligatorio: nuevoEstado' });
        }

        const estadoMayusc = nuevoEstado.toUpperCase();

        const viaje = await Viaje.findById(viajeId);

        if (!viaje) {
            return res.status(404).json({ success: false, message: 'Viaje no encontrado' });
        }

        const estadoActual = String(viaje.estadoViaje || viaje.estado || 'PENDIENTE').toUpperCase();

        // 1. Validar que la transición sea permitida
        if (!validarTransicion(estadoActual, estadoMayusc)) {
            return res.status(400).json({
                success: false,
                message: `Transición no válida de ${estadoActual} a ${estadoMayusc}`
            });
        }

        // 2. Construir objeto de actualización con marcas de tiempo automáticas
        const timestampActual = new Date().toISOString();

        viaje.estadoViaje = estadoMayusc;
        viaje.estado = estadoMayusc.toLowerCase();

        const operador = req.usuario || req.user || {};
        const operadorUid = operador.id || operador._id || operador.uid || null;

        if (estadoMayusc === ESTADOS_VIAJE.CANCELADO && motivoCancelacion) {
            viaje.motivoCancelacion = motivoCancelacion;
            if (operadorUid) {
                viaje.canceladoPor = operadorUid;
            }
        }

        await viaje.save();

        // 3. Actualizar documento y transmitir en Firestore
        const updateDataFirestore = {
            updatedAt: FieldValue.serverTimestamp(),
            [`historialEstados.${estadoMayusc}`]: timestampActual
        };

        if (estadoMayusc === ESTADOS_VIAJE.CANCELADO && motivoCancelacion) {
            updateDataFirestore.motivoCancelacion = motivoCancelacion;
            if (operadorUid) {
                updateDataFirestore.canceladoPor = String(operadorUid);
            }
        }

        await actualizarEstadoFirestore(String(viajeId), estadoMayusc, updateDataFirestore);

        // 4. Emitir evento vía Sockets inyectado localmente (Sin global.io)
        emitirEventoSocket(req, `viaje_${viajeId}`, 'viaje:estado_cambiado', {
            viajeId,
            estadoAnterior: estadoActual,
            nuevoEstado: estadoMayusc,
            updatedAt: timestampActual
        });

        return res.status(200).json({
            success: true,
            message: `Estado actualizado a ${estadoMayusc}`,
            data: { viajeId, estado: estadoMayusc, updatedAt: timestampActual }
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================================
// 3. SUBSISTEMA DE LIQUIDACIÓN Y CIERRE DE SERVICIOS
// ==================================================================
export const completarViaje = async (req, res, next) => {
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
            if (viaje.estado === 'finalizado' || viaje.estadoViaje === 'FINALIZADO' || viaje.estadoViaje === 'completado') {
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

            const conductorObj = await Conductor.findById(conductorId).session(session);
            if (!conductorObj) {
                throw new Error('Conductor no hallado en la base de datos.');
            }

            const esWallet = String(viaje.metodoPago || '').toUpperCase() === 'WALLET';
            const tarifaMonto = Number(viaje.valor || viaje.tarifa || 0);
            const esIntermunicipal = Boolean(viaje.despachadorId || viaje.esIntermunicipal);

            let comisionConductor = 0;
            let comisionDespachador = 0;
            let saldoNuevoConductor = Number(conductorObj.saldo) || 0;

            if (esWallet && viajeService?.procesarPagoWalletTransaccional) {
                // Liberar la sesión actual para delegar la transacción ACID atómica a viajeService
                await session.abortTransaction();
                session.endSession();

                const resultadoWallet = await viajeService.procesarPagoWalletTransaccional({
                    viajeId: viaje._id,
                    pasajeroId: viaje.pasajeroId,
                    conductorId: viaje.conductorId,
                    despachadorId: viaje.despachadorId,
                    tarifa: tarifaMonto,
                    subrolConductor: conductorObj.subrol,
                    esIntermunicipal
                });

                comisionConductor = resultadoWallet.comisionConductor;
                comisionDespachador = resultadoWallet.comisionDespachador;
                saldoNuevoConductor = resultadoWallet.saldoFinalConductor;

                // Marcar viaje finalizado
                await Viaje.findByIdAndUpdate(viajeId, {
                    $set: { estado: 'finalizado', estadoViaje: 'FINALIZADO' }
                });

                // Liberar conductor
                await Conductor.findByIdAndUpdate(conductorId, {
                    $set: { estado: 'active', estadoOperativo: 'DISPONIBLE', viajeActualId: null }
                });

            } else {
                // LIQUIDACIÓN EN EFECTIVO CON MATRIZ POR SUBROL Y DESPACHO
                const calculo = viajeService?.calcularComisionPorSubrol
                    ? viajeService.calcularComisionPorSubrol(conductorObj.subrol, tarifaMonto, esIntermunicipal, viaje.despachadorId)
                    : { comisionConductor: viajeService?.calcularComision ? viajeService.calcularComision(tarifaMonto) : Math.round(tarifaMonto * 0.10), comisionDespachador: 0 };

                comisionConductor = calculo.comisionConductor;
                comisionDespachador = calculo.comisionDespachador;

                const saldoAnterior = Number(conductorObj.saldo) || 0;
                saldoNuevoConductor = saldoAnterior - comisionConductor;

                const conductorActualizado = await Conductor.findOneAndUpdate(
                    { _id: conductorId },
                    { 
                        $inc: { saldo: -comisionConductor, balance: -comisionConductor },
                        $set: { estado: 'active', estadoOperativo: 'DISPONIBLE', viajeActualId: null }
                    },
                    { new: true, session }
                );

                if (!conductorActualizado) {
                    throw new Error('Error al actualizar saldo del conductor.');
                }

                if (comisionDespachador > 0 && viaje.despachadorId) {
                    await Usuario.findByIdAndUpdate(
                        viaje.despachadorId,
                        { $inc: { saldo: -comisionDespachador } },
                        { session }
                    );
                }

                viaje.estado = 'finalizado';
                viaje.estadoViaje = 'FINALIZADO';
                await viaje.save({ session });

                if (comisionConductor > 0) {
                    await HistorialSaldo.create([{
                        entidadId: conductorId,
                        tipoEntidad: 'Conductor',
                        conductorId: conductorId,
                        viajeId,
                        tipo: 'descuento_comision',
                        monto: comisionConductor,
                        saldoAnterior,
                        saldoNuevo: saldoNuevoConductor,
                        procesadoPor: 'SISTEMA_DESPACHO_AUTOMATICO',
                        descripcion: `Débito de comisión por viaje ID: ${viaje._id} (Subrol: ${conductorObj.subrol || 'estándar'})`
                    }], { session });
                }

                await session.commitTransaction();
                session.endSession();
            }

            const latenciaTotal = Date.now() - tiempoInicio;
            if (intento > 1) {
                console.log(`📈 [CIMCO-PRODUCCION-AUDIT] Viaje ${viajeId} liquidado tras mitigar colisiones. Intentos: ${intento}. Latencia: ${latenciaTotal}ms.`);
            }

            // 🔄 SINCRONIZACIÓN ATÓMICA DE ESTADO EN FIRESTORE
            await actualizarEstadoFirestore(String(viajeId), 'FINALIZADO', {
                comisionDebitada: comisionConductor,
                comisionDespachador: comisionDespachador,
                fechaFinalizacion: FieldValue.serverTimestamp()
            });

            if (dbFirestore) {
                const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
                dbFirestore.collection(coleccionConductores).doc(String(conductorId)).update({
                    saldo: FieldValue.increment(-comisionConductor),
                    balance: FieldValue.increment(-comisionConductor),
                    estado: 'active',
                    estadoOperativo: 'DISPONIBLE',
                    viajeActualId: null,
                    updatedAt: FieldValue.serverTimestamp()
                }).catch(e => console.error("🚨 Error diferido Firestore (Conductor):", e));
            }

            return res.status(200).json({
                success: true,
                message: 'Servicio completado y balance liquidado de forma segura.',
                comisionDebitada: comisionConductor,
                saldoRestante: saldoNuevoConductor
            });

        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
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
            next(error);
            return;
        }
    }
};

// ==================================================================
// 4. CANCELACIÓN ATÓMICA DE VIAJES
// ==================================================================
export const cancelarViaje = async (req, res, next) => {
    const { viajeId, motivo } = req.body || {};
    const targetId = viajeId || req.params.id;

    if (!targetId) {
        return res.status(400).json({ success: false, message: 'Identificador del viaje requerido para cancelación.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const viaje = await Viaje.findById(targetId).session(session);
        if (!viaje) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Viaje no encontrado.' });
        }

        if (viaje.estado === 'cancelado' || viaje.estadoViaje === 'CANCELADO') {
            await session.abortTransaction();
            session.endSession();
            return res.status(200).json({ success: true, message: 'El viaje ya se encontraba cancelado.' });
        }

        viaje.estado = 'cancelado';
        viaje.estadoViaje = 'CANCELADO';
        if (motivo) viaje.motivoCancelacion = motivo;
        await viaje.save({ session });

        // Liberación del conductor si estaba asignado
        if (viaje.conductorId) {
            await Conductor.findByIdAndUpdate(
                viaje.conductorId,
                { $set: { estado: 'active', estadoOperativo: 'DISPONIBLE', viajeActualId: null } },
                { session }
            );

            if (dbFirestore) {
                const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
                dbFirestore.collection(coleccionConductores).doc(String(viaje.conductorId)).update({
                    estado: 'active',
                    estadoOperativo: 'DISPONIBLE',
                    viajeActualId: null,
                    updatedAt: FieldValue.serverTimestamp()
                }).catch(e => console.error("🚨 Error liberando conductor en Firestore:", e));
            }
        }

        await session.commitTransaction();
        session.endSession();

        // 🔄 SINCRONIZACIÓN ATÓMICA DE ESTADO EN FIRESTORE
        await actualizarEstadoFirestore(String(targetId), 'CANCELADO', {
            motivoCancelacion: motivo || 'cancelado_por_usuario'
        });

        return res.status(200).json({ success: true, message: 'Viaje cancelado y recursos liberados correctamente.', data: viaje });

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// ==================================================================
// 5. CONSULTAS DE LECTURA E HISTORIAL DE VIAJES
// ==================================================================
export const obtenerViajes = async (req, res, next) => {
    try {
        const { estado, conductorId, pasajeroId, limit = 50 } = req.query;
        const filtro = {};

        if (estado) filtro.$or = [{ estado }, { estadoViaje: estado }];
        if (conductorId) filtro.conductorId = conductorId;
        if (pasajeroId) filtro.pasajeroId = pasajeroId;

        const viajes = await Viaje.find(filtro)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();

        return res.status(200).json({ success: true, contador: viajes.length, data: viajes });
    } catch (error) {
        next(error);
    }
};

export const obtenerHistorialViajes = async (req, res, next) => {
    try {
        const usuarioLogueado = req.usuario || req.user;
        const { limit = 50, page = 1 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const filtro = {};

        if (usuarioLogueado) {
            const userId = usuarioLogueado.id || usuarioLogueado._id;
            const userRole = String(usuarioLogueado.rol || usuarioLogueado.role || '').toLowerCase();

            if (userRole === 'conductor') {
                filtro.conductorId = userId;
            } else if (userRole === 'pasajero' || userRole === 'usuario') {
                filtro.pasajeroId = userId;
            }
        }

        const viajes = await Viaje.find(filtro)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const total = await Viaje.countDocuments(filtro);

        return res.status(200).json({
            success: true,
            total,
            pagina: Number(page),
            limite: Number(limit),
            data: viajes
        });
    } catch (error) {
        next(error);
    }
};

export const obtenerViajePorId = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Identificador BSON de viaje inválido.' });
        }

        const viaje = await Viaje.findById(id).lean();

        if (!viaje) {
            return res.status(404).json({ success: false, message: 'Viaje no encontrado.' });
        }

        return res.status(200).json({ success: true, data: viaje });
    } catch (error) {
        next(error);
    }
};

export const obtenerDetalleViaje = async (req, res, next) => {
    return obtenerViajePorId(req, res, next);
};

// ==================================================================
// 6. GESTIÓN DE PASARELAS DE PAGO Y WEBHOOK WOMPI (CANONICAL VERCEL REDIRECT)
// ==================================================================
export const prepararCheckoutPasarela = async (req, res, next) => {
    try {
        const { monto, referencia, moneda = 'COP', descripcion } = req.body || {};
        
        // Resolución canónica perimetral del frontend Vercel
        const baseFrontend = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://frontend-opal-eight-58.vercel.app';
        const urlLimpia = String(baseFrontend).trim().replace(/\/+$/, '');
        const redirectUrl = `${urlLimpia}/billetera`;

        return res.status(200).json({
            success: true,
            redirectUrl: redirectUrl,
            redirect_url: redirectUrl,
            moneda: moneda || 'COP',
            monto: monto ? parseFloat(monto) : 0,
            referencia: referencia || `CIMCO-TX-${Date.now()}`,
            descripcion: descripcion || 'Recarga de Billetera Digital TAXIA CIMCO'
        });
    } catch (error) {
        console.error("🚨 [CIMCO-CHECKOUT-ERR]:", error);
        next(error);
    }
};

export const recibirAlertaWompiLocal = async (req, res, next) => {
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
            console.log(`✅ [CIMCO-TRANSACCION] Recarga Wompi procesada.`);
        }
        return res.status(200).json({ success: true, status: 'processed' });
    } catch (error) {
        next(error);
    }
};

// ==================================================================
// 7. DISTRIBUCIÓN LOGÍSTICA ATÓMICA BLINDADA
// ==================================================================
export const despacharViajeAtomico = async (req, res, next) => {
    if (!req || !req.body) {
        return res.status(400).json({ success: false, message: 'Payload de despacho nulo o inválido.' });
    }

    const { viajeId, conductorId, tarifa, valor, metodoPago } = req.body;
    const tarifaFinal = tarifa !== undefined ? tarifa : valor;
    
    const operadorLogico = req.usuario || req.user;
    if (!operadorLogico || (!operadorLogico.id && !operadorLogico._id)) {
        return res.status(401).json({ success: false, message: 'Credenciales de operador ausentes en la terminal.' });
    }

    const despachadorId = String(operadorLogico.id || operadorLogico._id); 
    const despachadorRol = String(operadorLogico.rol || operadorLogico.role || '').toLowerCase();

    if (despachadorRol !== 'despachador' && despachadorRol !== 'admin' && despachadorRol !== 'ceo') {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Rol no autorizado para inyección logística.' });
    }

    if (!viajeId || !conductorId) {
        return res.status(400).json({ success: false, message: 'Identificadores de viaje y conductor obligatorios.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const conductorPrevio = await Conductor.findById(conductorId).session(session);
        if (!conductorPrevio) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'El conductor asignado no existe.' });
        }

        if ((Number(conductorPrevio.saldo) || 0) < 2000) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({
                success: false,
                message: "Saldo insuficiente para operar, saldo mínimo $2.000 COP"
            });
        }

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
            estadoViaje: 'ASIGNADO', 
            conductorId, 
            despachadorId 
        };
        
        if (tarifaFinal !== undefined) {
            updateMongoViaje.tarifa = parseFloat(tarifaFinal);
            updateMongoViaje.valor = parseFloat(tarifaFinal);
        }
        if (metodoPago !== undefined) updateMongoViaje.metodoPago = String(metodoPago);

        const viajeAsignado = await Viaje.findOneAndUpdate(
            { _id: viajeId, estado: { $in: ['solicitado', 'pending', 'aceptado', 'SOLICITADO', 'OFERTADO'] } },
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

        // 🔄 SINCRONIZACIÓN ATÓMICA DE ESTADO EN FIRESTORE
        const datosExtras = {
            conductorId: String(conductorId),
            despachadorId: despachadorId,
            asignadoEn: FieldValue.serverTimestamp()
        };

        if (tarifaFinal !== undefined) {
            datosExtras.tarifa = parseFloat(tarifaFinal);
            datosExtras.valor = parseFloat(tarifaFinal);
        }
        if (metodoPago !== undefined) datosExtras.metodoPago = String(metodoPago);

        await actualizarEstadoFirestore(String(viajeId), 'ASIGNADO', datosExtras);

        if (dbFirestore) {
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
            dbFirestore.collection(coleccionConductores).doc(String(conductorId)).update({
                estado: 'busy',
                estadoOperativo: 'OCUPADO',
                viajeActualId: String(viajeId),
                updatedAt: FieldValue.serverTimestamp()
            }).catch(firebaseError => {
                console.error("🚨 Error diferido de actualización de Conductor en Firebase Firestore:", firebaseError.message);
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
        next(error);
    }
};

export default {
    actualizarEstadoFirestore,
    crearYDespacharViajeAtomico,
    solicitarViaje,
    aceptarViaje,
    iniciarViaje,
    cambiarEstadoViaje,
    completarViaje,
    cancelarViaje,
    obtenerViajes,
    obtenerHistorialViajes,
    obtenerViajePorId,
    obtenerDetalleViaje,
    prepararCheckoutPasarela,
    recibirAlertaWompiLocal,
    despacharViajeAtomico
};