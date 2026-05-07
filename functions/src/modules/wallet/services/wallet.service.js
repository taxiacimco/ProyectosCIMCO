// Versión Arquitectura: V3.5 - Servicio de Billetera Atómico con Ruta de Datos Sagrada e Idempotencia
/**
 * functions/src/modules/wallet/services/wallet.service.js
 * Misión: Procesar lógica de abonos, control de duplicados y persistencia en Path Sagrado.
 */
import { db, FieldValue } from "../../../config/firebase.js";

/**
 * Procesa la transacción con lógica de idempotencia y transacciones atómicas.
 */
const processTransaction = async (transaction) => {
    const { id, amount_in_cents, status, customer_email, reference } = transaction;

    try {
        // 🛡️ VERIFICACIÓN DE IDEMPOTENCIA EN PATH SAGRADO
        const transactionPath = `artifacts/taxiacimco-app/public/data/transactions`;
        const transactionRef = db.collection(transactionPath).doc(id);
        const transactionDoc = await transactionRef.get();

        if (transactionDoc.exists && transactionDoc.data().processed === true) {
            console.log(`[Idempotencia] Transacción ${id} ya fue procesada anteriormente.`);
            return true;
        }

        if (status === 'APPROVED') {
            // 💎 TRANSACCIÓN ATÓMICA DE FIRESTORE
            await db.runTransaction(async (t) => {
                const walletPath = `artifacts/taxiacimco-app/public/data/wallets`;
                const walletRef = db.collection(walletPath).doc(customer_email);
                const walletDoc = await t.get(walletRef);

                if (!walletDoc.exists) {
                    throw new Error(`Billetera no encontrada para: ${customer_email}`);
                }

                const currentBalance = walletDoc.data().balance || 0;
                const amount = amount_in_cents / 100; // Centavos a COP
                const newBalance = currentBalance + amount;

                // A. Actualizar Saldo
                t.update(walletRef, {
                    balance: newBalance,
                    last_recharge: amount,
                    updatedAt: FieldValue.serverTimestamp()
                });

                // B. Registrar Transacción Procesada
                t.set(transactionRef, {
                    ...transaction,
                    processed: true,
                    processedAt: FieldValue.serverTimestamp(),
                    type: 'RECHARGE'
                });
            });

            console.log(`✅ [Wallet] Procesando abono de ${amount_in_cents/100} a ${customer_email}`);
            return true;
        }

        // Registrar intentos no aprobados sin afectar saldo
        await transactionRef.set({
            ...transaction,
            processed: true,
            processedAt: FieldValue.serverTimestamp(),
            type: 'RECHARGE_ATTEMPT'
        });

        console.log(`ℹ️ [Wallet] Transacción ${id} registrada con estado: ${status}`);
        return false;

    } catch (error) {
        console.error(`❌ [Wallet Service Error]: ${error.message}`);
        throw error;
    }
};

// Exportación Nombrada según estándar de TAXIA CIMCO
export const walletService = {
    processTransaction
};