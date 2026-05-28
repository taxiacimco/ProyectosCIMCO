// Versión Arquitectura: V12.1 - Capa de Compatibilidad Homóloga para Endpoints de Acceso (Dual-Sync)
/**
 * Ubicación: backend/src/modules/auth/auth.routes.js
 * Misión: Enrutador de autenticación unificado para TAXIA CIMCO con blindaje preventivo, log de telemetría y resolución de colisión de rutas.
 * NOTA DE ARQUITECTURA: Habilita el mapeo dual para interceptar tanto la raíz '/' como el sub-path '/login', preservando intacta la pasarela de '/register'.
 */

import express from 'express';
// 🛡️ MANTENIMIENTO CORE: Importamos 'loginUsuario' y 'registrarUsuario' conservando el estándar de persistencia
import { loginUsuario, registrarUsuario } from './auth.controller.js';

const router = express.Router();

// 📡 MIDDLEWARE DE TRAZABILIDAD OPERACIONAL: Verificación de Inicialización de Rutas
router.use((req, res, next) => {
    // Log analítico sutil para trazabilidad interna en desarrollo
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📡 [CIMCO-ROUTER] Tráfico entrante detectado: ${req.method} ${req.originalUrl}`);
    }
    next();
});

// 🛡️ GUARDA DE SEGURIDAD LOCAL (Fusión Atómica de Blindaje Anti-Undefined)
const verificarPayloadLogin = (req, res, next) => {
    // Evita el procesamiento si el cuerpo viene corrupto o vacío antes de tocar el controlador
    if (!req.body || Object.keys(req.body).length === 0) {
        console.error("⚠️ [CIMCO-SEGURIDAD] Intento de transacción bloqueado: Body ausente o indefinido.");
        return res.status(400).json({ success: false, message: "El cuerpo de la solicitud no puede estar vacío." });
    }
    next();
};

/**
 * 🚀 ENDPOINTS DE ACCESO: Matriz de Compatibilidad Híbrida
 * Se exponen los canales de entrada para dar soporte unificado al frontend actual y contingencias heredadas.
 */

// 🔄 Mapeo Dual para el Login (Capa de Compatibilidad Homóloga)
router.post('/', verificarPayloadLogin, loginUsuario);
router.post('/login', verificarPayloadLogin, loginUsuario);

// 📦 Preservación Atómica del flujo de Registro (Operación Dual-Sync)
router.post('/register', verificarPayloadLogin, registrarUsuario);

export default router;