/**
 * src/routes/driver.routes.js
 * Configuración de rutas para el módulo de conductores (drivers).
 * Ubicación anterior: modules/driver/routes/driver.routes.js
 */
import { Router } from "express";

// 🔐 Middlewares (Ajustados a la nueva ubicación en la raíz)
import { authGuard } from "../middleware/auth.guard.js";
import roleGuard from "../middleware/role.guard.js";

// 🎭 Roles (Acceso a la configuración global)
import AppRoles from "../config/app.roles.js";

// 🎮 Controller (Importación corregida hacia la ubicación del módulo)
// Apunta a: src/modules/driver/controllers/driver.controller.js
import DriverController from "../modules/driver/controllers/driver.controller.js";

const router = Router();

// Extraemos roles para legibilidad
const { DRIVER, ADMIN, DESPATCH } = AppRoles;

// ===============================================
// RUTAS DE CONDUCTORES (DRIVER)
// ===============================================

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

// ===============================================
// RUTAS ADMINISTRATIVAS (ADMIN, DESPATCH)
// ===============================================

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