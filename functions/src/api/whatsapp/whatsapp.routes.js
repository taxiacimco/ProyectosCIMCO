import { Router } from "express";
import whatsappController from "./whatsapp.controller.js";

const router = Router();

/**
 * Rutas para el Webhook de WhatsApp
 * Estas deben apuntar a la URL que configures en el Dashboard de Meta Developers
 */

// GET: Para la verificación inicial de Meta
router.get("/webhook", whatsappController.verifyWebhook.bind(whatsappController));

// POST: Para recibir los mensajes de los usuarios en tiempo real
router.post("/webhook", whatsappController.handleMessage.bind(whatsappController));

export default router;