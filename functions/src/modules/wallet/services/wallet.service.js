/**
 * 💰 TAXIA CIMCO - Wallet Service
 * Misión: Gestión atómica de saldos, recargas, débitos y conciliación de pagos externos.
 */
import admin from "../../../firebase/firebase-admin.js";
import { enviarNotificacionPush } from "../../../utils/notificaciones.js";

const db = admin.firestore();
const appId = 'taxiacimco-app';

// 🎯 Definición de la Ruta Sagrada Centralizada
const sacredDataPath = db.collection("artifacts").doc(appId).collection("public").doc("data");

class WalletService {

  /**
   * ✅ MÉTODO: processWompiWebhook
   * Misión: Validar el pago y actualizar saldo distinguiendo entre Pasajero y Conductor.
   */
  static async processWompiWebhook(data) {
    const { reference, amount_in_cents, status } = data;
    const amount = amount_in_cents / 100;

    // 1. Localizar la intención de transacción
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

    // 2. Si el pago es exitoso, procedemos a la recarga atómica
    if (status === 'APPROVED') {
      const userRef = sacredDataPath.collection("usuarios").doc(targetUid);
      const historyRef = sacredDataPath.collection("historial_recargas").doc(reference);

      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("USER_NOT_FOUND");

        // Actualizamos saldo y marcamos la transacción como procesada
        transaction.update(userRef, {
          saldoWallet: admin.firestore.FieldValue.increment(amount),
          lastRechargeAt: admin.firestore.FieldValue.serverTimestamp()
        });

        transaction.set(historyRef, {
          targetUid,
          amount,
          reference,
          status: 'SUCCESS',
          user_type: user_type || 'DESCONOCIDO', // Distinción Pasajero/Conductor
          fecha: admin.firestore.FieldValue.serverTimestamp(),
          metodo: 'WOMPI'
        });

        transaction.update(transaccionRef, { processed: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      });

      // 3. Notificación Push Personalizada según el tipo de usuario
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

    return { success: true, newBalance: (await userRef.get()).data().saldoWallet };
  }

  /**
   * ✅ MÉTODO: debit (Cobro de Comisión por Carrera)
   */
  static async debit(targetUid, amount, serviceId) {
    const userRef = sacredDataPath.collection("usuarios").doc(targetUid);

    return await db.runTransaction(async (transaction) => {
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
  }

  static async getWallet(uid) {
    const userDoc = await sacredDataPath.collection("usuarios").doc(uid).get();
    return userDoc.exists ? userDoc.data() : { saldoWallet: 0 };
  }
}

export default WalletService;