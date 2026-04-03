/**
 * routes/user.routes.js
 */
import { Router } from 'express';
import userController from '../modules/auth/controllers/user.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

// Endpoint protegido para actualizar perfil
router.put('/profile', authMiddleware, userController.updateProfile);

export default router;