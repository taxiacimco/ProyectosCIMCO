/**
 * src/routes/rides.routes.js
 * Configuración de rutas centralizada para el módulo de viajes (rides).
 * TAXIA CIMCO - Soporte para Mototaxis, Motocargas y Cooperativas Intermunicipales.
 */

import { Router } from "express";

// 🔐 Middlewares
import { authGuard } from "../middleware/auth.guard.js";
import roleGuard from "../middleware/role.guard.js";

// 🎭 Roles (Importación centralizada)
import ROLES from "../config/app.roles.js";

// 🎮 Controllers
import RidesController from "../modules/rides/controllers/rides.controller.js";
import TripController from "../modules/rides/controllers/trip.controller.js";

const router = Router();

// ===============================================
// RUTAS DE VIAJES (Prefijo base definido en main.router: /v1/rides)
// ===============================================

/**
 * POST /
 * Crear un nuevo viaje (Mototaxi o Intermunicipal).
 */
router.post(
  "/",
  authGuard,
  roleGuard([ROLES.PASSENGER, ROLES.USER]), 
  RidesController.createRide
);

/**
 * GET /pending/direct
 * Viajes para conductores de Moto (Directos).
 */
router.get(
  "/pending/direct",
  authGuard,
  roleGuard([ROLES.DRIVER]),
  RidesController.listPendingDirectRides
);

/**
 * GET /pending/cooperative/:cooperativeName
 * Viajes para Despachadores de Cooperativa.
 */
router.get(
  "/pending/cooperative/:cooperativeName",
  authGuard,
  roleGuard([ROLES.ADMIN, ROLES.DESPATCH]),
  RidesController.listPendingByCooperative
);

/**
 * GET /my-rides
 * Historial del usuario o conductor.
 */
router.get(
  "/my-rides",
  authGuard,
  RidesController.myRides
);

/**
 * GET /:id
 * Detalle de un viaje por ID.
 */
router.get(
  "/:id",
  authGuard,
  RidesController.getRideById
);

/**
 * PATCH /:id/status
 * Actualizar estado (Aceptar, Cancelar, etc.)
 */
router.patch(
  "/:id/status",
  authGuard,
  RidesController.updateStatus
);

// --- RUTAS DE EJECUCIÓN DEL VIAJE (TRIP CONTROLLER) ---

router.put(
  "/:id/start",
  authGuard,
  roleGuard([ROLES.DRIVER]),
  TripController.startTrip
);

router.put(
  "/:id/end",
  authGuard,
  roleGuard([ROLES.DRIVER]),
  TripController.endTrip
);

router.put(
  "/assign",
  authGuard,
  roleGuard([ROLES.ADMIN, ROLES.DESPATCH]),
  TripController.assignDriver
);

export default router;