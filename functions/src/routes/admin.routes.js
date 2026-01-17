/**
 * src/routes/admin.routes.js
 * Rutas administrativas de TAXIA CIMCO (Sincronizadas con Controller)
 */

import { Router } from "express";

// Middlewares
import { authGuard } from "../middleware/auth.guard.js";
import roleGuard from "../middleware/role.guard.js";

// Roles (Configuración centralizada)
import ROLES from "../config/app.roles.js";

// Controller (Importación del objeto exportado por defecto)
import AdminController from "../modules/admin/controllers/admin.controller.js";

const router = Router();

// ===============================================
// RUTAS ADMIN - ACCESO RESTRINGIDO AL CEO/ADMIN
// ===============================================

/**
 * GET /api/admin/overview
 * Antes se llamaba overview, ahora apunta a dashboard
 */
router.get(
  "/overview",
  authGuard,
  roleGuard([ROLES.ADMIN, ROLES.CEO]),
  AdminController.dashboard
);

/**
 * GET /api/admin/users
 * Listado de usuarios del sistema
 */
router.get(
  "/users",
  authGuard,
  roleGuard([ROLES.ADMIN, ROLES.CEO]),
  AdminController.listUsers
);

/**
 * POST /api/admin/users/:uid/block
 * Antes era disableUser, ahora apunta a blockUser
 */
router.post(
  "/users/:uid/block",
  authGuard,
  roleGuard([ROLES.ADMIN, ROLES.CEO]),
  AdminController.blockUser
);

export default router;