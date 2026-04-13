/**
 * 📲 TAXIA CIMCO - Notificaciones Push Service (V7 Ready)
 * Arquitectura Libre de functions.config()
 */
import admin from '../firebase/firebase-admin.js';

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