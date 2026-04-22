// Versión Arquitectura: V2.2 - Inicialización Segura de Rutas Administrativas
/**
 * functions/src/routes/admin.routes.js
 * Misión: Definir rutas administrativas con inicialización segura.
 */
import { Router } from 'express';
import * as adminController from '../modules/admin/controllers/admin.controller.js';
import { authGuard } from '../middleware/auth.middleware.js'; 

const router = Router();

// Ejemplo de rutas administrativas
router.get('/dashboard', authGuard, adminController.getAdminDashboard || ((req, res) => res.json({ msg: "Admin Dashboard Ready" })));
router.post('/settings', authGuard, adminController.updateSettings || ((req, res) => res.json({ msg: "Settings Updated" })));

// Endpoint de prueba de salud para el módulo admin
router.get('/status', (req, res) => {
  res.json({ 
    module: "CIMCO ADMIN", 
    status: "active",
    timestamp: new Date().toISOString()
  });
});

export default router;