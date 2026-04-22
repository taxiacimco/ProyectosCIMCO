import admin from '../firebase/firebase-admin.js';

/**
 * Envía una notificación push optimizada para la experiencia TAXIA CIMCO.
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
            // Enrutamiento inteligente: Si es recarga va a Billetera, si no, al Panel de Control.
            url: extraData.url || (extraData.tipo === 'RECARGA' ? '/Billetera' : '/ConductorPanel')
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'viajes_cimco', // Canal de alta prioridad configurado en la App
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    badge: 1
                }
            }
        },
        token: token
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('✅ [PUSH CIMCO] Enviado exitosamente:', response);
        return { success: true, response };
    } catch (error) {
        console.error('❌ [PUSH CIMCO] Error de envío:', error);
        return { success: false, error: error.message };
    }
};