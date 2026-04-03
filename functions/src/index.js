/**
 * PROYECTO: TAXIA CIMCO - Entry Point Centralizado (Backend V2)
 * Arquitectura: ESM / Node.js 20+
 * Misión: Orquestación de API Express y Triggers de Firestore.
 */

// 1. Carga de entorno (Sincronización de variables críticas)
import { loadEnv } from './config/env/env.loader.js';
loadEnv(); 

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// 2. Importaciones de Firebase Functions V2
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore"; 
import { onSchedule } from "firebase-functions/v2/scheduler"; 

// 3. Inicialización del Singleton de Firebase Admin
import admin from './firebase/firebase-admin.js'; 

// 4. Importación de lógica de negocio y utilidades
import mainRouter from './routes/main.router.js';
import { checkGpsHealth } from './modules/driver/services/gps-sentinel.service.js';
import { enviarNotificacionPush } from './utils/notificaciones.js';

const app = express();
const appId = 'taxiacimco-app';

// --- MIDDLEWARES DE SEGURIDAD Y DIAGNÓSTICO ---
app.use(helmet()); // Protección de cabeceras
app.use(cors({ origin: true }));
app.use(express.json());
app.use(morgan('dev')); // Log de peticiones en consola para detectar errores 4xx/5xx

// --- RUTA SAGRADA DE API ---
app.use('/api/v1', mainRouter);

/**
 * MIDDLEWARE DE DETECCIÓN DE ERRORES QUIRÚRGICO
 * Captura fallos en la lógica de negocio, colisiones de Firebase o errores de sintaxis.
 */
app.use((err, req, res, next) => {
    console.error("🚨 [ALERTA DE ARQUITECTURA - ERROR DETECTADO]:", {
        message: err.message,
        stack: err.stack,
        path: req.path,
        timestamp: new Date().toISOString()
    });

    res.status(err.status || 500).json({
        success: false,
        error: "Internal System Error - CIMCO Core",
        code: err.code || "UNKNOWN_ERROR",
        // Solo enviamos el mensaje en desarrollo para facilitar el debug
        details: process.env.NODE_ENV === 'development' ? err.message : "Consulte logs del sistema."
    });
});

// --- EXPORTACIÓN DE LA API (HTTPS V2) ---
export const api = onRequest({
    region: "us-central1",
    memory: "256MiB",
    maxInstances: 10
}, app);

// --- TRIGGERS DE FIRESTORE (ESTRUCTURA SAGRADA) ---

/**
 * Trigger: Notificación de Viaje Asignado
 * Detecta cuando un despachador asigna un conductor a un viaje.
 */
export const onViajeAsignado = onDocumentUpdated(
    "artifacts/taxiacimco-app/public/data/viajes/{viajeId}",
    async (event) => {
        const newData = event.data.after.data();
        const previousData = event.data.before.data();

        // Lógica de detección: Cambio de estado a 'despachado'
        if (newData && previousData && newData.estado === 'despachado' && previousData.estado !== 'despachado') {
            const conductorId = newData.conductorId;
            if (!conductorId) return null;

            try {
                // Búsqueda en la Ruta Sagrada de Perfiles
                const userSnap = await admin.firestore()
                    .doc(`artifacts/${appId}/public/data/usuarios/${conductorId}`)
                    .get();

                if (userSnap.exists && userSnap.data().fcmTokens) {
                    const tokens = userSnap.data().fcmTokens; // Usamos el nuevo array multidisciplina
                    
                    const promises = tokens.map(token => 
                        enviarNotificacionPush(
                            token, 
                            {
                                titulo: '🚨 ¡VIAJE ASIGNADO!',
                                cuerpo: `Recoger en: ${newData.puntoRecogidaManual || 'Punto acordado'}. Valor: $${newData.valorOfertado || 'Ver app'}`
                            },
                            {
                                clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                                viajeId: event.params.viajeId,
                                type: 'ASSIGNMENT'
                            }
                        )
                    );
                    await Promise.all(promises);
                }
            } catch (error) {
                console.error("❌ [Trigger Error] Fallo al enviar push multidispositivo:", error);
            }
        }
        return null;
    }
);

/**
 * Trigger: Sincronización de Viajes Intermunicipales
 */
export const onViajeIntermunicipalCreated = onDocumentCreated(
    "artifacts/taxiacimco-app/public/data/viajes_inter/{viajeId}",
    async (event) => {
        console.log(`📦 [CIMCO] Nuevo viaje intermunicipal detectado: ${event.params.viajeId}`);
        // Lógica de auditoría o validación de saldos aquí...
        return null;
    }
);

// --- TAREAS PROGRAMADAS (SENTINEL) ---

/**
 * Sentinel: Verificación de Salud del GPS
 * Se ejecuta cada 5 minutos para detectar conductores con señal perdida.
 */
export const sentinelGpsHealth = onSchedule("every 5 minutes", async (event) => {
    console.log("🛰️ [Sentinel] Iniciando escaneo de salud de flota...");
    await checkGpsHealth();
});

// --- INICIALIZACIÓN PARA PRUEBAS LOCALES (node src/index.js) ---
if (process.env.NODE_ENV !== 'production' && import.meta.url.includes(process.argv[1])) {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`
        🚀 TAXIA CIMCO BACKEND ACTIVO
        📡 Modo: DETECCIÓN DE ERRORES (Development)
        🔗 Puerto local: http://localhost:${PORT}
        📍 API Base: http://localhost:${PORT}/api/v1
        -------------------------------------------
        `);
    });
}