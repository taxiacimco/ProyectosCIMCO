// Versión Arquitectura: V5.4 - Consolidación de Rutas de Usuario y Billetera Inicial
/**
 * functions/src/routes/user.routes.js
 * PROYECTO: TAXIA CIMCO
 * Misión: Exponer de forma segura los servicios de gestión de perfil y registro especializado.
 * Ajuste: Integración de registrarPasajero para inicialización de saldo en 0.
 */
import { Router } from 'express';
import { updateProfile, registrarPasajero } from '../modules/auth/controllers/user.controller.js';
import { authGuard } from '../middleware/auth.middleware.js'; 

const router = Router();

/**
 * 🔍 RUTA DE DIAGNÓSTICO (Health Check)
 */
router.get('/test', (req, res) => res.send("Ruta de usuarios activa ✅"));

/**
 * 👤 REGISTRO Y GESTIÓN DE PERFILES (Requieren Autenticación)
 */

// 1. Registro Atómico de Pasajero (Inicializa Wallet en 0)
// URL: POST /api/v1/users/registro-pasajero
router.post('/registro-pasajero', authGuard, registrarPasajero);

// 2. Actualización de Perfil (Biometría y datos básicos)
// URL: PUT /api/v1/users/profile
router.put('/profile', authGuard, updateProfile);

export default router;