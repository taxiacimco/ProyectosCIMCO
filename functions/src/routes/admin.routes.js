// Versión Arquitectura: V4.1 - Optimización de Endpoints de Salud y Gateway
/**
 * functions/src/routes/main.router.js
 * PROYECTO: TAXIA CIMCO
 * Misión: Enrutador Maestro (Gateway). Centraliza y distribuye las peticiones hacia todos los módulos.
 * Ajuste: Limpieza de prefijos redundantes en el Health Check para asegurar consistencia en el routing.
 */

import { Router } from "express";

// 📦 Importación de todos los sub-enrutadores del ecosistema
import adminRoutes from "./admin.routes.js"; 
import walletRoutes from "./wallet.routes.js"; 
import authRoutes from "./auth.routes.js";
import despatchRoutes from "./despatch.routes.js";
import driverRoutes from "./driver.routes.js";
import notificationRoutes from "./notification.routes.js";
import passwordRoutes from "./password.routes.js";
import ridesRoutes from "./rides.routes.js";
import userRoutes from "./user.routes.js";
import whatsappRouter from "./whatsapp.router.js";

const router = Router();

/**
 * 🛡️ REGISTRO DE MÓDULOS (Endpoints Base)
 * Estos se montan sobre el prefijo definido en el index.js (usualmente /api/v1)
 */
router.use("/admin", adminRoutes);
router.use("/wallet", walletRoutes); 
router.use("/auth", authRoutes);
router.use("/despatch", despatchRoutes);
router.use("/driver", driverRoutes);
router.use("/notifications", notificationRoutes);
router.use("/password", passwordRoutes);
router.use("/rides", ridesRoutes);
router.use("/user", userRoutes);
router.use("/whatsapp", whatsappRouter);

/**
 * 🧪 ENDPOINT DE SALUD (HEALTH CHECK)
 * Misión: Validar la disponibilidad de la API sin redundancia de versión.
 * URL Resultante: /api/v1/health
 */
router.get("/health", (req, res) => {
  res.json({ 
    status: "online", 
    service: "TAXIA CIMCO API", 
    version: "V4.0",
    timestamp: new Date().toISOString()
  });
});

/**
 * 🧪 ALIAS DE ESTADO
 * Misión: Respuesta rápida para monitoreo de uptime.
 */
router.get("/status", (req, res) => res.send("CIMCO API ACTIVE"));

export default router;