/**
 * 🛡️ TAXIA CIMCO - Wallet Triggers
 * Arquitectura: Event-Driven (Cloud Functions V2)
 * Misión: Reaccionar a eventos financieros en la Ruta Sagrada.
 */
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import admin from "../firebase/firebase-admin.js";

// 🚨 BLOQUEADO PARA V7: Comentamos la importación que causa el crash
// import { enviarNotificacionPush } from "../utils/notificaciones.js";

import { actualizarSaldoWallet } from "../modules/wallet/services/wallet.service.js";

export const onNuevaTransaccion = onDocumentCreated(
    "artifacts/taxiacimco-app/public/data/billeteras/{walletId}/transacciones/{transaccionId}",
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return null;

        const data = snapshot.data();
        const { walletId, transaccionId } = event.params;
        const monto = data.monto;
        const estado = data.estado;

        // 🛡️ REGLA DE SEGURIDAD: Solo procesar si el estado es EXACTAMENTE "COMPLETADO"
        if (estado !== "COMPLETADO") {
            logger.warn(`⚠️ [IGNORADO] Transacción ${transaccionId} no procesada. Estado: ${estado}`);
            return null; // Detenemos la función aquí, protegiendo el saldo
        }

        try {
            logger.info(`💰 Procesando abono para: ${walletId} por monto: ${monto}`);
            
            // ✅ LLAMADA SEGURA AL SERVICIO
            await actualizarSaldoWallet(walletId, monto);
            
            logger.info(`✅ [EXITO] Saldo actualizado para ${walletId}: +${monto}`);
        } catch (error) {
            logger.error(`❌ [ERROR] No se pudo actualizar el saldo:`, error);
        }
    }
);