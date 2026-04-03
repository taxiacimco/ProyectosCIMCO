/**
 * modules/notifications/controllers/notification.controller.js
 * Controlador maestro para el envío de Notificaciones Push - TAXIA CIMCO
 */
import admin from 'firebase-admin';
// ✅ CORRECCIÓN DE RUTA: Se normaliza a http-response.js para eliminar el error ERR_MODULE_NOT_FOUND
import { sendSuccessResponse, sendErrorResponse } from '../../../utils/http-response.js';
import { asyncHandler } from '../../../middleware/async-handler.js';
import { enviarNotificacionPush } from '../../../utils/notificaciones.js';

/**
 * @route POST /notifications/external-alert
 * @desc  Mantiene compatibilidad con alertas externas (Ej: Webhook de Recargas)
 * @access Private (Bearer Secret)
 */
export const receiveExternalAlert = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const { conductorId, monto, referencia, tipo } = req.body;

    // 1. VALIDACIÓN DE SEGURIDAD (Fusión Atómica: Se preserva lógica original)
    // Nota: En producción, se recomienda usar process.env.INTERNAL_API_SECRET
    const secret = "TU_CLAVE_SECRETA_SUPER_SEGURA_2026"; 
    
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
        console.error("❌ [Security Alert] Intento de acceso no autorizado al Webhook de Notificaciones");
        return sendErrorResponse(res, "No autorizado", 401);
    }

    // 2. BUSCAR EL TOKEN DEL CONDUCTOR (Sacred Data Structure Path)
    const userRef = admin.firestore()
        .collection('artifacts').doc('taxiacimco-app')
        .collection('public').doc('data')
        .collection('usuarios').doc(conductorId);

    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        return sendErrorResponse(res, "Conductor no encontrado", 404);
    }

    // Obtenemos los tokens (pueden ser múltiples dispositivos)
    const tokens = userSnap.data().fcmTokens || (userSnap.data().fcmToken ? [userSnap.data().fcmToken] : []);

    if (tokens.length === 0) {
        return sendErrorResponse(res, "El conductor no tiene tokens FCM registrados", 400);
    }

    // 3. DISPARAR LAS NOTIFICACIONES PUSH
    const promesas = tokens.map(token => 
        enviarNotificacionPush(token, {
            titulo: "💰 ¡RECARGA EXITOSA!",
            cuerpo: `Se han acreditado $${monto} a tu billetera. Ref: ${referencia}`
        }, {
            url: '/BilleteraPanel',
            tipo: tipo || 'RECARGA'
        })
    );

    await Promise.all(promesas);

    return sendSuccessResponse(res, null, "Notificaciones enviadas con éxito");
});

/**
 * @route POST /notifications/send
 * @desc Envía una notificación Push manual a un token específico (FCM)
 * @access Private/Admin
 */
export const sendPushNotification = asyncHandler(async (req, res) => {
    const { token, title, body, data } = req.body;

    // Validación de entrada
    if (!token || !title || !body) {
        return sendErrorResponse(res, "Faltan parámetros obligatorios (token, title, body).", 400);
    }

    const content = {
        titulo: title,
        cuerpo: body
    };

    // Integración con nuestro servicio utilitario de notificaciones
    const result = await enviarNotificacionPush(token, content, data || {});

    if (result.success) {
        return sendSuccessResponse(res, result.response, "Notificación enviada con éxito.");
    } else {
        console.error("❌ [Notification Controller Error]:", result.error);
        return sendErrorResponse(res, "Falló el envío de la notificación Push.", 500);
    }
});

// Exportación unificada para el router
export default { 
    receiveExternalAlert,
    sendPushNotification 
};