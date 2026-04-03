/**
 * modules/wallet/controllers/wallet.controller.js
 * Controlador Maestro de Operaciones Financieras - TAXIA CIMCO
 */
import { getFirestore } from 'firebase-admin/firestore';
import WalletService from "../services/wallet.service.js";
import { asyncHandler } from '../../../middleware/async-handler.js';
import { sendSuccessResponse, sendErrorResponse } from '../../../utils/http-response.js';

/**
 * 1. Simulación de inicio de recarga por el usuario (Flujo Nequi App)
 */
export const rechargeNequi = asyncHandler(async (req, res) => {
    const { uid } = req.user;
    const { amount, phoneNumber, provider } = req.body; 

    if (!amount || amount <= 0) {
        return sendErrorResponse(res, "Monto inválido para recarga", 400);
    }

    const db = getFirestore();
    
    // Registro de Intento de Transacción en la Estructura Sagrada
    const transactionRef = db.collection('artifacts')
                             .doc('taxiacimco-app')
                             .collection('public')
                             .doc('data')
                             .collection('transacciones')
                             .doc();

    const transactionData = {
        uid,
        amount,
        phoneNumber: phoneNumber || "N/A",
        provider: provider || 'nequi',
        status: 'pending',
        type: 'recharge',
        createdAt: new Date().toISOString()
    };

    await transactionRef.set(transactionData);

    console.log(`🚀 [Wallet] Solicitud Nequi generada para ${uid} por $${amount}`);

    return sendSuccessResponse(res, { 
        transactionId: transactionRef.id,
        status: 'pending',
        message: "Solicitud enviada a tu Nequi. Por favor confirma en la app." 
    }, "Proceso de recarga iniciado");
});

/**
 * 2. Procesa una recarga manual desde el Panel Admin (Usa WalletService)
 */
export const rechargeManualAdmin = asyncHandler(async (req, res) => {
    const { targetUid, amount, metodoPago } = req.body;
    const adminUid = req.user.uid; 

    if (!targetUid || !amount || amount <= 0) {
        return sendErrorResponse(res, "Datos de recarga inválidos (UID y monto requeridos).", 400);
    }

    // El servicio se encarga de la lógica fuerte de la recarga administrativa
    const result = await WalletService.recharge(targetUid, amount, adminUid, metodoPago);
    return sendSuccessResponse(res, result, "Recarga administrativa exitosa");
});

/**
 * 3. Consulta el saldo y transacciones
 */
export const getBalance = asyncHandler(async (req, res) => {
    const uid = req.params.uid || req.user.uid;
    // Listo para conectar con WalletService.getBalance(uid)
    return sendSuccessResponse(res, { uid }, "Función lista para expansión de consulta de saldo");
});

// Agrupamos para ESM
export default { 
    rechargeNequi, 
    rechargeManualAdmin, 
    getBalance 
};