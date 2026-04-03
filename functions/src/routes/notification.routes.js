import { Router } from 'express';
import notificationController from '../modules/notifications/controllers/notification.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';

const router = Router();

/**
 * RUTA: POST /api/v1/notifications/send-alert
 * Protegida por el secreto compartido que configuramos en Java
 */
router.post(
    '/send-alert', 
    asyncHandler(notificationController.receiveExternalAlert)
);

export default router;