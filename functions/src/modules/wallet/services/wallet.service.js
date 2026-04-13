/**
 * 💰 TAXIA CIMCO - Wallet Service (Versión Corregida V2)
 * Misión: Gestión atómica de saldos sin errores de documento no encontrado.
 */
import admin from "../../../firebase/firebase-admin.js";

const db = admin.firestore();
const appId = 'taxiacimco-app';

/**
 * ✅ ACTUALIZAR SALDO WALLET (Profesional)
 * Usa FieldValue.increment y set() con merge para evitar el crash NOT_FOUND.
 * @param {string} uid - ID del usuario/conductor
 * @param {number} monto - Cantidad a sumar (o restar si es negativo)
 */
export const actualizarSaldoWallet = async (uid, monto) => {
  // 🎯 RUTA EXACTA: artifacts -> taxiacimco-app -> public -> data -> billeteras
  const walletRef = db.collection("artifacts").doc(appId)
                    .collection("public").doc("data")
                    .collection("billeteras").doc(uid);

  try {
    // 🛡️ MODO SEGURO: Usamos set con merge para evitar el error de "documento no encontrado"
    await walletRef.set({
      saldoWallet: admin.firestore.FieldValue.increment(monto),
      lastUpdateAt: admin.firestore.FieldValue.serverTimestamp(),
      ultimoMovimiento: {
        tipo: monto > 0 ? 'INGRESO' : 'EGRESO',
        monto: Math.abs(monto),
        fecha: new Date()
      }
    }, { merge: true });

    console.log(`✅ [Wallet] Saldo actualizado para ${uid}: +${monto}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ [Wallet Error]:`, error);
    throw error;
  }
};

/**
 * CLASE WalletService
 * (Gestión de recargas administrativas manuales)
 */
class WalletService {
  static async recharge(targetUid, amount, adminUid) {
    const walletRef = db.collection("artifacts").doc(appId)
                      .collection("public").doc("data")
                      .collection("billeteras").doc(targetUid);

    try {
      await db.runTransaction(async (transaction) => {
        // Usamos set con merge en la transacción también por seguridad
        transaction.set(walletRef, {
          saldoWallet: admin.firestore.FieldValue.increment(amount),
          lastRechargeAt: admin.firestore.FieldValue.serverTimestamp(),
          adminResponsable: adminUid
        }, { merge: true });

        const historyRef = db.collection("artifacts").doc(appId)
                             .collection("public").doc("data")
                             .collection("historial_recargas").doc();
        
        transaction.set(historyRef, {
          targetUid: targetUid,
          amount: amount,
          adminUid: adminUid, 
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