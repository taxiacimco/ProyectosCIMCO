// Versión Arquitectura: V2.1 - Saneamiento de Middlewares
/**
 * functions/src/routes/driver.routes.js
 * Configuración de rutas para el módulo de conductores (drivers).
 */
import { Router } from "express";

// 🔐 Middlewares (Rutas corregidas)
import { authGuard } from "../middleware/auth.middleware.js"; // FIX: Era auth.guard.js
import roleGuard from "../middleware/role.guard.js";

// 🎭 Roles
import AppRoles from "../config/app.roles.js";

// 🎮 Controller 
import DriverController from "../modules/driver/controllers/driver.controller.js";

const router = Router();
const { DRIVER, ADMIN, DESPATCH } = AppRoles;

/**
 * PUT /api/v1/drivers/location
 * Actualiza la ubicación GPS del conductor autenticado
 */
router.put(
  "/location",
  authGuard,
  roleGuard([DRIVER]),
  DriverController.updateLocation
);

/**
 * GET /api/v1/drivers/me
 * Obtiene el perfil del conductor autenticado
 */
router.get(
  "/me",
  authGuard,
  roleGuard([DRIVER]),
  DriverController.profile
);

/**
 * GET /api/v1/drivers
 * Lista todos los conductores
 */
router.get(
  "/",
  authGuard,
  roleGuard([ADMIN, DESPATCH]),
  DriverController.listDrivers
);

/**
 * PUT /api/v1/drivers/:id/approve
 * Aprueba un conductor
 */
router.put(
  "/:id/approve",
  authGuard,
  roleGuard([ADMIN, DESPATCH]),
  DriverController.approveDriver
);

export default router;