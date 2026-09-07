// Versión Arquitectura: V2.1 - Transacciones Atómicas Mongoose ACID para Finalización de Viajes, Sincronización de Saldos y Débitos de Comisión
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.service.js
 * Misión: Abstraer la lógica contable centralizada, matriz de comisiones por subrol y ejecución de transacciones
 * ACID con Mongoose Session para cobros/abonos en la billetera de Pasajeros, Conductores y Despachadores.
 * Integridad: Fusión Atómica. Mantiene retrocompatibilidad con `calcularComision` y `procesarPagoWalletTransaccional`
 * previos e implementa el protocolo transaccional de finalización de viajes anti-saldos negativos.
 */

import mongoose from 'mongoose';
import Conductor from '../../models/Conductor.js';
import Pasajero from '../../models/Pasajero.js';
import Usuario from '../../models/Usuario.js';
import Viaje from '../../models/Viaje.js';
import HistorialSaldo from '../../models/HistorialSaldo.js';

/**
 * 📊 MATRIZ DE COMISIONES POR SUBROL Y TIPOLOGÍA DE SERVICIO
 * @param {string} subrol - Subrol del conductor ('mototaxi', 'motoparrillero', 'motocarga', 'conductor_intermunicipal')
 * @param {number} tarifa - Valor total del viaje en COP
 * @param {boolean} esIntermunicipal - Flag de servicio intermunicipal
 * @param {string|null} despachadorId - Identificador del despachador si asignó la ruta
 * @returns {object} { comisionConductor: number, comisionDespachador: number }
 */
export const calcularComisionPorSubrol = (subrol, tarifa, esIntermunicipal = false, despachadorId = null) => {
    const tarifaNumerica = Number(tarifa);
    if (isNaN(tarifaNumerica) || tarifaNumerica <= 0) {
        return { comisionConductor: 0, comisionDespachador: 0 };
    }

    const subrolNormalizado = String(subrol || '').toLowerCase().trim();

    // 1️⃣ CONDUCTOR INTERMUNICIPAL
    if (subrolNormalizado === 'conductor_intermunicipal' || esIntermunicipal) {
        return {
            comisionConductor: 0,
            comisionDespachador: despachadorId ? 500 : 0
        };
    }

    // 2️⃣ MOTOCARGA: $500 COP Fijos
    if (subrolNormalizado === 'motocarga') {
        return {
            comisionConductor: 500,
            comisionDespachador: 0
        };
    }

    // 3️⃣ MOTOTAXI / MOTOPARRILLERO (o por defecto): 10% de la tarifa
    const comisionCalculada = Math.round(tarifaNumerica * 0.10);
    return {
        comisionConductor: comisionCalculada,
        comisionDespachador: 0
    };
};

/**
 * 🔒 COMPATIBILIDAD HEREDADA
 */
export const calcularComision = (valorReferencia) => {
    if (!valorReferencia || isNaN(valorReferencia)) return 0;
    return Math.round(parseFloat(valorReferencia) * 0.10);
};

/**
 * 🛡️ PROCESAMIENTO ACID TRANSACCIONAL PARA PAGOS CON WALLET
 * Modela el flujo contable atómico:
 *   1. Débito a la Billetera del Pasajero (Tarifa completa)
 *   2. Abono a la Billetera del Conductor (Tarifa completa)
 *   3. Cobro de Comisión al Conductor (Según matriz por subrol)
 *   4. Cobro de Comisión al Despachador (Si aplica por viaje intermunicipal asignado)
 *   5. Registro inmutable en HistorialSaldo para auditoría contable
 */
export const procesarPagoWalletTransaccional = async ({
    viajeId,
    pasajeroId,
    conductorId,
    despachadorId = null,
    tarifa,
    subrolConductor,
    esIntermunicipal = false
}) => {
    const tarifaMonto = Number(tarifa);
    if (isNaN(tarifaMonto) || tarifaMonto <= 0) {
        throw new Error('⚠️ La tarifa del viaje debe ser un monto numérico positivo.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. VALIDAR Y DEBITAR PASAJERO
        const pasajero = await Pasajero.findById(pasajeroId).session(session);
        if (!pasajero) {
            throw new Error(`⚠️ Pasajero con ID ${pasajeroId} no encontrado.`);
        }

        const saldoPasajeroActual = Number(pasajero.saldo) || 0;
        if (saldoPasajeroActual < tarifaMonto) {
            throw new Error(`⚠️ Saldo insuficiente en la billetera del pasajero ($${saldoPasajeroActual} COP). Requerido: $${tarifaMonto} COP.`);
        }

        const nuevoSaldoPasajero = saldoPasajeroActual - tarifaMonto;
        pasajero.saldo = nuevoSaldoPasajero;
        await pasajero.save({ session });

        await HistorialSaldo.create([{
            entidadId: pasajero._id,
            tipoEntidad: 'Usuario',
            viajeId,
            tipo: 'descuento_comision',
            monto: tarifaMonto,
            saldoAnterior: saldoPasajeroActual,
            saldoNuevo: nuevoSaldoPasajero,
            procesadoPor: 'SISTEMA_WALLET',
            descripcion: `Pago de viaje #${viajeId} descontado de billetera.`
        }], { session });

        // 2. VALIDAR Y ABONAR CONDUCTOR (Tarifa Completa)
        const conductor = await Conductor.findById(conductorId).session(session);
        if (!conductor) {
            throw new Error(`⚠️ Conductor con ID ${conductorId} no encontrado.`);
        }

        const saldoConductorInicial = Number(conductor.saldo) || 0;
        let saldoConductorAcumulado = saldoConductorInicial + tarifaMonto;

        await HistorialSaldo.create([{
            entidadId: conductor._id,
            tipoEntidad: 'Conductor',
            conductorId: conductor._id,
            viajeId,
            tipo: 'recarga',
            monto: tarifaMonto,
            saldoAnterior: saldoConductorInicial,
            saldoNuevo: saldoConductorAcumulado,
            procesadoPor: 'SISTEMA_WALLET',
            descripcion: `Abono por tarifa cobrada en viaje #${viajeId}.`
        }], { session });

        // 3. MATRIZ DE COMISIONES Y DEDUCCIONES ATÓMICAS
        const { comisionConductor, comisionDespachador } = calcularComisionPorSubrol(
            subrolConductor || conductor.subrol,
            tarifaMonto,
            esIntermunicipal,
            despachadorId
        );

        // Deducción al Conductor si aplica comisión
        if (comisionConductor > 0) {
            const saldoConductorPreComision = saldoConductorAcumulado;
            saldoConductorAcumulado -= comisionConductor;

            await HistorialSaldo.create([{
                entidadId: conductor._id,
                tipoEntidad: 'Conductor',
                conductorId: conductor._id,
                viajeId,
                tipo: 'descuento_comision',
                monto: comisionConductor,
                saldoAnterior: saldoConductorPreComision,
                saldoNuevo: saldoConductorAcumulado,
                procesadoPor: 'SISTEMA_WALLET',
                descripcion: `Cobro de comisión por viaje #${viajeId} (Subrol: ${subrolConductor || conductor.subrol}).`
            }], { session });
        }

        conductor.saldo = saldoConductorAcumulado;
        await conductor.save({ session });

        // 4. DEDUCCIÓN A DESPACHADOR (Servicios Intermunicipales asignados)
        if (comisionDespachador > 0 && despachadorId) {
            const despachador = await Usuario.findById(despachadorId).session(session);
            if (despachador) {
                const saldoDespachadorActual = Number(despachador.saldo) || 0;
                const nuevoSaldoDespachador = Math.max(0, saldoDespachadorActual - comisionDespachador);
                despachador.saldo = nuevoSaldoDespachador;
                await despachador.save({ session });

                await HistorialSaldo.create([{
                    entidadId: despachador._id,
                    tipoEntidad: 'Usuario',
                    viajeId,
                    tipo: 'descuento_comision',
                    monto: comisionDespachador,
                    saldoAnterior: saldoDespachadorActual,
                    saldoNuevo: nuevoSaldoDespachador,
                    procesadoPor: 'SISTEMA_WALLET',
                    descripcion: `Comisión de asignación de viaje intermunicipal #${viajeId}.`
                }], { session });
            }
        }

        await session.commitTransaction();
        session.endSession();

        return {
            exito: true,
            tarifa: tarifaMonto,
            comisionConductor,
            comisionDespachador,
            saldoFinalPasajero: nuevoSaldoPasajero,
            saldoFinalConductor: saldoConductorAcumulado
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

/**
 * ⚡ FINALIZACIÓN TRANSACCIONAL ATÓMICA DE VIAJES Y SINCRONIZACIÓN DE SALDOS
 * Garantiza la coherencia contable al concluir un servicio:
 *  - En pago con SALDO/WALLET: Débito atómico a pasajero, abono a conductor y cobro de comisión.
 *  - En pago EFECTIVO: Débito atómico de la comisión en la billetera del conductor.
 *  - Actualización atómica de estado del viaje a FINALIZADO y registro en HistorialSaldo.
 */
export const finalizarViajeTransaccional = async ({
    viajeId,
    conductorId,
    pasajeroId = null,
    despachadorId = null,
    tarifa = 0,
    metodoPago = 'EFECTIVO',
    subrolConductor = null,
    esIntermunicipal = false
}) => {
    if (!viajeId) throw new Error('⚠️ Se requiere un viajeId válido para ejecutar la finalización transaccional.');
    if (!conductorId) throw new Error('⚠️ Se requiere un conductorId válido para imputar cobros.');

    const tarifaMonto = Math.max(0, Number(tarifa) || 0);
    const metodoPagoLimpio = String(metodoPago || 'EFECTIVO').toUpperCase().trim();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. OBTENER Y VALIDAR EL VIAJE
        let viajeDoc = null;
        if (mongoose.Types.ObjectId.isValid(viajeId)) {
            viajeDoc = await Viaje.findById(viajeId).session(session);
        }
        if (!viajeDoc) {
            viajeDoc = await Viaje.findOne({ viajeId }).session(session);
        }

        if (viajeDoc && viajeDoc.estado === 'FINALIZADO') {
            await session.abortTransaction();
            session.endSession();
            return {
                exito: true,
                yaFinalizado: true,
                mensaje: 'El viaje ya se encontraba en estado FINALIZADO.'
            };
        }

        // 2. BUSCAR CONDUCTOR
        let conductorDoc = null;
        if (mongoose.Types.ObjectId.isValid(conductorId)) {
            conductorDoc = await Conductor.findById(conductorId).session(session);
        }
        if (!conductorDoc) {
            conductorDoc = await Conductor.findOne({ uid: conductorId }).session(session);
        }
        if (!conductorDoc) {
            throw new Error(`⚠️ Conductor con identificador [${conductorId}] no fue encontrado.`);
        }

        const subrolEfectivo = subrolConductor || conductorDoc.subrol;
        const { comisionConductor, comisionDespachador } = calcularComisionPorSubrol(
            subrolEfectivo,
            tarifaMonto,
            esIntermunicipal,
            despachadorId
        );

        let saldoPasajeroNuevo = null;
        let saldoConductorNuevo = Number(conductorDoc.saldo) || 0;

        // 3. EJECUCIÓN SEGÚN MÉTODO DE PAGO
        if (metodoPagoLimpio === 'SALDO' || metodoPagoLimpio === 'WALLET' || metodoPagoLimpio === 'DIGITAL') {
            if (!pasajeroId) {
                throw new Error('⚠️ Se requiere un pasajeroId válido para procesar pagos con SALDO/WALLET.');
            }

            let pasajeroDoc = null;
            if (mongoose.Types.ObjectId.isValid(pasajeroId)) {
                pasajeroDoc = await Pasajero.findById(pasajeroId).session(session);
            }
            if (!pasajeroDoc) {
                pasajeroDoc = await Pasajero.findOne({ uid: pasajeroId }).session(session);
            }
            if (!pasajeroDoc) {
                throw new Error(`⚠️ Pasajero con identificador [${pasajeroId}] no fue encontrado.`);
            }

            const saldoPasajeroActual = Number(pasajeroDoc.saldo) || 0;
            if (saldoPasajeroActual < tarifaMonto) {
                throw new Error(`⚠️ Saldo insuficiente en la billetera del pasajero ($${saldoPasajeroActual} COP) para tarifa de $${tarifaMonto} COP.`);
            }

            saldoPasajeroNuevo = saldoPasajeroActual - tarifaMonto;
            pasajeroDoc.saldo = saldoPasajeroNuevo;
            if (pasajeroDoc.billetera) pasajeroDoc.billetera.saldo = saldoPasajeroNuevo;
            await pasajeroDoc.save({ session });

            await HistorialSaldo.create([{
                entidadId: pasajeroDoc._id,
                tipoEntidad: 'Usuario',
                viajeId,
                tipo: 'descuento_comision',
                monto: tarifaMonto,
                saldoAnterior: saldoPasajeroActual,
                saldoNuevo: saldoPasajeroNuevo,
                procesadoPor: 'SISTEMA_FINALIZACION_VIAJE',
                descripcion: `Cobro automático digital por finalización de viaje #${viajeId}.`
            }], { session });

            // Abono tarifa a Conductor
            const saldoAnteriorCond = saldoConductorNuevo;
            saldoConductorNuevo += tarifaMonto;

            await HistorialSaldo.create([{
                entidadId: conductorDoc._id,
                tipoEntidad: 'Conductor',
                conductorId: conductorDoc._id,
                viajeId,
                tipo: 'recarga',
                monto: tarifaMonto,
                saldoAnterior: saldoAnteriorCond,
                saldoNuevo: saldoConductorNuevo,
                procesadoPor: 'SISTEMA_FINALIZACION_VIAJE',
                descripcion: `Abono tarifa por pago digital en viaje #${viajeId}.`
            }], { session });
        }

        // Deducción atómica de comisión de plataforma al conductor
        if (comisionConductor > 0) {
            const saldoPreComision = saldoConductorNuevo;
            saldoConductorNuevo -= comisionConductor;

            await HistorialSaldo.create([{
                entidadId: conductorDoc._id,
                tipoEntidad: 'Conductor',
                conductorId: conductorDoc._id,
                viajeId,
                tipo: 'descuento_comision',
                monto: comisionConductor,
                saldoAnterior: saldoPreComision,
                saldoNuevo: saldoConductorNuevo,
                procesadoPor: 'SISTEMA_FINALIZACION_VIAJE',
                descripcion: `Débito atómico de comisión por finalización de viaje #${viajeId} (Subrol: ${subrolEfectivo}).`
            }], { session });
        }

        conductorDoc.saldo = saldoConductorNuevo;
        if (conductorDoc.billetera) conductorDoc.billetera.saldo = saldoConductorNuevo;
        if (conductorDoc.estadisticas) conductorDoc.estadisticas.viajesCompletados = (conductorDoc.estadisticas.viajesCompletados || 0) + 1;
        await conductorDoc.save({ session });

        // Deducción a Despachador si aplica
        if (comisionDespachador > 0 && despachadorId) {
            let despachadorDoc = null;
            if (mongoose.Types.ObjectId.isValid(despachadorId)) {
                despachadorDoc = await Usuario.findById(despachadorId).session(session);
            }
            if (!despachadorDoc) {
                despachadorDoc = await Usuario.findOne({ uid: despachadorId }).session(session);
            }

            if (despachadorDoc) {
                const saldoDespActual = Number(despachadorDoc.saldo) || 0;
                const saldoDespNuevo = Math.max(0, saldoDespActual - comisionDespachador);
                despachadorDoc.saldo = saldoDespNuevo;
                await despachadorDoc.save({ session });

                await HistorialSaldo.create([{
                    entidadId: despachadorDoc._id,
                    tipoEntidad: 'Usuario',
                    viajeId,
                    tipo: 'descuento_comision',
                    monto: comisionDespachador,
                    saldoAnterior: saldoDespActual,
                    saldoNuevo: saldoDespNuevo,
                    procesadoPor: 'SISTEMA_FINALIZACION_VIAJE',
                    descripcion: `Débito atómico de comisión por asignación de viaje intermunicipal #${viajeId}.`
                }], { session });
            }
        }

        // 4. ACTUALIZACIÓN FINAL DE DOCUMENTO VIAJE
        if (viajeDoc) {
            viajeDoc.estado = 'FINALIZADO';
            viajeDoc.montoComision = comisionConductor;
            viajeDoc.metodoPago = metodoPagoLimpio;
            viajeDoc.montoFinal = tarifaMonto;
            viajeDoc.fechaFinalizacion = new Date();
            await viajeDoc.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        return {
            exito: true,
            viajeId,
            estado: 'FINALIZADO',
            tarifa: tarifaMonto,
            metodoPago: metodoPagoLimpio,
            comisionConductor,
            comisionDespachador,
            saldoFinalPasajero: saldoPasajeroNuevo,
            saldoFinalConductor: saldoConductorNuevo
        };

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

const viajeService = {
    calcularComision,
    calcularComisionPorSubrol,
    procesarPagoWalletTransaccional,
    finalizarViajeTransaccional
};

export default viajeService;