/**
 * routes/wallet.routes.js
 * Definición de endpoints financieros - TAXIA CIMCO
 */
import { Router } from 'express';
import walletController from '../modules/wallet/controllers/wallet.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @route POST /wallet/recharge
 * @desc  Inicia una solicitud de recarga vía Nequi (Para el Usuario/Conductor)
 * @access Private
 */
router.post('/recharge', authMiddleware, walletController.rechargeNequi);

/**
 * @route POST /wallet/admin/recharge
 * @desc  Procesa una recarga manual (Solo para el Panel Administrativo)
 * @access Private/Admin
 */
router.post('/admin/recharge', authMiddleware, walletController.rechargeManualAdmin);

/**
 * @route GET /wallet/balance/:uid?
 * @desc  Consulta de saldo actual
 */
router.get('/balance/:uid?', authMiddleware, walletController.getBalance);

export default router;