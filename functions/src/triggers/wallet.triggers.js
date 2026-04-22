/**
 * 🛡️ TAXIA CIMCO - Wallet Triggers
 * Versión Arquitectura: V7.7 - Integración de Secretos y Seguridad de Entorno
 * Arquitectura: Event-Driven (Cloud Functions V2)
 * Misión: Reaccionar a eventos financieros en la Ruta Sagrada protegidos por Secretos.
 */
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import admin from "../firebase/firebase-admin.js";

// 🚨 BLOQUEADO PARA V7: Comentamos la importación que causa el crash
// import { enviarNotificacionPush } from "../utils/notificaciones.js";

import { actualizarSaldoWallet } from "../modules/wallet/services/wallet.service.js";

export const onNuevaTransaccion = onDocumentCreated({
    document: "artifacts/taxiacimco-app/public/data/billeteras/{walletId}/transacciones/{transaccionId}",
    secrets: ["CIMCO_SECRET_KEY"] // 👈 La función exigirá esta llave para arrancar
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const data = snapshot.data();
    const { walletId, transaccionId } = event.params;
    const monto = data.monto;
    const estado = data.estado;

    // 🛡️ REGLA DE SEGURIDAD 1: Validación de Secreto (Entorno Seguro)
    // El proceso falla si no está presente la llave (ya sea de Secret Manager o .env.local)
    if (!process.env.CIMCO_SECRET_KEY) {
        logger.error("❌ ERROR CRÍTICO: No se encontró la llave de seguridad (CIMCO_SECRET_KEY). Abortando operación.");
        return null;
    }

    // 🛡️ REGLA DE SEGURIDAD 2: Solo procesar si el estado es EXACTAMENTE "COMPLETADO"
    if (estado !== "COMPLETADO") {
        logger.warn(`⚠️ [IGNORADO] Transacción ${transaccionId} no procesada. Estado: ${estado}`);
        return null; // Detenemos la función aquí, protegiendo el saldo
    }

    try {
        logger.info(`💰 Procesando abono seguro para: ${walletId} por monto: ${monto}`);
        
        // ✅ LLAMADA SEGURA AL SERVICIO
        await actualizarSaldoWallet(walletId, monto);
        
        logger.info(`✅ [EXITO] Saldo actualizado con seguridad para ${walletId}: +${monto}`);
    } catch (error) {
        logger.error(`❌ [ERROR] No se pudo actualizar el saldo:`, error);
    }
});