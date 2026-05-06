// Versión Arquitectura: V3.0 - Rutas de Despacho Híbrido
/**
 * functions/src/routes/rides.routes.js
 * Configuración de rutas centralizada para el módulo de viajes (rides).
 * TAXIA CIMCO - Soporte para Mototaxis (Directo) y Cooperativas (Despachador).
 */
import { Router } from "express";

// 🔐 Middlewares
import { authGuard } from "../middleware/auth.middleware.js"; 
import roleGuard from "../middleware/role.guard.js";

// 🎭 Roles
import ROLES from "../config/app.roles.js";

// 🎮 Controllers
import RidesController from "../modules/rides/controllers/rides.controller.js";

const router = Router();

/**
 * 🏍️ POST /request/direct - Crear solicitud para motos (Va al radar)
 */
router.post(
  "/request/direct",
  authGuard,
  roleGuard([ROLES.PASSENGER, ROLES.USER]), 
  RidesController.createDirectRide
);

/**
 * 🚌 POST /request/cooperative - Crear solicitud Intermunicipal (Va al despachador)
 */
router.post(
  "/request/cooperative",
  authGuard,
  roleGuard([ROLES.PASSENGER, ROLES.USER]), 
  RidesController.createCooperativeRide
);

/**
 * 🟢 POST /aceptar - Conductor o Despachador asigna el servicio
 */
router.post(
  "/aceptar",
  authGuard,
  roleGuard([ROLES.DRIVER, ROLES.DESPATCH]), // Añadido DESPATCH para que puedan asignar
  RidesController.aceptarViaje
);

/**
 * 📡 GET /pending/direct - Radar de Motos (Solo conductores directos)
 */
router.get(
  "/pending/direct",
  authGuard,
  roleGuard([ROLES.DRIVER]),
  RidesController.listPendingDirectRides
);

/**
 * 🏢 GET /pending/cooperative/:cooperativeName - Taquilla de la Cooperativa
 */
router.get(
  "/pending/cooperative/:cooperativeName",
  authGuard,
  roleGuard([ROLES.ADMIN, ROLES.DESPATCH]),
  RidesController.listPendingByCooperative
);

/**
 * 👤 GET /me - Historial del usuario/conductor
 */
router.get(
  "/me",
  authGuard,
  RidesController.myRides
);

/**
 * 🔍 GET /:id - Detalle individual
 */
router.get(
  "/:id",
  authGuard,
  RidesController.getRideById
);

/**
 * 🔄 PATCH /:id/status - Control de flujo (Iniciar/Finalizar)
 */
router.patch(
  "/:id/status",
  authGuard,
  RidesController.updateStatus
);

export default router;