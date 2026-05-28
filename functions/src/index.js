// Versión Arquitectura: V5.13 - Alineación Quirúrgica: Enlace Estricto a recibirAlertaWompi (Preservando Recursos)
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

// 🛡️ INICIALIZACIÓN CRÍTICA: Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
    console.log("[CIMCO-FIREBASE] Admin SDK inicializado correctamente.");
}

// 🚀 Inicialización de Express
const app = express();

// 🛡️ Middleware de Seguridad y Parseo (Regla de Fusión Atómica)
app.use(cors({ origin: true }));
app.use(express.json());

const router = express.Router();

// 🚀 RUTA VINCULADA: Registro del Webhook enlazado a la función renombrada
router.post("/v1/wallet/webhook", recibirAlertaWompi);

// Health check para monitoreo del sistema
router.get("/health", (req, res) => {
    res.status(200).json({ 
        status: "online", 
        project: "TaxiA-CIMCO",
        timestamp: new Date().toISOString()
    });
});

// Preservación del doble montaje de rutas para compatibilidad de clientes API y Root
app.use("/api", router);
app.use("/", router);

// 🌏 Exportación de la Cloud Function V2 con Blindaje de Recursos Preservado
export const api = onRequest({ 
    region: "us-central1",
    maxInstances: 10,
    timeoutSeconds: 15,
    memory: "256MiB"
}, app);