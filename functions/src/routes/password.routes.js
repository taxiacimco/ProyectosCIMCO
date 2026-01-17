/**
 * src/routes/password.routes.js
 * Rutas para el manejo de contraseñas (Hash y Verificación)
 */

import { Router } from "express";
import passwordController from "../modules/password/controllers/password.controller.js";

const router = Router();

/**
 * POST /api/password/hash
 * Ruta para encriptar una contraseña
 */
router.post(
    "/hash", 
    passwordController.hashPassword
);

/**
 * POST /api/password/verify
 * Ruta para verificar una contraseña contra un hash
 */
router.post(
    "/verify", 
    passwordController.verifyPassword
);

export default router;