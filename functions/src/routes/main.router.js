/**
 * functions/src/routes/main.router.js
 * Enrutador principal: Conecta todos los módulos de la aplicación TAXIA CIMCO.
 */

import { Router } from 'express';
import HttpResponse from '../utils/http-response.js';

import authRouter from './auth.routes.js';
import ridesRouter from './rides.routes.js';       
import driverRouter from './driver.routes.js';     
import adminRouter from './admin.routes.js';       
import despatchRouter from './despatch.routes.js'; 
import passwordRouter from './password.routes.js'; 
import notificationRouter from './notification.routes.js'; 
import whatsappRouter from './whatsapp.router.js'; 

const router = Router();

// ============================================================
// HEALTH CHECK (Monitoreo del sistema)
// ============================================================
router.get('/health', (req, res) => {
    return HttpResponse.ok(res, {
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    }, "API TAXIA-CIMCO Operativa");
});

// ============================================================
// ENLACE DE MÓDULOS (ESTRUCTURA PLANA Y LIMPIA)
// ============================================================

router.use('/auth', authRouter);
router.use('/password', passwordRouter);

// ✅ Ruta de viajes unificada (Se eliminó el /v1)
router.use('/rides', ridesRouter);

router.use('/drivers', driverRouter);
router.use('/despatch', despatchRouter);
router.use('/admin', adminRouter);
router.use('/notifications', notificationRouter);
router.use('/whatsapp', whatsappRouter);

// 🚨 CAPTURADOR DE RUTAS INEXISTENTES (404 FALLBACK)
router.use('*', (req, res) => {
    return HttpResponse.notFound(res, `La ruta [${req.method}] ${req.originalUrl} no existe en el servidor TAXIA CIMCO.`);
});

export default router;