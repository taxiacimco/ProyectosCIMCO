// Versión Arquitectura: V5.5 - Unificación de Métodos, Path Sagrado y Atomicidad Transaccional
/**
 * functions/src/modules/wallet/services/wallet.service.js
 * Misión: Gestionar el estado financiero de los usuarios (Saldos y Recargas) 
 * garantizando la integridad en el Path Sagrado de TAXIA CIMCO.
 */
import { db } from "../../../config/firebase.js"; 
import { FieldValue } from "firebase-admin/firestore"; 

class WalletService {
    /**
     * Consulta el saldo actual de un usuario.
     * Respeta estrictamente el Path Sagrado (Regla de Oro 1).
     */
    async checkBalance(userId) {
        try {
            const walletRef = db.doc(`artifacts/taxiacimco-app/public/data/wallets/${userId}`);
            const doc = await walletRef.get();
            
            if (!doc.exists) {
                console.log(`[WalletService] Billetera no encontrada para ${userId}.`);
                return 0;
            }
            
            return doc.data().balance || 0;
        } catch (error) {
            console.error(`❌ Error al consultar saldo: ${error.message}`);
            throw error;
        }
    }

    /**
     * Procesa la transacción de Wompi de forma idempotente. 
     * Mapeado a processTransaction para consistencia con el controlador.
     */
    async processTransaction(transaction) {
        const { id, amount_in_cents, status, customer_email } = transaction;
        
        // 🏛️ REGLA DE ORO 1: Estructura de Datos Sagrada
        const basePath = `artifacts/taxiacimco-app/public/data`;
        const transactionRef = db.collection(`${basePath}/transactions`).doc(id);
        const walletRef = db.collection(`${basePath}/wallets`).doc(customer_email);

        try {
            // 1. 🛡️ VERIFICACIÓN DE IDEMPOTENCIA
            const transactionDoc = await transactionRef.get();
            if (transactionDoc.exists && transactionDoc.data().processed === true) {
                console.log(`[Idempotencia] Transacción ${id} ya procesada.`);
                return { success: true, reason: 'already_processed' };
            }

            if (status === 'APPROVED') {
                // 2. 💎 TRANSACCIÓN ATÓMICA
                await db.runTransaction(async (t) => {
                    const walletDoc = await t.get(walletRef);

                    if (!walletDoc.exists) {
                        throw new Error(`Billetera no encontrada para: ${customer_email}`);
                    }

                    const currentBalance = walletDoc.data().balance || 0;
                    const amount = amount_in_cents / 100;
                    const newBalance = currentBalance + amount;

                    t.update(walletRef, {
                        balance: newBalance,
                        last_recharge: amount,
                        updatedAt: FieldValue.serverTimestamp()
                    });

                    t.set(transactionRef, {
                        ...transaction,
                        processed: true,
                        processedAt: FieldValue.serverTimestamp(),
                        type: 'RECHARGE'
                    });
                });

                console.log(`✅ Saldo actualizado para ${customer_email}: +${amount_in_cents / 100}`);
                return { success: true };
            }

            // 3. REGISTRO DE INTENTOS NO APROBADOS (REGLA DE ORO 2: Seguridad)
            await transactionRef.set({
                ...transaction,
                processed: true,
                processedAt: FieldValue.serverTimestamp(),
                type: 'RECHARGE_ATTEMPT'
            });

            return { success: false, status };

        } catch (error) {
            console.error(`❌ Error crítico en WalletService: ${error.message}`);
            throw error;
        }
    }
}

// Exportación por defecto como instancia (Singleton)
export default new WalletService();