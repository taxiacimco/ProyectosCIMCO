// Versión Arquitectura: V4.1 - Persistencia de Intención y Blindaje de Metadatos
/**
 * modules/wallet/controllers/wallet.controller.js
 * PROYECTO: TAXIA CIMCO
 * Misión: Gestión integral de flujos financieros y resolución de errores de enrutamiento.
 * Respeta el path sagrado: artifacts/taxiacimco-app/public/data/
 */

import admin from '../../../firebase/firebase-admin.js'; 
import WalletService from "../services/wallet.service.js";
import { asyncHandler } from '../../../middleware/async-handler.js';
import { sendSuccessResponse, sendErrorResponse } from '../../../utils/http-response.js';
import { generateWompiSignature } from '../../../utils/wompi-security.js';

const db = admin.firestore();
const appId = 'taxiacimco-app';
const sacredDataPath = db.collection("artifacts").doc(appId).collection("public").doc("data");

/**
 * 1. 🔐 GENERAR INTENCIÓN DE PAGO
 * @desc Crea la firma y persiste la transacción como PENDIENTE para el Webhook.
 */
export const generatePaymentIntent = asyncHandler(async (req, res) => {
    console.log("🚀 [WALLET] Creando intención de pago y persistiendo metadatos...");
    
    const { amount, reference, currency = "COP", user_type } = req.body;
    const uid = req.user?.uid;

    if (!amount || !reference || !uid) {
        return sendErrorResponse(res, "Faltan datos críticos (Monto/Referencia/UID).", 400);
    }

    const amountInCents = Math.round(Number(amount) * 100);

    try {
        // 🛡️ BLINDAJE: Guardamos la intención en Firestore antes de que el usuario pague
        // Esto es lo que leerá el Webhook para saber a quién acreditar.
        await sacredDataPath.collection("transacciones").doc(reference).set({
            targetUid: uid,
            user_type: user_type || 'PASAJERO',
            amount: Number(amount),
            currency,
            status: 'PENDING',
            processed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Generamos la firma de integridad
        const signature = generateWompiSignature(reference, amountInCents, currency);

        return sendSuccessResponse(res, {
            signature,
            publicKey: process.env.WOMPI_PUBLIC_KEY,
            reference,
            amountInCents
        }, "Intención de pago registrada exitosamente");

    } catch (error) {
        console.error("❌ [WALLET ERROR] Fallo al persistir intención:", error);
        return sendErrorResponse(res, "Error al preparar la pasarela de pago.", 500);
    }
});

/**
 * 2. ⚡ WEBHOOK HANDLER
 */
export const handleWompiWebhook = asyncHandler(async (req, res) => {
    const result = await WalletService.processWompiWebhook(req.body.data.transaction);
    return sendSuccessResponse(res, result, "Webhook procesado");
});

/**
 * 3. 💰 RECARGA MANUAL (ADMIN)
 */
export const rechargeBalance = asyncHandler(async (req, res) => {
    const { targetUid, amount } = req.body;
    const adminUid = req.user.uid;

    if (!targetUid || !amount || amount <= 0) {
        return sendErrorResponse(res, "Datos de recarga inválidos.", 400);
    }

    const result = await WalletService.recharge(targetUid, amount, adminUid);
    return sendSuccessResponse(res, result, "Recarga administrativa aplicada");
});

/**
 * 4. 🔍 CONSULTA DE SALDO
 */
export const getBalance = asyncHandler(async (req, res) => {
    const uid = req.params.uid || req.user.uid;
    const wallet = await WalletService.getWallet(uid);
    return sendSuccessResponse(res, wallet, "Saldo recuperado con éxito");
});

/**
 * 5. 📉 DÉBITO POR COMISIÓN
 */
export const debitBalance = asyncHandler(async (req, res) => {
    const { targetUid, amount, serviceId } = req.body;

    if (!targetUid || !amount || amount <= 0) {
        return sendErrorResponse(res, "Datos de débito insuficientes.", 400);
    }

    try {
        const result = await WalletService.debit(targetUid, amount, serviceId);
        return sendSuccessResponse(res, result, "Débito por servicio completado");
    } catch (error) {
        if (error.message === "INSUFFICIENT_FUNDS") {
            return sendErrorResponse(res, "Saldo insuficiente para esta operación.", 402, "INSUFFICIENT_FUNDS");
        }
        throw error;
    }
});