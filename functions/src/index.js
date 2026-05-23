// Versión Arquitectura: V5.7 - Normalización de Rutas y Resolución de Point-of-Failure (Cannot POST)
/**
 * functions/src/index.js
 * Misión: Punto de entrada único para Cloud Functions V2.
 * Configura Express para manejar el tráfico del Webhook de Wompi de forma resiliente.
 */

import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";

// 🚀 Inicialización de Express
const app = express();

// 🛡️ Middleware de Seguridad y Parseo
app.use(cors({ origin: true }));
app.use(express.json());

/**
 * 💡 ESTRATEGIA DE RUTEO:
 * Para evitar el error "Cannot POST" debido a la jerarquía de Firebase (/api/api/v1...), 
 * definimos las rutas de forma que respondan correctamente al prefijo de la función.
 */
const router = express.Router();

// Registro del Webhook dentro del router
router.post("/v1/wallet/webhook", async (req, res) => {
    try {
        console.log("📥 Webhook recibido en /v1/wallet/webhook");
        // Carga dinámica del controlador para optimizar el inicio de la función
        const { webhookController } = await import("./modules/wallet/controllers/webhook.controller.js");
        return await webhookController(req, res);
    } catch (error) {
        console.error("❌ Error crítico en el ruteo del Webhook:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error",
            error: error.message 
        });
    }
});

// Health check para monitoreo del sistema
router.get("/health", (req, res) => {
    res.status(200).json({ 
        status: "online", 
        project: "TaxiA-CIMCO",
        timestamp: new Date().toISOString()
    });
});

/**
 * Inyección del Router:
 * Montamos el router en '/api' para que la URL final sea:
 * .../us-central1/api/v1/wallet/webhook (si Firebase no añade el nombre de la función)
 * o .../us-central1/api/api/v1/wallet/webhook (comportamiento estándar del emulador)
 */
app.use("/api", router);
app.use("/", router); // Fallback para asegurar captura en cualquier nivel

// 🌏 Exportación de la Cloud Function V2
export const api = onRequest({ 
    region: "us-central1",
    maxInstances: 10,
    timeoutSeconds: 15,
    memory: "256MiB"
}, app);