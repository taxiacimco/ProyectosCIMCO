// Versión Arquitectura: V2.0 - Trazabilidad de Módulo
/**
 * functions/src/routes/notification.routes.js
 * Misión: Gestión de alertas FCM entrantes.
 */
import { Router } from 'express';
import notificationController from '../modules/notifications/controllers/notification.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';

const router = Router();

/**
 * RUTA: POST /send-alert
 * Protegida por el secreto compartido configurado en el backend
 */
router.post(
    '/send-alert', 
    asyncHandler(notificationController.receiveExternalAlert)
);

export default router;