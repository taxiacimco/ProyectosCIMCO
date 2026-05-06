// Versión Arquitectura: V7.5 - Centralización Total de Módulos (Super Gateway)
/**
 * functions/src/routes/main.router.js
 * PROYECTO: TAXIA CIMCO
 * MISIÓN: Centralizar y distribuir el tráfico de TODA la API v1, conectando
 *         todos los sub-módulos operativos del sistema.
 */
import { Router } from 'express';

// 1. Controladores Directos
import * as userController from '../modules/auth/controllers/user.controller.js';

// 2. Importación de Sub-rutas (Módulos del Sistema)
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import walletRoutes from './wallet.routes.js';
import driverRoutes from './driver.routes.js';
import ridesRoutes from './rides.routes.js';
import despatchRoutes from './despatch.routes.js';
import notificationRoutes from './notification.routes.js';
import passwordRoutes from './password.routes.js';

const router = Router();

/**
 * 🚀 RUTAS CRÍTICAS DIRECTAS
 * Bypass de middlewares para operaciones iniciales
 */
router.post('/registrarUsuario', userController.registrar);

/**
 * 🛰️ DISTRIBUCIÓN DE MÓDULOS (Enrutamiento Base)
 * Conectando todas las rutas huérfanas al Gateway principal
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/wallet', walletRoutes);
router.use('/drivers', driverRoutes);
router.use('/rides', ridesRoutes);
router.use('/despatch', despatchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/password', passwordRoutes);

/**
 * 🛠️ MIDDLEWARE DE SALUD (Health Check)
 */
router.get('/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: "API TAXIA CIMCO - Operativa y Todos los Módulos Sincronizados",
        timestamp: new Date().toISOString() 
    });
});

/**
 * 🛠️ EXPORTACIÓN PRINCIPAL
 * Misión: Vincular este router a la instancia principal de Express.
 */
export default (app) => {
    if (!app || typeof app.use !== 'function') {
        console.error("⚠️ [ALERTA DE ARQUITECTURA] La instancia de Express no es válida en main.router");
        return;
    }
    // Montamos el router en la raíz del prefijo /v1 definido en index.js
    app.use('/', router); 
};