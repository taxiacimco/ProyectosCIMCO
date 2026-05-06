// Versión Arquitectura: V5.1 - Integración de Trazabilidad targetUid
/**
 * modules/wallet/controllers/wallet.controller.js
 * PROYECTO: TAXIA CIMCO
 * Misión: Integrar cobro automático de comisiones por rol y actualizar saldo en tiempo real, 
 * asegurando la trazabilidad biométrica/UID en cada transacción.
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
 * @desc Crea la firma y persiste la transacción en el path sagrado.
 */
export const generatePaymentIntent = asyncHandler(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    console.log("🚀 [WALLET] Creando intención de pago...");
    
    // ✅ AJUSTE: Extraemos targetUid directamente del payload del frontend
    const { amount, reference, currency = "COP", user_type = 'CONDUCTOR', targetUid } = req.body;

    // ✅ VALIDACIÓN FÉRREA: Si no hay targetUid, rechazamos la petición
    if (!amount || !reference || !targetUid) {
        return sendErrorResponse(res, "Faltan datos críticos (Monto/Referencia/targetUid).", 400);
    }

    try {
        const amountInCents = Math.round(Number(amount)); 

        await sacredDataPath.collection("transacciones").doc(reference).set({
            targetUid: targetUid, // ✅ Guardado impecable con el nombre exacto
            user_type: user_type,
            amount: amountInCents, // Ajustado a persistir centavos puros para consistencia V5.0
            currency,
            status: 'PENDING',
            processed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            gateway: "WOMPI"
        });

        const signature = generateWompiSignature(reference, amountInCents, currency);

        return sendSuccessResponse(res, {
            signature,
            publicKey: process.env.WOMPI_PUBLIC_KEY || "pub_test_izIw7dbFsEITfI090UsC0BVspoy60CNx",
            reference
        }, "Intención de pago registrada exitosamente");

    } catch (error) {
        console.error("❌ [CIMCO ERROR] Fallo en persistencia:", error);
        return sendErrorResponse(res, "Error interno al preparar pago.", 500);
    }
});

/**
 * 2. ⚡ WEBHOOK HANDLER
 */
export const handleWompiWebhook = asyncHandler(async (req, res) => {
    const result = await WalletService.processWompiWebhook(req.body.data.transaction);
    return sendSuccessResponse(res, result, "Webhook processed");
});

/**
 * 3. 💰 RECARGA MANUAL (ADMIN)
 */
export const rechargeBalance = asyncHandler(async (req, res) => {
    const { targetUid, amount } = req.body;
    const adminUid = req.user?.uid || "ADMIN_LOCAL";

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
    const uid = req.params.uid || req.user?.uid;
    if (!uid) return sendErrorResponse(res, "UID requerido", 401);
    
    const wallet = await WalletService.getWallet(uid);
    return sendSuccessResponse(res, wallet, "Saldo recuperado con éxito");
});

/**
 * 5. 📉 DÉBITO POR COMISIÓN (Legacy/Manual)
 */
export const debitBalance = asyncHandler(async (req, res) => {
    const { targetUid, amount, serviceId } = req.body;

    if (!targetUid || !amount || amount <= 0) {
        return sendErrorResponse(res, "Datos insuficientes.", 400);
    }

    const result = await WalletService.debit(targetUid, amount, serviceId);
    return sendSuccessResponse(res, result, "Débito completado");
});

/**
 * 6. 📜 HISTORIAL DE TRANSACCIONES
 */
export const getHistory = asyncHandler(async (req, res) => {
    const uid = req.user?.uid || "TEST_USER_CIMCO";

    try {
        const snapshot = await sacredDataPath.collection("transacciones")
            .where("targetUid", "==", uid)
            .get();

        const history = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        history.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA; 
        });

        return sendSuccessResponse(res, history, "Historial recuperado");
    } catch (error) {
        return sendErrorResponse(res, "Error al leer transacciones.", 500);
    }
});

/**
 * 7. 🤖 PROCESAR COMISIÓN AUTOMÁTICA (V5.0)
 * @desc Calcula y ejecuta el cobro según el rol del conductor usando transacciones atómicas.
 */
export const processServiceCommission = asyncHandler(async (req, res) => {
    const { conductorId, tipoServicio } = req.body;

    if (!conductorId || !tipoServicio) {
        return sendErrorResponse(res, "conductorId y tipoServicio son obligatorios.", 400);
    }

    // 1. Definición de montos en centavos (Regla de negocio TAXIA CIMCO)
    const montos = {
        'MOTOCARGA': -50000,
        'DESPACHADOR': -50000,
        'MOTOTAXI': -200000,
        'PARRILLERO': -200000
    };

    const montoCentavos = montos[tipoServicio.toUpperCase()];

    if (montoCentavos === undefined) {
        return sendErrorResponse(res, `Tipo de servicio '${tipoServicio}' no reconocido.`, 400);
    }

    try {
        await db.runTransaction(async (t) => {
            // A. Referencia al balance del usuario en el Path Sagrado
            const userRef = sacredDataPath.collection('usuarios').doc(conductorId);
            const userDoc = await t.get(userRef);

            if (!userDoc.exists) {
                throw new Error("El conductor no existe en la base de datos.");
            }

            const saldoActual = userDoc.data().wallet_balance || 0;

            // B. Generar referencia para la nueva transacción histórica
            const txRef = sacredDataPath.collection('transacciones').doc();

            // C. Operación Atómica: Actualizar Saldo + Registrar Historial
            t.update(userRef, { 
                wallet_balance: saldoActual + montoCentavos,
                last_update: admin.firestore.FieldValue.serverTimestamp()
            });

            t.set(txRef, {
                targetUid: conductorId,
                amount: montoCentavos,
                gateway: "SISTEMA",
                status: "COMPLETED",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                reference: `COM-${Date.now()}-${conductorId.slice(0, 4)}`,
                tipoServicio: tipoServicio.toUpperCase()
            });
        });

        return sendSuccessResponse(res, { 
            montoAplicado: montoCentavos,
            unidad: "CENTAVOS" 
        }, "Comisión de sistema procesada y saldo actualizado.");

    } catch (error) {
        console.error("⚠️ [ALERTA DE ARQUITECTURA] Fallo en Transacción de Comisión:", error);
        return sendErrorResponse(res, `Error en procesamiento atómico: ${error.message}`, 500);
    }
});