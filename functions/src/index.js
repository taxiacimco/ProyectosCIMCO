// Versión Arquitectura: V5.22 - Fusión Atómica de Módulos e Inicialización Perezosa Anti-Timeout
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\functions\src\index.js
 * Misión: Punto de entrada único para Cloud Functions V2 optimizado para entornos locales lentos en Windows.
 * Ajuste V5.22: Integración total y quirúrgica de la carga dinámica perezosa (Lazy-load) en el ciclo de vida del Request Handler.
 * Se erradican por completo los quiebres por timeout de 10000ms en el CLI de Firebase Emulators, garantizando el aislamiento absoluto.
 * Se aplican guardas de seguridad contra valores nulos (Anti-Undefined) para preservar la estabilidad operacional de la pasarela Wompi.
 */

import { onRequest } from "firebase-functions/v2/https";

// 🚀 EXPORTACIÓN ATÓMICA V2 - AISLAMIENTO ABSOLUTO ANTI-TIMEOUT
export const api = onRequest({
    timeoutSeconds: 60,
    memory: "256MiB",
    cors: true,
    maxInstances: 10
}, async (req, res) => {
    try {
        // 🛡️ Inicialización perezosa (Lazy-load) de Firebase Admin estrictamente en ejecución
        const { default: admin } = await import("firebase-admin");
        if (!admin?.apps?.length) {
            admin.initializeApp();
        }

        // Carga dinámica diferida de Express y Cors para liberar el hilo del CLI de Firebase
        const express = (await import("express"))?.default;
        const cors = (await import("cors"))?.default;
        
        if (!express || !cors) {
            throw new Error("No se pudieron resolver las dependencias críticas del núcleo (Express/Cors).");
        }
        
        const app = express();
        app.use(cors({ origin: true }));
        app.use(express.json());

        // Ruta del Webhook de Billetera Wompi encapsulada
        app.post("/v1/wallet/webhook", async (webhookReq, webhookRes) => {
            try {
                // Blindaje Anti-Undefined sobre el payload entrante de la pasarela
                if (!webhookReq?.body) {
                    return webhookRes.status(400).json({ success: false, message: "Payload del webhook inválido o ausente." });
                }

                const { recibirAlertaWompi } = await import("./modules/wallet/controllers/webhook.controller.js");
                if (typeof recibirAlertaWompi !== "function") {
                    throw new Error("El controlador recibirAlertaWompi no se exportó correctamente.");
                }

                return await recibirAlertaWompi(webhookReq, webhookRes);
            } catch (err) {
                console.error("🚨 [CIMCO-WEBHOOK-FATAL] Error en controlador:", err?.message || err);
                return webhookRes.status(500).json({ success: false, message: "Error interno en webhook." });
            }
        });

        // Health Check Operacional
        app.get("/health", (webhookReq, webhookRes) => {
            return webhookRes.status(200).json({ status: "online", node: "Functions-V2-Lazy" });
        });

        // Entregar la petición entrante al motor Express recién montado
        return app(req, res);
    } catch (criticalError) {
        console.error("🚨 [CIMCO-BOOTSTRAP-ERROR] Fallo crítico al instanciar el entorno de ejecución:", criticalError?.message || criticalError);
        return res.status(500).json({ success: false, message: "Fallo en el arranque del servicio central." });
    }
});