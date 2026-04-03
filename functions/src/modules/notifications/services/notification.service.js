/**
 * modules/notifications/services/notification.service.js
 * Servicio de mensajería para alertas de conductores y pasajeros.
 * TAXIA CIMCO - Motor de notificaciones Push FCM.
 */
import { messaging } from "../../../firebase/firebase-admin.js";

/**
 * Envía una notificación push genérica.
 * @param {string|string[]} tokens - Token o array de tokens FCM.
 * @param {string} titulo - Título de la notificación.
 * @param {string} cuerpo - Cuerpo del mensaje.
 * @param {Object} data - Metadatos adicionales para la App.
 */
export const enviarNotificacionPush = async (tokens, titulo, cuerpo, data = {}) => {
    if (!tokens || (Array.isArray(tokens) && tokens.length === 0)) {
        console.log("ℹ️ [FCM] No hay tokens para enviar notificaciones push.");
        return null;
    }

    const mensaje = {
        notification: {
            title: titulo,
            body: cuerpo
        },
        data: data,
        tokens: Array.isArray(tokens) ? tokens : [tokens]
    };

    try {
        const response = await messaging.sendEachForMulticast(mensaje);
        console.log(`✅ [FCM] Notificaciones enviadas: ${response.successCount} exitosas.`);
        return response;
    } catch (error) {
        console.error("❌ [FCM] Error enviando notificaciones push:", error);
        throw error;
    }
};

/**
 * Envía notificaciones Push FCM específicamente para nuevas solicitudes de viaje.
 * @param {string[]} tokens - Array de tokens FCM de los conductores.
 * @param {string} viajeId - ID del viaje en Firestore.
 * @param {Object} viajeData - Información del servicio solicitado.
 */
export const enviarNotificacionNuevaSolicitud = async (tokens, viajeId, viajeData) => {
  if (!tokens || tokens.length === 0) {
    console.log("ℹ️ [FCM] No hay tokens válidos para notificar nueva solicitud.");
    return null;
  }

  const payload = {
    notification: {
      title: "🚀 ¡Nuevo Viaje Disponible!",
      body: `Solicitud de: ${viajeData.tipoVehiculo || 'Servicio CIMCO'}`,
    },
    data: {
      viajeId: String(viajeId),
      tipo: "NUEVO_VIAJE",
      click_action: "FLUTTER_NOTIFICATION_CLICK" 
    },
    tokens: tokens 
  };

  try {
    const response = await messaging.sendEachForMulticast(payload);
    console.log(`✅ [FCM] Notificaciones de solicitud enviadas: ${response.successCount} exitosas.`);
    return response;
  } catch (error) {
    console.error("❌ [FCM] Error enviando notificación de nueva solicitud:", error);
    throw error;
  }
};