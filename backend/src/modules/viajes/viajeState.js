// Versión Arquitectura: V1.0 - Gestión de Estados y Transiciones de Viajes (TAXIA CIMCO)

export const ESTADOS_VIAJE = {
  PENDIENTE: 'PENDIENTE',
  OFERTADO: 'OFERTADO',
  EN_CAMINO: 'EN_CAMINO',
  EN_SITIO: 'EN_SITIO',
  EN_RUTA: 'EN_RUTA',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO'
};

const TRANSICIONES_VALIDAS = {
  [ESTADOS_VIAJE.PENDIENTE]: [ESTADOS_VIAJE.OFERTADO, ESTADOS_VIAJE.EN_CAMINO, ESTADOS_VIAJE.CANCELADO],
  [ESTADOS_VIAJE.OFERTADO]: [ESTADOS_VIAJE.EN_CAMINO, ESTADOS_VIAJE.PENDIENTE, ESTADOS_VIAJE.CANCELADO],
  [ESTADOS_VIAJE.EN_CAMINO]: [ESTADOS_VIAJE.EN_SITIO, ESTADOS_VIAJE.CANCELADO],
  [ESTADOS_VIAJE.EN_SITIO]: [ESTADOS_VIAJE.EN_RUTA, ESTADOS_VIAJE.CANCELADO],
  [ESTADOS_VIAJE.EN_RUTA]: [ESTADOS_VIAJE.FINALIZADO, ESTADOS_VIAJE.CANCELADO],
  [ESTADOS_VIAJE.FINALIZADO]: [],
  [ESTADOS_VIAJE.CANCELADO]: []
};

export const validarTransicion = (estadoActual, nuevoEstado) => {
  if (!estadoActual || typeof estadoActual !== 'string' || !nuevoEstado || typeof nuevoEstado !== 'string') {
    return false;
  }

  const permitidos = TRANSICIONES_VALIDAS[estadoActual] || [];
  return permitidos.includes(nuevoEstado);
};