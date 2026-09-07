// Versión Arquitectura: V2.1 - Transacciones Atómicas Mongoose/Firestore para Sincronización de Saldos en Finalización de Viajes (TAXIA CIMCO)

import mongoose from 'mongoose';
import { getFirestore } from 'firebase-admin/firestore';

export const ESTADOS_VIAJE = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  OFERTADO: 'OFERTADO',
  EN_CAMINO: 'EN_CAMINO',
  EN_SITIO: 'EN_SITIO',
  EN_RUTA: 'EN_RUTA',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO'
});

const TRANSICIONES_VALIDAS = Object.freeze({
  [ESTADOS_VIAJE.PENDIENTE]: Object.freeze([ESTADOS_VIAJE.OFERTADO, ESTADOS_VIAJE.EN_CAMINO, ESTADOS_VIAJE.CANCELADO]),
  [ESTADOS_VIAJE.OFERTADO]: Object.freeze([ESTADOS_VIAJE.EN_CAMINO, ESTADOS_VIAJE.PENDIENTE, ESTADOS_VIAJE.CANCELADO]),
  [ESTADOS_VIAJE.EN_CAMINO]: Object.freeze([ESTADOS_VIAJE.EN_SITIO, ESTADOS_VIAJE.CANCELADO]),
  [ESTADOS_VIAJE.EN_SITIO]: Object.freeze([ESTADOS_VIAJE.EN_RUTA, ESTADOS_VIAJE.CANCELADO]),
  [ESTADOS_VIAJE.EN_RUTA]: Object.freeze([ESTADOS_VIAJE.FINALIZADO, ESTADOS_VIAJE.CANCELADO]),
  [ESTADOS_VIAJE.FINALIZADO]: Object.freeze([]),
  [ESTADOS_VIAJE.CANCELADO]: Object.freeze([])
});

/**
 * Matriz estandarizada de comisiones (Tarifa fija en COP o Porcentaje sobre el valor del viaje).
 * Si no se especifica subrol o regla exacta, aplica 'DEFAULT'.
 */
export const MATRIZ_COMISIONES = Object.freeze({
  Mototaxi: Object.freeze({ DEFAULT: { tipo: 'FIJO', valor: 500 } }),
  Motoparrillero: Object.freeze({ DEFAULT: { tipo: 'FIJO', valor: 500 } }),
  Motocarga: Object.freeze({ DEFAULT: { tipo: 'FIJO', valor: 1000 } }),
  Conductor: Object.freeze({
    Taxi: { tipo: 'PORCENTAJE', valor: 0.10 },
    Particular: { tipo: 'PORCENTAJE', valor: 0.12 },
    DEFAULT: { tipo: 'PORCENTAJE', valor: 0.10 }
  }),
  DEFAULT: Object.freeze({ DEFAULT: { tipo: 'FIJO', valor: 500 } })
});

/**
 * Valida si la transición entre dos estados es legal dentro del ciclo de vida del servicio.
 * @param {string} estadoActual 
 * @param {string} nuevoEstado 
 * @returns {boolean}
 */
export const validarTransicion = (estadoActual, nuevoEstado) => {
  if (!estadoActual || typeof estadoActual !== 'string' || !nuevoEstado || typeof nuevoEstado !== 'string') {
    return false;
  }

  const permitidos = TRANSICIONES_VALIDAS[estadoActual] || [];
  return permitidos.includes(nuevoEstado);
};

/**
 * Helper puro para calcular la comisión exacta a liquidar basándose en rol, subrol y valor total del servicio.
 * @param {Object} params
 * @param {string} params.rol - Rol operativo del prestador (ej. Mototaxi, Conductor)
 * @param {string} [params.subrol] - Subrol opcional (ej. Taxi, Particular)
 * @param {number} [params.valorViaje=0] - Valor base del servicio prestado
 * @returns {number} Monto final de comisión a descontar en COP
 */
export const calcularComisionServicio = ({ rol, subrol, valorViaje = 0 } = {}) => {
  const rolClean = rol ? String(rol).trim() : 'DEFAULT';
  const subrolClean = subrol ? String(subrol).trim() : 'DEFAULT';
  const valorBase = Math.max(0, Number(valorViaje) || 0);

  const configRol = MATRIZ_COMISIONES[rolClean] || MATRIZ_COMISIONES[Object.keys(MATRIZ_COMISIONES).find(r => r.toLowerCase() === rolClean.toLowerCase())] || MATRIZ_COMISIONES.DEFAULT;
  const regla = configRol[subrolClean] || configRol.DEFAULT || MATRIZ_COMISIONES.DEFAULT.DEFAULT;

  if (regla.tipo === 'PORCENTAJE') {
    return Math.round(valorBase * regla.valor);
  }

  return Math.round(regla.valor);
};

/**
 * Hook de transición para evaluar si un cambio de estado debe disparar la liquidación de comisión.
 * Estados de liquidación principales: EN_CAMINO o EN_RUTA.
 * @param {Object} params
 * @param {string} params.estadoOrigen
 * @param {string} params.estadoDestino
 * @param {string} params.rol
 * @param {string} [params.subrol]
 * @param {number} [params.valorViaje]
 * @returns {Object} { debeLiquidar: boolean, montoComision: number, estadoDestino: string }
 */
export const procesarHookTransicionComision = ({ estadoOrigen, estadoDestino, rol, subrol, valorViaje = 0 } = {}) => {
  const esTransicionValida = validarTransicion(estadoOrigen, estadoDestino);
  
  if (!esTransicionValida) {
    return {
      debeLiquidar: false,
      montoComision: 0,
      estadoDestino,
      error: 'TRANSICION_INVALIDA'
    };
  }

  // Se liquida comisión al transicionar hacia EN_CAMINO (aceptación/desplazamiento) o EN_RUTA si la operativa lo requiere
  const ESTADOS_LIQUIDACION = [ESTADOS_VIAJE.EN_CAMINO, ESTADOS_VIAJE.EN_RUTA];
  const esEstadoLiquidacion = ESTADOS_LIQUIDACION.includes(estadoDestino);

  if (!esEstadoLiquidacion) {
    return {
      debeLiquidar: false,
      montoComision: 0,
      estadoDestino
    };
  }

  const montoComision = calcularComisionServicio({ rol, subrol, valorViaje });

  return {
    debeLiquidar: montoComision > 0,
    montoComision,
    estadoDestino
  };
};

/**
 * Ejecuta una transacción atómica completa para la finalización de un viaje, sincronizando los saldos
 * de conductor y pasajero, aplicando el cobro de la comisión de la plataforma y actualizando el estado.
 * @param {Object} params
 * @param {string} params.viajeId - ID o identificador único del viaje
 * @param {string} params.conductorId - ID o UID del conductor prestador
 * @param {string} [params.pasajeroId] - ID o UID del pasajero
 * @param {number} [params.valorViaje=0] - Valor base del servicio en COP
 * @param {string} [params.metodoPago='EFECTIVO'] - Método de pago utilizado ('EFECTIVO', 'DIGITAL', 'SALDO')
 * @param {string} [params.rol] - Rol operativo del conductor
 * @param {string} [params.subrol] - Subrol del conductor
 * @param {Object} [params.session] - Sesión previa de Mongoose si ya existe una transacción activa
 * @returns {Promise<Object>} Resultado de la transacción atómica
 */
export const ejecutarTransaccionFinalizacionViaje = async ({
  viajeId,
  conductorId,
  pasajeroId,
  valorViaje = 0,
  metodoPago = 'EFECTIVO',
  rol,
  subrol,
  session = null
} = {}) => {
  if (!viajeId) throw new Error('ERR_VIAJE_ID_REQUERIDO: Se requiere un ID de viaje válido.');
  if (!conductorId) throw new Error('ERR_CONDUCTOR_ID_REQUERIDO: Se requiere un ID de conductor válido.');

  const montoValorViaje = Math.max(0, Number(valorViaje) || 0);
  const montoComision = calcularComisionServicio({ rol, subrol, valorViaje: montoValorViaje });
  const metodoPagoLimpio = String(metodoPago || 'EFECTIVO').toUpperCase().trim();

  let sessionInterna = session;
  let esSesionPropia = false;

  try {
    if (!sessionInterna && mongoose.connection?.readyState === 1) {
      sessionInterna = await mongoose.startSession();
      sessionInterna.startTransaction();
      esSesionPropia = true;
    }

    const db = mongoose.connection?.db;
    if (db) {
      const filterConductor = mongoose.Types.ObjectId.isValid(conductorId)
        ? { $or: [{ uid: conductorId }, { _id: new mongoose.Types.ObjectId(conductorId) }] }
        : { uid: conductorId };

      // 1. DÉBITO ATÓMICO DE COMISIÓN AL CONDUCTOR Y ACREDITACIÓN SI PAGO ES DIGITAL
      const cambioSaldoConductor = (metodoPagoLimpio === 'DIGITAL' || metodoPagoLimpio === 'SALDO')
        ? (montoValorViaje - montoComision)
        : (-montoComision);

      const updateConductor = {
        $inc: {
          saldo: cambioSaldoConductor,
          "billetera.saldo": cambioSaldoConductor,
          "estadisticas.viajesCompletados": 1
        }
      };

      const conductorResult = await db.collection('conductores').updateOne(
        filterConductor,
        updateConductor,
        { session: sessionInterna || undefined }
      );

      if (conductorResult.matchedCount === 0) {
        await db.collection('usuarios').updateOne(
          filterConductor,
          updateConductor,
          { session: sessionInterna || undefined }
        );
      }

      // 2. DÉBITO ATÓMICO AL PASAJERO SI SE PAGÓ CON SALDO/BILLETERA DIGITAL
      if (pasajeroId && (metodoPagoLimpio === 'DIGITAL' || metodoPagoLimpio === 'SALDO')) {
        const filterPasajero = mongoose.Types.ObjectId.isValid(pasajeroId)
          ? { $or: [{ uid: pasajeroId }, { _id: new mongoose.Types.ObjectId(pasajeroId) }] }
          : { uid: pasajeroId };

        const updatePasajero = {
          $inc: {
            saldo: -montoValorViaje,
            "billetera.saldo": -montoValorViaje,
            "estadisticas.viajesCompletados": 1
          }
        };

        await db.collection('pasajeros').updateOne(
          filterPasajero,
          updatePasajero,
          { session: sessionInterna || undefined }
        );
      }

      // 3. ACTUALIZACIÓN ATÓMICA DEL ESTADO DEL VIAJE A FINALIZADO
      const filterViaje = mongoose.Types.ObjectId.isValid(viajeId)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(viajeId) }, { viajeId }] }
        : { viajeId };

      await db.collection('viajes').updateOne(
        filterViaje,
        {
          $set: {
            estado: ESTADOS_VIAJE.FINALIZADO,
            montoComision,
            metodoPago: metodoPagoLimpio,
            montoFinal: montoValorViaje,
            fechaFinalizacion: new Date()
          }
        },
        { session: sessionInterna || undefined }
      );
    }

    // 4. TRANSACCIÓN ATÓMICA EN FIRESTORE (SI ESTÁ CONFIGURADO)
    try {
      const firestoreDb = getFirestore();
      if (firestoreDb) {
        await firestoreDb.runTransaction(async (transaction) => {
          const docConductorRef = firestoreDb.collection('conductores').doc(conductorId);
          const conductorSnap = await transaction.get(docConductorRef);

          if (conductorSnap.exists) {
            const actualSaldo = conductorSnap.data()?.saldo || 0;
            const cambioSaldoConductor = (metodoPagoLimpio === 'DIGITAL' || metodoPagoLimpio === 'SALDO')
              ? (montoValorViaje - montoComision)
              : (-montoComision);

            transaction.update(docConductorRef, { saldo: actualSaldo + cambioSaldoConductor });
          }

          if (pasajeroId && (metodoPagoLimpio === 'DIGITAL' || metodoPagoLimpio === 'SALDO')) {
            const docPasajeroRef = firestoreDb.collection('pasajeros').doc(pasajeroId);
            const pasajeroSnap = await transaction.get(docPasajeroRef);
            if (pasajeroSnap.exists) {
              const actualSaldoPasajero = pasajeroSnap.data()?.saldo || 0;
              transaction.update(docPasajeroRef, { saldo: actualSaldoPasajero - montoValorViaje });
            }
          }

          const docViajeRef = firestoreDb.collection('viajes').doc(viajeId);
          transaction.set(docViajeRef, {
            estado: ESTADOS_VIAJE.FINALIZADO,
            montoComision,
            metodoPago: metodoPagoLimpio,
            montoFinal: montoValorViaje,
            fechaFinalizacion: new Date().toISOString()
          }, { merge: true });
        });
      }
    } catch (fsError) {
      console.warn('[VIAJE-STATE-WARN] Advertencia en actualización atómica Firestore:', fsError?.message || fsError);
    }

    if (esSesionPropia && sessionInterna) {
      await sessionInterna.commitTransaction();
    }

    return {
      exito: true,
      estado: ESTADOS_VIAJE.FINALIZADO,
      montoComision,
      montoValorViaje,
      metodoPago: metodoPagoLimpio
    };

  } catch (error) {
    if (esSesionPropia && sessionInterna) {
      await sessionInterna.abortTransaction();
    }
    throw error;
  } finally {
    if (esSesionPropia && sessionInterna) {
      sessionInterna.endSession();
    }
  }
};

export default {
  ESTADOS_VIAJE,
  MATRIZ_COMISIONES,
  validarTransicion,
  calcularComisionServicio,
  procesarHookTransicionComision,
  ejecutarTransaccionFinalizacionViaje
};