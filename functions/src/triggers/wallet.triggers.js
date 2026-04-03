/**
 * 🛡️ TAXIA CIMCO - Wallet Triggers
 * Arquitectura: Event-Driven (Cloud Functions V2)
 * Misión: Reaccionar a eventos financieros en la Ruta Sagrada.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

// Importaciones adaptadas a tu árbol de directorios exacto
// Verifica que estas funciones existan en sus respectivos servicios
import { sendPushNotification } from "../modules/notifications/services/notification.service.js";
import { actualizarSaldoWallet } from "../modules/wallet/services/wallet.service.js";

/**
 * ⚡ TRIGGER: onNuevaTransaccion
 * Se activa automáticamente cuando se crea un documento en la sub-colección de transacciones.
 */
export const onNuevaTransaccion = onDocumentCreated(
  "artifacts/taxiacimco-app/public/data/usuarios/{uid}/transacciones/{txId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const { uid } = event.params;
    const { tipo, monto, estado } = data;

    logger.info(`🔔 Transacción detectada [${tipo}] para usuario: ${uid}`);

    try {
      // 1. FILTRO DE SEGURIDAD: Solo procesamos recargas completadas
      if (tipo === "RECARGA_EXITOSA" && estado === "COMPLETADO") {
        
        // 2. ACTUALIZACIÓN DE SALDO EN NODE.JS
        await actualizarSaldoWallet(uid, monto);
        logger.info(`💰 Saldo actualizado para ${uid}: +${monto}`);

        // 3. NOTIFICACIÓN PUSH AL CELULAR
        const titulo = "¡Recarga Exitosa! 🚀";
        const mensaje = `Se han acreditado $${monto} a tu billetera CIMCO.`;
        
        await sendPushNotification(uid, titulo, mensaje);
        logger.info(`📲 Notificación enviada con éxito a ${uid}`);
      }
    } catch (error) {
      logger.error("❌ Error crítico procesando el trigger de wallet:", error);
    }
  }
);