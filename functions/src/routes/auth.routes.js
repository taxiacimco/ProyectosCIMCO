import { Router } from 'express';
import { loginController } from '../modules/auth/controllers/auth.controller.js';

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc Recibe el idToken de Firebase y sincroniza el usuario
 */
router.post('/login', loginController);

export default router;