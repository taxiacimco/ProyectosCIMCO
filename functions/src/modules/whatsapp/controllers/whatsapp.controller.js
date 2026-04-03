/**
 * modules/whatsapp/controllers/whatsapp.controller.js
 * Controlador para la API de WhatsApp Cloud (Webhooks)
 */
import { asyncHandler } from '../../../middleware/async-handler.js';

/**
 * GET /webhook
 * Verificación obligatoria de Meta para conectar el Webhook
 */
export const verifyWebhook = (req, res) => {
    // El token de verificación debe coincidir con el que configures en el panel de Meta
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'cimco_token_2026';
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('✅ [WhatsApp] Webhook verificado correctamente por Meta.');
            // Meta exige que se devuelva el challenge en texto plano, no en JSON
            return res.status(200).send(challenge);
        } else {
            return res.status(403).send('Forbidden');
        }
    }
    return res.status(400).send('Bad Request');
};

/**
 * POST /webhook
 * Recepción de mensajes del usuario hacia la línea de TAXIA CIMCO
 */
export const handleMessage = asyncHandler(async (req, res) => {
    const body = req.body;

    // Verificar si es un evento de WhatsApp
    if (body.object === 'whatsapp_business_account') {
        
        // 🚨 Aquí es donde conectas con tu servicio (gemini.service o whatsapp.service)
        // Por ahora, aceptamos el mensaje rápidamente para que Meta no reintente
        console.log("📨 [WhatsApp] Mensaje entrante recibido");
        
        return res.status(200).send('EVENT_RECEIVED');
    }

    return res.status(404).send('Not Found');
});

export default { verifyWebhook, handleMessage };