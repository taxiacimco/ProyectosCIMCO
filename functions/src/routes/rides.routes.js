// Versión Arquitectura: V2.1 - Saneamiento de Middlewares
/**
 * functions/src/routes/rides.routes.js
 * Configuración de rutas centralizada para el módulo de viajes (rides).
 * TAXIA CIMCO - Soporte para Mototaxis, Motocargas y Cooperativas Intermunicipales.
 */
import { Router } from "express";

// 🔐 Middlewares (Rutas corregidas)
import { authGuard } from "../middleware/auth.middleware.js"; // FIX: Era auth.guard.js
import roleGuard from "../middleware/role.guard.js";

// 🎭 Roles
import ROLES from "../config/app.roles.js";

// 🎮 Controllers
import RidesController from "../modules/rides/controllers/rides.controller.js";

const router = Router();

/**
 * POST / - Crear solicitud (Pasajero)
 */
router.post(
  "/",
  authGuard,
  roleGuard([ROLES.PASSENGER, ROLES.USER]), 
  RidesController.createRide
);

/**
 * POST /aceptar - Conductor toma el servicio
 */
router.post(
  "/aceptar",
  authGuard,
  roleGuard([ROLES.DRIVER]),
  RidesController.aceptarViaje
);

/**
 * GET /pending/direct - Radar de Motos
 */
router.get(
  "/pending/direct",
  authGuard,
  roleGuard([ROLES.DRIVER]),
  RidesController.listPendingDirectRides
);

/**
 * GET /pending/cooperative/:cooperativeName - Panel Despacho
 */
router.get(
  "/pending/cooperative/:cooperativeName",
  authGuard,
  roleGuard([ROLES.ADMIN, ROLES.DESPATCH]),
  RidesController.listPendingByCooperative
);

/**
 * GET /me - Historial del usuario/conductor
 */
router.get(
  "/me",
  authGuard,
  RidesController.myRides
);

/**
 * GET /:id - Detalle individual
 */
router.get(
  "/:id",
  authGuard,
  RidesController.getRideById
);

/**
 * PATCH /:id/status - Control de flujo (Iniciar/Finalizar)
 */
router.patch(
  "/:id/status",
  authGuard,
  RidesController.updateStatus
);

export default router;