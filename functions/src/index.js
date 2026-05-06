// Versión Arquitectura: V7.6 - Adaptación Híbrida (Servidor Independiente Render/Local)
/**
 * functions/src/index.js
 * PROYECTO: TAXIA CIMCO
 * MISIÓN: Punto de entrada híbrido. Funciona como API REST independiente en 
 * servidores como Render o Localhost, y mantiene compatibilidad con Firebase V2.
 */

import { loadEnv } from './config/env/env.loader.js';
loadEnv(); // 🛡️ Cargamos variables de entorno

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { onRequest } from "firebase-functions/v2/https";
import { auth } from "firebase-functions/v1"; 
import admin from "firebase-admin";
import { FieldValue } from 'firebase-admin/firestore';

// Importación del Enrutador Maestro
import mainRouter from './routes/main.router.js';

// 🚀 Inicialización de Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.GCLOUD_PROJECT || "pelagic-chalice-467818-e1",
        credential: admin.credential.applicationDefault() 
    });
}

const app = express();

// Middlewares Globales
app.use(cors({ origin: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

/**
 * 🛰️ INICIALIZACIÓN DE RUTAS CIMCO
 */
try {
    const v1Router = express.Router();
    app.use('/v1', v1Router);
    mainRouter(v1Router);
    console.log("✅ [CIMCO RUTER] Rutas V1 cargadas exitosamente.");
} catch (error) {
    console.error("❌ [ERROR CRÍTICO] Fallo al inicializar Main Router:", error);
}

// Manejador de Rutas No Encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada en el Gateway CIMCO: ${req.originalUrl}`
    });
});

// ============================================================================
// 🌍 MOTOR DE SERVIDOR INDEPENDIENTE (RENDER / LOCALHOST)
// ============================================================================
// Esto permite que la API viva sin depender de Firebase Cloud Functions
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 [CIMCO SERVER] Servidor Operativo y escuchando en el puerto ${PORT}`);
    console.log(`📡 Endpoint base: http://localhost:${PORT}/v1`);
});

// ============================================================================
// 📦 EXPORTACIONES LEGACY (Mantenidas por Fusión Atómica)
// ============================================================================

export const api = onRequest({
    memory: "256MiB",
    region: "us-central1",
    maxInstances: 10,
    timeoutSeconds: 60,
    invoker: "public"
}, app);

export const onUserCreated = auth.user().onCreate(async (user) => {
    const db = admin.firestore();
    const { uid, email, displayName, photoURL, phoneNumber } = user;

    const userRef = db.collection('artifacts')
                      .doc('taxiacimco-app')
                      .collection('public')
                      .doc('data')
                      .collection('usuarios')
                      .doc(uid);

    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            const userData = {
                uid,
                email: email || '',
                displayName: displayName || 'Pasajero Nuevo',
                phone: phoneNumber || '',
                photoURL: photoURL || '',
                user_type: 'PASAJERO',
                role: 'PASAJERO',
                status: 'active',
                saldoWallet: 0,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                isActive: true
            };
            await userRef.set(userData);
            console.log(`✅ [Trigger V1] Perfil creado para: ${uid}`);
        }
    } catch (error) {
        console.error(`❌ [Trigger Error] Fallo al crear perfil para ${uid}:`, error);
    }
});