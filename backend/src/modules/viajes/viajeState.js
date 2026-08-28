// Versión Arquitectura: V1.1 - Máquina de Estados de Viajes Inmutable y Blindada (TAXIA CIMCO)

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

export const validarTransicion = (estadoActual, nuevoEstado) => {
  if (!estadoActual || typeof estadoActual !== 'string' || !nuevoEstado || typeof nuevoEstado !== 'string') {
    return false;
  }

  const permitidos = TRANSICIONES_VALIDAS[estadoActual] || [];
  return permitidos.includes(nuevoEstado);
};