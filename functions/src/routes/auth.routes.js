// Versión Arquitectura: V2.0 - Trazabilidad de Módulo
/**
 * functions/src/routes/auth.routes.js
 * Misión: Autenticación inicial y sincronización de identidades de Firebase.
 */
import { Router } from 'express';
import { loginController } from '../modules/auth/controllers/auth.controller.js';

const router = Router();

/**
 * @route POST /login
 * @desc Recibe el idToken de Firebase y sincroniza el usuario en Firestore
 */
router.post('/login', loginController);

export default router;