// Versión Arquitectura: V1.0 - Bootloader de API Central
import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";

// Importación quirúrgica de rutas (Wallet/Webhook)
import { webhookController } from "./modules/wallet/controllers/webhook.controller.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 🛡️ ENDPOINT: Webhook de Wompi
app.post("/webhook/wompi", webhookController);

// Exposición de la API
export const api = onRequest({ region: "us-central1" }, app);