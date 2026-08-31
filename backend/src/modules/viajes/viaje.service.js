// Versión Arquitectura: V2.0 - Matriz Contable de Comisiones Multimodal y Transacciones ACID para Billeteras
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\viajes\viaje.service.js
 * Misión: Abstraer la lógica contable centralizada, matriz de comisiones por subrol y ejecución de transacciones
 * ACID con Mongoose Session para cobros/abonos en la billetera de Pasajeros, Conductores y Despachadores.
 * Integridad: Fusión Atómica. Mantiene retrocompatibilidad con `calcularComision` previo e implementa el protocolo
 * transaccional anti-saldos negativos y trazabilidad en HistorialSaldo.
 */

import mongoose from 'mongoose';
import Conductor from '../../models/Conductor.js';
import Pasajero from '../../models/Pasajero.js';
import Usuario from '../../models/Usuario.js';
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

const viajeService = {
    calcularComision,
    calcularComisionPorSubrol,
    procesarPagoWalletTransaccional
};

export default viajeService;