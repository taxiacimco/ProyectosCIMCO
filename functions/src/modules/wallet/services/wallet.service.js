/**
 * 💰 TAXIA CIMCO - Wallet Service
 * Misión: Gestión atómica de saldos y auditoría financiera.
 */
import { db } from "../../../firebase/firebase-admin.js";
import admin from "firebase-admin";

const appId = 'taxiacimco-app';

/**
 * ✅ ACTUALIZAR SALDO WALLET (Profesional)
 * Usa FieldValue.increment para asegurar que el cálculo sea atómico en el servidor.
 * @param {string} uid - ID del usuario/conductor
 * @param {number} monto - Cantidad a sumar (o restar si es negativo)
 */
export const actualizarSaldoWallet = async (uid, monto) => {
  // Referencia al "Path Sagrado" del usuario
  const userRef = db.collection("artifacts").doc(appId)
                    .collection("public").doc("data")
                    .collection("usuarios").doc(uid);

  try {
    // Usamos .update con increment para máxima seguridad financiera
    await userRef.update({
      saldoWallet: admin.firestore.FieldValue.increment(monto),
      lastUpdateAt: admin.firestore.FieldValue.serverTimestamp(),
      // Guardamos una bandera del último movimiento para auditoría rápida
      ultimoMovimiento: {
        tipo: monto > 0 ? 'INGRESO' : 'EGRESO',
        monto: Math.abs(monto),
        fecha: new Date()
      }
    });

    console.log(`✅ [Wallet] Saldo actualizado para ${uid}: ${monto > 0 ? '+' : ''}${monto}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ [Wallet Error] No se pudo actualizar saldo para ${uid}:`, error);
    throw error; // Propagamos el error para que el trigger lo registre en los logs
  }
};

/**
 * CLASE WalletService (Mantiene tu lógica actual de recargas manuales)
 */
class WalletService {
  /**
   * Recargar saldo a un usuario (Manual por Admin/CEO)
   */
  static async recharge(targetUid, amount, adminUid) {
    const userRef = db.collection("artifacts").doc(appId)
                      .collection("public").doc("data")
                      .collection("usuarios").doc(targetUid);

    try {
      await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) throw new Error("Usuario no encontrado en la ruta sagrada");

        // 1. Aumentar saldo atómicamente
        transaction.update(userRef, {
          saldoWallet: admin.firestore.FieldValue.increment(amount),
          lastRechargeAt: new Date(),
          adminResponsable: adminUid
        });

        // 2. Registrar el historial de recarga para auditoría
        const historyRef = db.collection("artifacts").doc(appId)
                             .collection("public").doc("data")
                             .collection("historial_recargas").doc();
        
        transaction.set(historyRef, {
          targetUid,
          amount,
          adminUid, 
          fecha: admin.firestore.FieldValue.serverTimestamp(),
          metodo: 'MANUAL_ADMIN'
        });
      });
      return { success: true };
    } catch (error) {
      console.error("❌ Error en WalletService.recharge:", error);
      throw error;
    }
  }
}

export default WalletService;