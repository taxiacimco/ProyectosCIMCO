// Versión Arquitectura: V2.0 - Trazabilidad de Módulo
/**
 * functions/src/routes/password.routes.js
 * Misión: Rutas para el manejo de contraseñas (Hash y Verificación)
 */
import { Router } from "express";
import passwordController from "../modules/password/controllers/password.controller.js";

const router = Router();

/**
 * POST /hash
 * Ruta para encriptar una contraseña
 */
router.post(
    "/hash", 
    passwordController.hashPassword
);

/**
 * POST /verify
 * Ruta para verificar una contraseña contra un hash
 */
router.post(
    "/verify", 
    passwordController.verifyPassword
);

export default router;