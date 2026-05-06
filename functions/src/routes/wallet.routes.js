// Versión Arquitectura: V5.5 - Integración de Cobro Automático de Comisiones
/**
 * functions/src/routes/wallet.routes.js
 * PROYECTO: TAXIA CIMCO
 * Misión: Exponer servicios financieros y automatización de cobros por rol.
 * Ajuste: Se añade endpoint /commission para procesar débitos automáticos del SISTEMA.
 */

import { Router } from 'express';
import { 
    generatePaymentIntent, 
    rechargeBalance, 
    getBalance, 
    debitBalance,
    getHistory,
    processServiceCommission 
} from '../modules/wallet/controllers/wallet.controller.js';
import { handleWompiWebhook } from '../modules/wallet/controllers/webhook.controller.js';
import { authGuard } from '../middleware/auth.middleware.js'; 

const router = Router();

/**
 * 🔍 RUTA DE DIAGNÓSTICO (Health Check)
 */
router.get('/test', (req, res) => res.send("Ruta de wallet activa ✅"));

/**
 * 🎯 CONCILIACIÓN DE PAGOS (Webhook Público)
 * Wompi requiere que este endpoint no tenga authGuard para recibir notificaciones externas.
 */
router.post('/webhook', handleWompiWebhook);

/**
 * 🔐 RUTAS PRIVADAS (Requieren Autenticación)
 */

// 1. Motor de Intenciones de Pago (Generación de firmas Wompi)
router.post('/payment-intent', authGuard, generatePaymentIntent);

// 2. Operación de Recarga (Admin/Sistema)
router.post('/recharge', authGuard, rechargeBalance);

// 3. Consulta de Billetera (Saldo actual y metadatos)
router.get('/balance/:uid?', authGuard, getBalance);

// 4. Débito Manual (Legacy o ajustes excepcionales)
router.post('/debit', authGuard, debitBalance);

// 5. Historial de Transacciones (Filtra por targetUid del usuario autenticado)
router.get('/history', authGuard, getHistory);

// 6. 🤖 COBRO AUTOMÁTICO DE COMISIÓN (V5.5)
// Misión: Procesar descuentos del 10% o tarifas fijas según el rol del conductor.
// URL: /api/v1/wallet/commission
router.post('/commission', authGuard, processServiceCommission);

export default router;