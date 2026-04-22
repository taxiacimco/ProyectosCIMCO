// Versión Arquitectura: V2.1 - Saneamiento de Middlewares
/**
 * functions/src/routes/user.routes.js
 * Módulo de usuarios.
 */
import { Router } from 'express';
import userController from '../modules/auth/controllers/user.controller.js';
import { authGuard } from '../middleware/auth.middleware.js'; // FIX: Nombrada y ruta correcta

const router = Router();

// Endpoint protegido para actualizar perfil
router.put('/profile', authGuard, userController.updateProfile);

export default router;