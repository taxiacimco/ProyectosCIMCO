// Versión Arquitectura: V1.3 - Optimización de Carga Crítica (Anti-Timeout)
/**
 * functions/src/index.js
 * Misión: Bootloader ultra-rápido para TAXIA CIMCO.
 * Ajuste: Se elimina la carga pesada del inicio para evitar el Timeout de 10s.
 */

import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";

const app = express();

// Middlewares básicos (se ejecutan rápido)
app.use(cors({ origin: true }));
app.use(express.json());

// 🛡️ ENDPOINT: Webhook de Wompi con Carga Perezosa
app.post("/webhook/wompi", async (req, res) => {
    try {
        // Importación dinámica: Solo carga el controlador cuando llega un mensaje
        const { webhookController } = await import("./modules/wallet/controllers/webhook.controller.js");
        return webhookController(req, res);
    } catch (error) {
        console.error("❌ Error cargando el controlador:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 🩺 Health Check: Para verificar que la API está viva
app.get("/health", (req, res) => {
    res.status(200).send({ status: "ok", service: "TAXIA-CIMCO-API" });
});

// Exposición de la API con configuración de rendimiento
export const api = onRequest({ 
    region: "us-central1",
    timeoutSeconds: 60, // Aumentamos el tiempo de ejecución
    memory: "256MiB",
    maxInstances: 10 
}, app);