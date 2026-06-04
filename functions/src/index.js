// Versión Arquitectura: V5.14 - Optimización de Inicialización Cold Start y Enlace Wompi
/**
 * Ubicación: functions/src/index.js
 * Misión: Punto de entrada único para Cloud Functions V2.
 * Configura Express para manejar el tráfico del Webhook de Wompi de forma resiliente.
 */

import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import admin from "firebase-admin";

// 🚀 ENLACE CORREGIDO: Importación del controlador unificado con el nombre exacto
import { recibirAlertaWompi } from "./modules/wallet/controllers/webhook.controller.js";

// 🛡️ INICIALIZACIÓN CRÍTICA: Lazy Loading de Firebase Admin SDK para evitar Timeouts
if (!admin.apps.length) {
    admin.initializeApp();
    console.log("✅ [CIMCO-FIREBASE] Admin SDK inicializado correctamente.");
}

const app = express();

// 🛡️ Middleware de Seguridad y Parseo
app.use(cors({ origin: true }));
app.use(express.json());

const router = express.Router();

// 🚀 RUTA VINCULADA: Registro del Webhook enlazado a la función de tesorería
router.post("/v1/wallet/webhook", recibirAlertaWompi);

// Health check táctico
router.get("/health", (req, res) => {
    res.status(200).json({ 
        status: "online", 
        project: "TaxiA-CIMCO",
        timestamp: new Date().toISOString()
    });
});

// Doble montaje para máxima compatibilidad de pasarelas
app.use("/api", router);
app.use("/", router);

// 🌏 Exportación optimizada de la Cloud Function V2
export const api = onRequest({ 
    region: "us-central1",
    maxInstances: 10,
    timeoutSeconds: 30, // ⬆️ Incrementado para evitar cuelgues del emulador local
    memory: "256MiB"
}, app);