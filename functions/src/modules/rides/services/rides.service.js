// Versión Arquitectura: V4.8 - Resolución Definitiva de Enrutamiento de Módulos (ESM)
/**
 * src/modules/rides/services/rides.service.js
 * Lógica de negocio, Asignación de Viajes y Liquidación - TAXIA CIMCO
 */

import admin, { db } from "../../../firebase/firebase-admin.js";

// ✅ AJUSTE QUIRÚRGICO: Ruta absoluta relativa verificada contra el árbol de directorios (../../)
import { enviarNotificacionNuevaSolicitud } from "../../notifications/services/notification.service.js";

const appId = 'taxiacimco-app';

class RideService {

  // =========================================================
  // 🛡️ MÉTODOS DE INSTANCIA (CRUD & LOGIC)
  // =========================================================

  async create(rideData) {
    const docRef = db.collection("artifacts").doc(appId)
                     .collection("public").doc("data")
                     .collection("rides").doc();
                     
    await docRef.set({ ...rideData, id: docRef.id });
    return { id: docRef.id, ...rideData };
  }

  async findAll(filters = {}) {
    let query = db.collection("artifacts").doc(appId)
                  .collection("public").doc("data")
                  .collection("rides");
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
         query = query.where(key, "==", value);
      }
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findById(id) {
    const doc = await db.collection("artifacts").doc(appId)
                        .collection("public").doc("data")
                        .collection("rides").doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async updateStatus(id, status) {
    const rideRef = db.collection("artifacts").doc(appId)
                      .collection("public").doc("data")
                      .collection("rides").doc(id);
    await rideRef.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return this.findById(id);
  }

  /**
   * NOTIFICACIÓN TÁCTICA A CONDUCTORES CERCANOS
   * @param {string} viajeId 
   * @param {object} viajeData 
   */
  async notifyNearbyDrivers(viajeId, viajeData) {
    const { origen, tipoServicio } = viajeData;
    
    try {
        // 1. Obtener conductores online con disponibilidad inmediata
        // Path Sagrado: artifacts/taxiacimco-app/public/data/conductores_online
        const conductoresSnap = await db.collection("artifacts")
            .doc(appId)
            .collection("public")
            .doc("data")
            .collection("conductores_online")
            .where("tipoVehiculo", "==", tipoServicio) // Mapeo de tipo de servicio a vehículo
            .where("estado", "==", "disponible")
            .get();

        if (conductoresSnap.empty) {
            console.log(`ℹ️ [RideService] No hay conductores online disponibles para ${tipoServicio}.`);
            return;
        }

        // 2. Filtrado por cercanía (Lógica de negocio: 5km)
        const conductoresCerca = conductoresSnap.docs.filter(doc => {
            const c = doc.data();
            if (!c.l || !origen) return false;
            
            // Usamos la utilidad de distancia privada
            const distancia = this._calculateDistance(origen.lat, origen.lng, c.l[0], c.l[1]);
            return distancia <= 5; 
        });

        console.log(`🎯 [RideService] Conductores en radio de acción (5km): ${conductoresCerca.length}`);

        // 3. Consolidar Tokens FCM y disparar Push
        let allTokens = [];
        for (const doc of conductoresCerca) {
            const conductor = doc.data();
            if (conductor.fcmTokens && Array.isArray(conductor.fcmTokens)) {
                allTokens = [...allTokens, ...conductor.fcmTokens];
            } else if (conductor.fcmToken) {
                allTokens.push(conductor.fcmToken);
            }
        }

        const tokensValidos = [...new Set(allTokens)].filter(t => t && t.length > 10);

        if (tokensValidos.length > 0) {
            await enviarNotificacionNuevaSolicitud(tokensValidos, viajeId, viajeData);
            console.log(`✅ [RideService] Notificaciones enviadas a ${tokensValidos.length} dispositivos.`);
        }

    } catch (error) {
        throw new Error(`Error en notifyNearbyDrivers: ${error.message}`);
    }
  }

  /**
   * UTILIDAD: Cálculo de distancia Haversine
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // =========================================================
  // 💰 LÓGICA DE LIQUIDACIÓN Y CIERRE
  // =========================================================

  static async endTrip(rideId) {
    const rideRef = db.collection("artifacts").doc(appId)
                      .collection("public").doc("data")
                      .collection("rides").doc(rideId);

    return await db.runTransaction(async (transaction) => {
      const rideSnap = await transaction.get(rideRef);
      if (!rideSnap.exists) throw new Error("Viaje no encontrado");

      const rideData = rideSnap.data();
      const { driverId, tarifa, tipoVehiculo, status } = rideData;

      if (status === "completed") throw new Error("Viaje ya liquidado");

      let montoComision = (tipoVehiculo === "motocarga") ? 500 : Number(tarifa) * 0.10;

      const responsableRef = db.collection("artifacts").doc(appId)
                               .collection("public").doc("data")
                               .collection("usuarios").doc(driverId);

      transaction.update(responsableRef, {
        saldo: admin.firestore.FieldValue.increment(-montoComision)
      });

      transaction.update(rideRef, {
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        comisionAplicada: montoComision
      });

      return { success: true, comision: montoComision };
    });
  }
}

export default RideService;