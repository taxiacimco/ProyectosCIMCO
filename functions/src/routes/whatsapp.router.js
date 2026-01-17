import { Router } from 'express';
import axios from 'axios';
import geminiService from '../modules/whatsapp/services/gemini.service.js';

const router = Router();

/**
 * GET /api/whatsapp/webhook
 * Verificación del Webhook con Meta (Facebook)
 */
router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WhatsApp Webhook verificado correctamente.');
            return res.status(200).send(challenge);
        } else {
            console.error('❌ Error de verificación: Tokens no coinciden.');
            return res.sendStatus(403);
        }
    }
});

/**
 * POST /api/whatsapp/webhook
 * Recepción y procesamiento de mensajes con Gemini AI
 */
router.post('/webhook', async (req, res) => {
    const body = req.body;

    // Verificar que el evento provenga de la API de WhatsApp
    if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        // Solo procesamos si hay un mensaje de texto y no es un estado (sent/delivered)
        if (message && message.type === 'text') {
            const customerPhone = message.from;
            const userText = message.text?.body;

            console.log(`📩 Mensaje recibido de ${customerPhone}: "${userText}"`);

            try {
                // 1. Obtenemos la respuesta inteligente de nuestro servicio Gemini
                const aiResponse = await geminiService.generateResponse(userText);

                // 2. Enviamos la respuesta de la IA de vuelta al usuario por WhatsApp
                await sendWhatsAppMessage(customerPhone, aiResponse);
                
                console.log(`📤 Respuesta enviada a ${customerPhone}`);
            } catch (error) {
                console.error('❌ Error al procesar el flujo de Gemini/WhatsApp:', error.message);
                // Fallback en caso de error crítico de comunicación
                await sendWhatsAppMessage(customerPhone, "Lo siento, estamos experimentando una alta demanda. Por favor, intenta de nuevo en unos momentos.");
            }
        }
        
        // Siempre retornamos 200 a Meta para confirmar recepción
        return res.status(200).send('EVENT_RECEIVED');
    }
    
    return res.sendStatus(404);
});

/**
 * Función interna para envío de mensajes vía Graph API de Meta
 * @param {string} to Número del cliente (ej: 57310...)
 * @param {string} text Texto de la respuesta
 */
async function sendWhatsAppMessage(to, text) {
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
    
    const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`;
    
    try {
        await axios.post(url, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "text",
            text: { body: text }
        }, {
            headers: { 
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error("❌ Error API WhatsApp:", error.response?.data || error.message);
        throw error;
    }
}

export default router;