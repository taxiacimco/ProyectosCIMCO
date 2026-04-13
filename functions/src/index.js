// Versión Arquitectura: V2.1 - Consolidación de API y Triggers Activos
/**
 * functions/src/index.js
 * PROYECTO: TAXIA CIMCO - Sistema Integrado
 * Misión: Punto de entrada principal. Expone la API Express y los Triggers
 * de Firestore para el ecosistema de producción y emuladores.
 */

// 1. Carga de entorno (Debe ser la primera acción para configurar secretos/vars)
import { loadEnv } from './config/env/env.loader.js';
loadEnv();

import express from 'express';
import { onRequest } from "firebase-functions/v2/https";
import mainRouter from './routes/main.router.js';

// 2. Configuración de la Aplicación Express
const app = express();

// Middlewares base para procesamiento de JSON y Rutas
app.use(express.json());

// Registro de rutas modulares del sistema (mainRouter centraliza los módulos)
app.use('/', mainRouter);

/**
 * 🌍 API GATEWAY: Centraliza todos los endpoints bajo la Cloud Function 'api'
 * Configuración optimizada para evitar arranques en frío (maxInstances: 1)
 */
export const api = onRequest({
    region: "us-central1",
    cors: true,
    maxInstances: 1,
    timeoutSeconds: 120
}, app);

/**
 * ⚡ TRIGGERS DE FIRESTORE (EVENT-DRIVEN ARCHITECTURE)
 * Exportación explícita para que Firebase CLI registre las funciones.
 */

// Trigger para gestión de saldo y transacciones de billetera (Wallet Module)
export { onNuevaTransaccion } from './triggers/wallet.triggers.js';

// Trigger para despacho automático y notificaciones PUSH de viajes (Rides Module)
// ✅ Integrado con V8.1 para despliegue quirúrgico
export { onViajeCreado } from './triggers/trips.js';