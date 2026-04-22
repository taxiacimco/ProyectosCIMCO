// Versión Arquitectura: V2.1 - Saneamiento de Middlewares
/**
 * functions/src/routes/despatch.routes.js
 * Configuración de rutas para el módulo de despacho intermunicipal.
 */
import { Router } from "express";

// 🔐 Middlewares (Rutas corregidas)
import { authGuard } from "../middleware/auth.middleware.js"; // FIX: Era auth.guard.js
import roleGuard from "../middleware/role.guard.js";

// 🎭 Roles (Importación centralizada)
import ROLES from "../config/app.roles.js";

// 🎮 Controller
import DespatchController from "../modules/despatch/controllers/despatch.controller.js";

const router = Router();

/**
 * POST /api/despatch/assign
 * Asignar un conductor a un viaje
 * Acceso: DESPATCH (Despachador) o ADMIN
 */
router.post(
    "/assign",
    authGuard,
    roleGuard([ROLES.DESPATCH, ROLES.ADMIN]),
    DespatchController.assignDriver
);

/**
 * GET /api/despatch/pending
 * Obtener listado de viajes que requieren despacho
 * Acceso: DESPATCH o ADMIN
 */
router.get(
    "/pending",
    authGuard,
    roleGuard([ROLES.DESPATCH, ROLES.ADMIN]),
    DespatchController.pendingRides
);

export default router;