/**
 * src/routes/whatsapp.router.js
 * Enrutador para el Webhook de WhatsApp en la arquitectura TAXIA CIMCO.
 */
import { Router } from 'express';
// ✅ CORRECCIÓN DE RUTA: Apunta al módulo correcto
import whatsappController from '../modules/whatsapp/controllers/whatsapp.controller.js';

const router = Router();

/**
 * GET /webhook
 * Verificación del Webhook con Meta (Facebook)
 */
router.get('/webhook', whatsappController.verifyWebhook);

/**
 * POST /webhook
 * Recepción y procesamiento de mensajes entrantes de usuarios.
 */
router.post('/webhook', whatsappController.handleMessage);

export default router;