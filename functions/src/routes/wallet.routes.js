// Versión Arquitectura: V3.5 - Refactor de Importaciones Nombradas y Estabilización de Gateway
/**
 * functions/src/routes/wallet.routes.js
 * PROYECTO: TAXIA CIMCO
 * Misión: Exponer servicios financieros y asegurar la resolución de controladores.
 * Ajuste: Se fuerza importación nombrada para evitar fallos de referencia en el Router de Express.
 */

import { Router } from 'express';
import { 
    generatePaymentIntent, 
    rechargeNequi, 
    rechargeManualAdmin, 
    getBalance, 
    debitBalance, 
    getHistory 
} from '../modules/wallet/controllers/wallet.controller.js';
import { handleWompiWebhook } from '../modules/wallet/controllers/webhook.controller.js';
import { authGuard } from '../middleware/auth.middleware.js'; 

const router = Router();

/**
 * 🧪 RUTA DE PRUEBA PÚBLICA (Bypass temporal para Widget Wompi)
 */
router.post('/test-signature', generatePaymentIntent);

/**
 * 🔐 RUTAS PRIVADAS (Requieren Autenticación)
 */
// Motor de Intenciones de Pago
router.post('/payment-intent', authGuard, generatePaymentIntent);

// Operaciones de Billetera y Saldos
router.post('/recharge', authGuard, rechargeNequi);
router.post('/admin/recharge', authGuard, rechargeManualAdmin);
router.get('/balance/:uid?', authGuard, getBalance);
router.post('/debit', authGuard, debitBalance);

// Historial de Transacciones
router.get('/history/:uid', authGuard, getHistory);

/**
 * 🌍 RUTAS PÚBLICAS (Webhooks)
 */
router.post('/webhook', handleWompiWebhook);

export default router;