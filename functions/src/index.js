// Versión Arquitectura: V4.9 - Gateway de Alta Disponibilidad
import { loadEnv } from './config/env/env.loader.js';
loadEnv();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { onRequest } from "firebase-functions/v2/https";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}

const app = express();

// 🛡️ SEGURIDAD CIMCO: Permitir la ejecución del Widget de Wompi
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ✅ CORS: Configuración específica para el entorno local de Firebase
app.use(cors({ 
    origin: true, 
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json());

/**
 * 🚀 ROUTING: Delegación al mainRouter
 */
app.use("/v1", async (req, res, next) => {
    try {
        const { default: mainRouter } = await import('./routes/main.router.js');
        return mainRouter(req, res, next);
    } catch (error) {
        console.error("🔴 Error Crítico Gateway:", error);
        res.status(500).json({ success: false, message: "Error interno en Gateway" });
    }
});

export const api = onRequest({
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true 
}, app);