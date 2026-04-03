/**
 * api/payments.js
 * Webhook para recepción de notificaciones de pago (Nequi/Bancolombia)
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendSuccessResponse, sendErrorResponse } from '../utils/http-response.js';

export const handleNequiWebhook = async (req, res) => {
    const { transactionId, status, amount, userId } = req.body;

    if (!transactionId || !status || !userId) {
        return sendErrorResponse(res, "Payload de webhook incompleto.", 400);
    }

    console.log(`🔔 [Webhook Nequi] Recibida notificación para TX: ${transactionId} | Estado: ${status}`);

    const db = getFirestore();

    try {
        if (status === "APPROVED" || status === "SUCCESS") {
            
            // Referencias a la Estructura de Datos Sagrada
            const transactionRef = db.collection('artifacts')
                                     .doc('taxiacimco-app')
                                     .collection('public')
                                     .doc('data')
                                     .collection('transacciones')
                                     .doc(transactionId);
                                     
            const userRef = db.collection('artifacts')
                              .doc('taxiacimco-app')
                              .collection('public')
                              .doc('data')
                              .collection('usuarios')
                              .doc(userId);

            // Transacción de Firestore: Todo o nada
            await db.runTransaction(async (transaction) => {
                const txDoc = await transaction.get(transactionRef);
                
                if (!txDoc.exists) {
                    throw new Error("Transacción no encontrada en el sistema.");
                }

                if (txDoc.data().status === 'approved') {
                    throw new Error("La transacción ya fue procesada anteriormente.");
                }

                transaction.update(transactionRef, { 
                    status: 'approved',
                    updatedAt: new Date().toISOString()
                });

                transaction.set(userRef, {
                    saldoWallet: FieldValue.increment(Number(amount)),
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            });

            console.log(`✅ [Webhook Nequi] Saldo de $${amount} acreditado al usuario ${userId}.`);
        }

        return sendSuccessResponse(res, null, "Webhook procesado correctamente.");

    } catch (error) {
        console.error("❌ [Webhook Nequi Error]:", error.message);
        return sendErrorResponse(res, `Error procesando el pago: ${error.message}`, 500);
    }
};