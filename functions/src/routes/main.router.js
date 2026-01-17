/**
 * functions/src/routes/main.router.js
 * Enrutador principal: Conecta todos los módulos de la aplicación.
 */

import { Router } from 'express';

// IMPORTACIONES DE RUTAS DE MÓDULOS
import authRouter from './auth.routes.js';
import ridesRouter from './rides.routes.js';   // Viajes (Pasajeros/Mototaxi/Motocarga)
import driverRouter from './driver.routes.js'; // Gestión del Conductor (Online/Documentos)
import adminRouter from './admin.routes.js';   // Panel CEO/Admin
import despatchRouter from './despatch.routes.js'; // Despacho Intermunicipal
import passwordRouter from './password.routes.js'; // Recuperación de contraseñas

const router = Router();

/**
 * Health Check - Para verificar que la API responde
 * Ruta: .../api/health
 */
router.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'TAXIA-CIMCO-BACKEND',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString() 
    });
});

// ============================================================
// ENLACE DE MÓDULOS (LA ESTRUCTURA DE RUTAS)
// ============================================================

// 1. Gestión de Usuarios y Acceso (Todas las Apps)
router.use('/auth', authRouter);
router.use('/password', passwordRouter);

// 2. Operaciones de Viaje (Pasajero, Mototaxi, MotoParrillero, Motocarga)
// Esta ruta centraliza la lógica de pedidos y servicios
router.use('/v1/rides', ridesRouter);

// 3. Módulo de Conductores (Estado de disponibilidad, perfiles)
router.use('/drivers', driverRouter);

// 4. Módulo Intermunicipal (Despachador y Conductor Intermunicipal)
router.use('/despatch', despatchRouter);

// 5. Módulo Administrativo (Control total para el CEO)
router.use('/admin', adminRouter);

export default router;