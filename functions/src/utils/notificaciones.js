// functions/src/utils/notificaciones.js
import admin from '../firebase/firebase-admin.js'; // <- Cambio vital: Apuntamos al Singleton

/**
 * Envía una notificación Push a un conductor específico
 */
export const enviarNotificacionPush = async (token, content, extraData = {}) => {
    if (!token) return { success: false, error: "Token no proporcionado" };

    const message = {
        notification: {
            title: content.titulo,
            body: content.cuerpo,
        },
        data: {
            ...extraData,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            url: extraData.url || '/ConductorPanel'
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'viajes_cimco',
            }
        },
        token: token
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('✅ Push enviado con éxito:', response);
        return { success: true, response };
    } catch (error) {
        console.error('❌ Error enviando Push:', error);
        return { success: false, error };
    }
};