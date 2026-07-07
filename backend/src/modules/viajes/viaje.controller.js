// Versión Arquitectura: V14.5 - Blindaje Transaccional Homólogo y Despacho Inmediato de Terminal
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.controller.js
 * Misión: Procesar flujos operativos, liquidación contable (10% comisión) y sincronización Firestore.
 * Ajuste V14.5: Consolidación de 'crearYDespacharViajeAtomico' e integración definitiva de la guarda 
 *               'estadoOperativo' ('DISPONIBLE'/'OCUPADO') en todas las mutaciones ACID.
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

    const { pasajeroId, origen, destino, origenTexto, destinoTexto, tarifa, metodoPago, conductorId } = req.body;

    if (!pasajeroId || !origen || !destino || !origenTexto || !destinoTexto || !tarifa || !conductorId) {
        return res.status(400).json({ success: false, message: 'Parámetros obligatorios incompletos para forzar el despacho atómico.' });
    }

    if (!req.usuario || !req.usuario.id) {
        return res.status(401).json({ success: false, message: 'Credenciales de operador ausentes en la terminal de despacho.' });
    }

    const despachadorId = String(req.usuario.id);
    const despachadorRol = String(req.usuario.rol || req.usuario.role || '').toLowerCase();

    if (despachadorRol !== 'despachador' && despachadorRol !== 'admin' && despachadorRol !== 'ceo') {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Su rol no cuenta con privilegios de asignación en andén.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Bloqueo transaccional utilizando el control estricto de estado operativo
        const conductor = await Conductor.findOne({ _id: conductorId }).session(session);
        if (!conductor) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'El conductor asignado no existe en la base de datos central.' });
        }

        if (conductor.estadoOperativo !== 'DISPONIBLE') {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({
                success: false,
                code: 'DRIVER_CONCURRENT_CONFLICT',
                message: 'Conflicto de despacho. El conductor ya se encuentra en estado OCUPADO o en ruta activa.'
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

        // 2. Inserción aislada del nuevo viaje asignado directamente
        const [nuevoViaje] = await Viaje.create([{
            pasajeroId,
            conductorId,
            despachadorId,
            origen,
            destino,
            origenTexto,
            destinoTexto,
            tarifa,
            valor: tarifa,
            metodoPago: metodoPago || 'EFECTIVO',
            estado: 'accepted',
            estadoViaje: 'aceptado'
        }], { session });

        // 3. Mutación inmediata del control semántico del conductor
        conductor.estado = 'busy';
        conductor.estadoOperativo = 'OCUPADO';
        conductor.viajeActualId = String(nuevoViaje._id);
        await conductor.save({ session });

        await session.commitTransaction();
        session.endSession();

        // 📡 Sincronización post-commit en Firebase Firestore
        if (dbFirestore) {
            const viajeRef = dbFirestore.collection(FIRESTORE_PATHS.viajes || 'viajes').doc(String(nuevoViaje._id));
            const conductorRef = dbFirestore.collection(FIRESTORE_PATHS.conductores || 'conductores').doc(String(conductorId));

            await Promise.all([
                viajeRef.set({
                    viajeId: String(nuevoViaje._id),
                    pasajeroId: String(pasajeroId),
                    conductorId: String(conductorId),
                    despachadorId: despachadorId,
                    origen,
                    destino,
                    origenTexto,
                    destinoTexto,
                    tarifa: parseFloat(tarifa),
                    metodoPago: metodoPago || 'EFECTIVO',
                    estadoViaje: 'aceptado',
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                }),
                conductorRef.update({
                    estado: 'busy',
                    estadoOperativo: 'OCUPADO',
                    viajeActualId: String(nuevoViaje._id),
                    updatedAt: FieldValue.serverTimestamp()
                })
            ]).catch(e => console.error("🚨 Error diferido Firestore en creación atómica:", e));
        }

        return res.status(201).json({
            success: true,
            message: "Viaje intermunicipal creado e inyectado limpiamente bajo aislamiento ACID.",
            viajeId: nuevoViaje._id,
            data: nuevoViaje
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ [CIMCO-CREAR-DESPACHO-ERR]:", error.message);
        return res.status(500).json({ success: false, message: 'Fallo crítico transaccional al originar la orden de andén.' });
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

        const { pasajeroId, origen, destino, origenTexto, destinoTexto, tarifa, metodoPago } = req.body;

        if (!pasajeroId || !origen || !destino || !origenTexto || !destinoTexto || !tarifa) {
            return res.status(400).json({ success: false, message: 'Parámetros obligatorios incompletos para procesar despacho.' });
        }

        if (String(metodoPago).toUpperCase() === 'WALLET') {
            const pasajero = await Usuario.findById(pasajeroId).lean();
            if (!pasajero) {
                return res.status(404).json({ success: false, message: 'El perfil de pasajero no se encuentra en el sistema central.' });
            }

            const saldoDisponible = pasajero.saldo || pasajero.balance || 0;
            if (saldoDisponible < parseFloat(tarifa)) {
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
            tarifa,
            valor: tarifa,
            metodoPago: metodoPago || 'EFECTIVO',
            estado: 'solicitado',
            estadoViaje: 'solicitado'
        });

        if (dbFirestore && FIRESTORE_PATHS?.viajes) {
            await dbFirestore.collection(FIRESTORE_PATHS.viajes).doc(String(nuevoViaje._id)).set({
                viajeId: String(nuevoViaje._id),
                pasajeroId: String(pasajeroId),
                origen,
                destino,
                origenTexto,
                destinoTexto,
                tarifa: parseFloat(tarifa),
                metodoPago: metodoPago || 'EFECTIVO',
                estadoViaje: 'solicitado',
                conductorId: null,
                createdAt: FieldValue.serverTimestamp()
            });
        }

        // Búsqueda radial consumiendo de forma estricta el control semántico operativo
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
        const conductor = await Conductor.findOne({ _id: conductorId }).session(session);
        if (!conductor) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'El conductor especificado no existe en el sistema.' });
        }

        const saldoConductor = conductor.saldo || 0;
        if (saldoConductor < 2000) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Transacción rechazada. Saldo de billetera insuficiente ($${saldoConductor} COP). El mínimo requerido para aceptar servicios es $2,000 COP.`
            });
        }

        // 🛡️ VALIDACIÓN EN CALIENTE DEL CONTROL SEMÁNTICO OPERATIVO
        if (conductor.estadoOperativo !== 'DISPONIBLE') {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({
                success: false,
                code: 'DRIVER_BUSY_OR_OFFLINE',
                message: 'Operación declinada. El conductor ya se encuentra en estado OCUPADO o cambió su perfil operativo.'
            });
        }

        const viajeAsignado = await Viaje.findOneAndUpdate(
            { _id: viajeId, estado: 'solicitado' }, 
            { $set: { conductorId: conductorId, estado: 'accepted', estadoViaje: 'aceptado' } },
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

        // Mutación coordinada hacia OCUPADO
        conductor.estado = 'busy';
        conductor.estadoOperativo = 'OCUPADO';
        conductor.viajeActualId = String(viajeId);
        await conductor.save({ session });

        await session.commitTransaction();
        session.endSession();

        if (dbFirestore && FIRESTORE_PATHS?.viajes) {
            await dbFirestore.collection(FIRESTORE_PATHS.viajes).doc(String(viajeId)).update({
                conductorId: String(conductorId),
                estadoViaje: 'aceptado',
                updatedAt: FieldValue.serverTimestamp()
            }).catch(e => console.error("🚨 Error diferido Firestore al actualizar Viaje:", e));
        }

        if (dbFirestore && FIRESTORE_PATHS?.conductores) {
            await dbFirestore.collection(FIRESTORE_PATHS.conductores).doc(String(conductorId)).update({
                estado: 'busy',
                estadoOperativo: 'OCUPADO',
                viajeActualId: String(viajeId),
                updatedAt: FieldValue.serverTimestamp()
            }).catch(e => console.error("🚨 Error diferido Firestore al actualizar Conductor:", e));
        }

        return res.status(200).json({
            success: true,
            message: 'Servicio bloqueado y asignado a su terminal con éxito bajo aislamiento ACID.',
            data: viajeAsignado
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("🚨 [CIMCO-LOCK-ERR]: Fallo de concurrencia en hilos de base de datos:", error);
        return res.status(500).json({ success: false, message: 'Fallo de concurrencia en hilos de base de datos de asignación.' });
    }
};

// ==================================================================
// 3. SUBSISTEMA DE LIQUIDACIÓN Y CIERRE DE SERVICIOS (VERSIÓN ACID V14.5)
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

            // Liberación explícita del control operativo de vuelta a DISPONIBLE
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

            await HistorialSaldo.create([{
                conductorId,
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
// 5. DISTRIBUCIÓN LOGÍSTICA ATÓMICA (DESPACHADOR INTERMUNICIPAL DESDE EXISTENTE)
// ==================================================================
export const despacharViajeAtomico = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: 'Payload de despacho nulo o inválido.' });
        }

        const { viajeId, conductorId, tarifa, metodoPago } = req.body;
        
        if (!req.usuario || !req.usuario.id) {
            return res.status(401).json({ success: false, message: 'Credenciales de operador ausentes en la terminal.' });
        }

        const despachadorId = String(req.usuario.id); 
        const despachadorRol = String(req.usuario.rol || req.usuario.role).toLowerCase();

        if (despachadorRol !== 'despachador' && despachadorRol !== 'admin' && despachadorRol !== 'ceo') {
            return res.status(403).json({ success: false, message: 'Acceso denegado. Rol no autorizado para inyección logística.' });
        }

        if (!viajeId || !conductorId) {
            return res.status(400).json({ success: false, message: 'Identificadores de viaje y conductor obligatorios.' });
        }

        if (!dbFirestore) {
            throw new Error("Conexión con el motor de sincronización Firestore no disponible.");
        }

        const viajeRef = dbFirestore.collection(FIRESTORE_PATHS.viajes || 'viajes').doc(String(viajeId));
        const conductorRef = dbFirestore.collection(FIRESTORE_PATHS.conductores || 'conductores').doc(String(conductorId));

        await dbFirestore.runTransaction(async (transaction) => {
            const viajeDoc = await transaction.get(viajeRef);
            const conductorDoc = await transaction.get(conductorRef);

            if (!viajeDoc.exists) throw new Error("El viaje solicitado no existe en la matriz operativa.");
            if (!conductorDoc.exists) throw new Error("El conductor seleccionado no existe en el radar de la cooperativa.");

            const viajeData = viajeDoc.data();
            const conductorData = conductorDoc.data();

            const estadoActual = String(viajeData.estadoViaje || '').toLowerCase();
            if (estadoActual !== 'solicitado' && estadoActual !== 'pending') {
                throw new Error("El viaje ya ha sido tomado, asignado o revocado por el sistema.");
            }

            const estadoConductorSemantico = String(conductorData.estadoOperativo || '').toUpperCase();
            if (estadoConductorSemantico !== 'DISPONIBLE') {
                throw new Error("El conductor objetivo ya no se encuentra en estado DISPONIBLE en la terminal.");
            }

            const actualizacionViaje = {
                estadoViaje: 'asignado',
                conductorId: String(conductorId),
                despachadorId: despachadorId,
                asignadoEn: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            };

            if (tarifa !== undefined) {
                actualizacionViaje.tarifa = parseFloat(tarifa);
            }
            if (metodoPago !== undefined) {
                actualizacionViaje.metodoPago = String(metodoPago);
            }

            transaction.update(viajeRef, actualizacionViaje);

            transaction.update(conductorRef, {
                estado: 'busy',
                estadoOperativo: 'OCUPADO',
                viajeActualId: String(viajeId),
                updatedAt: FieldValue.serverTimestamp()
            });
        });

        const updateMongoViaje = { 
            estado: 'asignado', 
            estadoViaje: 'asignado', 
            conductorId, 
            despachadorId 
        };
        
        if (tarifa !== undefined) {
            updateMongoViaje.tarifa = parseFloat(tarifa);
            updateMongoViaje.valor = parseFloat(tarifa);
        }
        if (metodoPago !== undefined) {
            updateMongoViaje.metodoPago = String(metodoPago);
        }

        try {
            await Promise.all([
                Viaje.findOneAndUpdate(
                    { _id: viajeId, estado: { $ne: 'completado' } }, 
                    { $set: updateMongoViaje }
                ),
                Conductor.findOneAndUpdate(
                    { _id: conductorId }, 
                    { $set: { estado: 'busy', estadoOperativo: 'OCUPADO' } }
                )
            ]);
        } catch (mongoError) {
            console.error("🔥 [CRÍTICO] [CIMCO-DESCALCE-CONTABLE]: Error de sincronización diferida en MongoDB Atlas:", mongoError.message);
        }

        return res.status(200).json({
            success: true,
            message: "Viaje interceptado e inyectado exitosamente al conductor intermunicipal."
        });

    } catch (error) {
        console.error("❌ [CIMCO-ATOMIC-DISPATCH-ERR]:", error.message);
        return res.status(400).json({
            success: false,
            message: error.message || "Fallo crítico en el despacho atómico."
        });
    }
};