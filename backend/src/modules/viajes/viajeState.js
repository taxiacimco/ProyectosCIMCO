// Versión Arquitectura: V2.0 - Máquina de Estados de Viajes con Matriz Centralizada de Comisiones por Rol/Subrol y Hooks de Transición (TAXIA CIMCO)

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

export default {
  ESTADOS_VIAJE,
  MATRIZ_COMISIONES,
  validarTransicion,
  calcularComisionServicio,
  procesarHookTransicionComision
};