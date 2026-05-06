// Versión Arquitectura: V9.3 - Sincronización de Custom Claims Financieros
/**
 * 💰 TAXIA CIMCO - Wallet Service
 * Misión: Gestión atómica de saldos, recargas, débitos y sincronización de Custom Claims
 * para optimización Zero-Read Cost en Firebase Rules.
 */
import admin from "../../../firebase/firebase-admin.js";
import { enviarNotificacionPush } from "../../../utils/notificaciones.js";

const db = admin.firestore();
const appId = 'taxiacimco-app';

// 🎯 Definición de la Ruta Sagrada Centralizada
const sacredDataPath = db.collection("artifacts").doc(appId).collection("public").doc("data");

class WalletService {

  /**
   * ⚡ MÉTODO NUEVO: Sincronización Quirúrgica de Custom Claims
   * Lee el saldo actual y actualiza el token JWT del usuario.
   */
  static async syncWalletClaims(uid) {
    const userRef = sacredDataPath.collection("usuarios").doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return false;
    
    const currentBalance = userDoc.data().saldoWallet || 0;
    const hasCredit = currentBalance >= 0;

    const auth = admin.auth();
    const userRecord = await auth.getUser(uid);
    const currentClaims = userRecord.customClaims || {};

    // Inyectamos el claim 'hasCredit' manteniendo el rol y otros claims intactos
    await auth.setCustomUserClaims(uid, {
      ...currentClaims,
      hasCredit: hasCredit
    });

    console.log(`🔐 [Claims Sync] Usuario ${uid} | hasCredit: ${hasCredit} | Saldo: ${currentBalance}`);
    return hasCredit;
  }

  /**
   * ✅ MÉTODO: processWompiWebhook
   * Misión: Validar el pago y actualizar saldo distinguiendo entre Pasajero y Conductor.
   */
  static async processWompiWebhook(data) {
    const { reference, amount_in_cents, status } = data;
    const amount = amount_in_cents / 100;

    const transaccionRef = sacredDataPath.collection("transacciones").doc(reference);
    const transaccionDoc = await transaccionRef.get();

    if (!transaccionDoc.exists) {
      console.error(`❌ [Wompi Webhook] Referencia no encontrada: ${reference}`);
      throw new Error("TRANSACCION_NOT_FOUND");
    }

    const { targetUid, user_type, processed } = transaccionDoc.data();

    if (processed) {
      console.log(`ℹ️ [Wompi Webhook] Transacción ${reference} ya procesada anteriormente.`);
      return { success: true, alreadyProcessed: true };
    }

    if (status === 'APPROVED') {
      const userRef = sacredDataPath.collection("usuarios").doc(targetUid);
      const historyRef = sacredDataPath.collection("historial_recargas").doc(reference);

      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("USER_NOT_FOUND");

        transaction.update(userRef, {
          saldoWallet: admin.firestore.FieldValue.increment(amount),
          lastRechargeAt: admin.firestore.FieldValue.serverTimestamp()
        });

        transaction.set(historyRef, {
          targetUid, 
          amount,
          reference,
          status: 'SUCCESS',
          user_type: user_type || 'DESCONOCIDO',
          fecha: admin.firestore.FieldValue.serverTimestamp(),
          metodo: 'WOMPI'
        });

        transaction.update(transaccionRef, { 
            processed: true, 
            status: 'APPROVED', 
            updatedAt: admin.firestore.FieldValue.serverTimestamp() 
        });
      });

      // ⚡ DISPARADOR DE CLAIMS: Actualizamos el token tras el éxito de la transacción
      await WalletService.syncWalletClaims(targetUid);

      const userData = (await userRef.get()).data();
      if (userData?.fcmToken) {
        const mensaje = {
          titulo: "💰 Recarga Exitosa",
          cuerpo: user_type === 'CONDUCTOR' 
            ? `Tu saldo ha sido actualizado. ¡Ya puedes aceptar más carreras!` 
            : `Has recargado $${amount.toLocaleString()}. ¡Listo para tu próximo viaje!`
        };
        await enviarNotificacionPush(userData.fcmToken, mensaje, { tipo: 'RECARGA', user_type });
      }

      return { success: true, amount };
    }

    return { success: false, status };
  }

  /**
   * ✅ MÉTODO: recharge (Manual / Administrativa)
   */
  static async recharge(targetUid, amount, adminUid = "SYSTEM") {
    const userRef = sacredDataPath.collection("usuarios").doc(targetUid);
    const historyRef = sacredDataPath.collection("historial_recargas").doc();

    await db.runTransaction(async (transaction) => {
      transaction.update(userRef, {
        saldoWallet: admin.firestore.FieldValue.increment(amount),
        lastRechargeAt: admin.firestore.FieldValue.serverTimestamp()
      });

      transaction.set(historyRef, {
        targetUid,
        amount,
        adminUid,
        tipo: 'RECARGA_MANUAL',
        fecha: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // ⚡ DISPARADOR DE CLAIMS
    await WalletService.syncWalletClaims(targetUid);

    return { success: true, newBalance: (await userRef.get()).data().saldoWallet };
  }

  /**
   * ✅ MÉTODO: debit (Cobro de Comisión por Carrera)
   */
  static async debit(targetUid, amount, serviceId) {
    const userRef = sacredDataPath.collection("usuarios").doc(targetUid);

    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error("USER_NOT_FOUND");

      const currentBalance = userDoc.data().saldoWallet || 0;
      if (currentBalance < amount) throw new Error("INSUFFICIENT_FUNDS");

      transaction.update(userRef, {
        saldoWallet: admin.firestore.FieldValue.increment(-amount),
        lastDebitAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, newBalance: currentBalance - amount };
    });

    // ⚡ DISPARADOR DE CLAIMS
    await WalletService.syncWalletClaims(targetUid);

    return result;
  }

  static async getWallet(uid) {
    const userDoc = await sacredDataPath.collection("usuarios").doc(uid).get();
    return userDoc.exists ? userDoc.data() : { saldoWallet: 0 };
  }
}

export default WalletService;