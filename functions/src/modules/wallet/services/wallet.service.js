// Versión Arquitectura: V5.6 - Robustez Numérica y Path Sagrado Verificado
/**
 * functions/src/modules/wallet/services/wallet.service.js
 * Misión: Gestionar el estado financiero garantizando que no haya errores de suma.
 */
import { db } from "../../../config/firebase.js"; 
import { FieldValue } from "firebase-admin/firestore"; 

class WalletService {
    /**
     * Consulta el saldo actual de un usuario en el Path Sagrado.
     */
    async checkBalance(userId) {
        try {
            const walletRef = db.doc(`artifacts/taxiacimco-app/public/data/wallets/${userId}`);
            const doc = await walletRef.get();
            
            if (!doc.exists) {
                console.log(`[WalletService] ⚠️ Billetera no existe para ${userId}.`);
                return 0;
            }
            return Number(doc.data().balance || 0);
        } catch (error) {
            console.error(`❌ Error en checkBalance: ${error.message}`);
            throw error;
        }
    }

    /**
     * Procesa la transacción de Wompi de forma atómica.
     */
    async processTransaction(transaction) {
        const { id, amount_in_cents, status, customer_email } = transaction;
        
        // Estructura de Datos verificada en el emulador
        const basePath = `artifacts/taxiacimco-app/public/data`;
        const transactionRef = db.collection(`${basePath}/transactions`).doc(id);
        const walletRef = db.collection(`${basePath}/wallets`).doc(customer_email);

        try {
            // 1. Verificación de Idempotencia
            const transactionDoc = await transactionRef.get();
            if (transactionDoc.exists && transactionDoc.data().processed === true) {
                console.log(`[WalletService] 🛡️ Transacción ${id} ya procesada.`);
                return { success: true, reason: 'already_processed' };
            }

            if (status === 'APPROVED') {
                // 2. Transacción Atómica (Suma perfecta)
                await db.runTransaction(async (t) => {
                    const walletDoc = await t.get(walletRef);
                    const amount = Number(amount_in_cents) / 100; // Ej: 100000 -> 1000

                    if (!walletDoc.exists) {
                        t.set(walletRef, {
                            balance: amount,
                            email: customer_email,
                            updatedAt: FieldValue.serverTimestamp()
                        });
                    } else {
                        // CRÍTICO: Forzamos que ambos sean números para evitar "500001000"
                        const currentBalance = Number(walletDoc.data().balance || 0);
                        const newBalance = currentBalance + amount;
                        
                        t.update(walletRef, {
                            balance: newBalance,
                            last_recharge: amount,
                            updatedAt: FieldValue.serverTimestamp()
                        });
                    }

                    t.set(transactionRef, {
                        ...transaction,
                        processed: true,
                        processedAt: FieldValue.serverTimestamp()
                    });
                });

                console.log(`✅ EXITO: Saldo actualizado para ${customer_email}`);
                return { success: true };
            }

            return { success: false, status };

        } catch (error) {
            console.error(`❌ ERROR en WalletService: ${error.message}`);
            throw error;
        }
    }
}

export default new WalletService();