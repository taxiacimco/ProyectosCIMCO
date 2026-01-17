// Archivo: src/modules/rides/types/ride.types.js

/**
 * Define los posibles estados de un viaje.
 * Se exporta como un objeto de JS puro (no enum de TypeScript).
 */
export const RideStatus = {
    REQUESTED: 'REQUESTED',
    DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
    STARTED: 'STARTED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};

// Se usan comentarios JSDoc para describir las estructuras de datos.
// Esto ayuda a la claridad sin introducir errores de sintaxis en Node.
/**
 * @typedef {Object} LocationData
 * @property {number} lat - Latitud.
 * @property {number} lng - Longitud.
 * @property {string} address - Dirección legible.
 */

/**
 * @typedef {Object} RideData
 * @property {string} passengerId - ID del pasajero que solicita el viaje.
 * @property {LocationData} pickupLocation - Ubicación de recogida.
 * @property {LocationData} destination - Ubicación de destino.
 * @property {number=} fareEstimate - Estimación de la tarifa (opcional).
 * @property {string} paymentMethod - Método de pago.
 */

/**
 * @typedef {Object} Ride
 * @property {string} id - ID del viaje.
 * @property {string} passengerId - ID del pasajero.
 * @property {string | null} driverId - ID del conductor asignado (null inicialmente).
 * @property {keyof typeof RideStatus} status - Estado actual del viaje.
 * @property {LocationData} pickup - Ubicación de recogida.
 * @property {LocationData} destination - Ubicación de destino.
 * @property {number} fare - Tarifa final o estimada.
 * @property {string} paymentMethod - Método de pago.
 * @property {import('firebase-admin').firestore.Timestamp} requestedAt - Timestamp de solicitud.
 * @property {import('firebase-admin').firestore.Timestamp} createdAt - Timestamp de creación.
 * @property {import('firebase-admin').firestore.Timestamp} updatedAt - Timestamp de última actualización.
 * @property {import('firebase-admin').firestore.Timestamp=} completedAt - Timestamp de finalización/cancelación (opcional).
 */