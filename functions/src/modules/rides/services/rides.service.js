/**
 * src/modules/rides/services/rides.service.js
 * Lógica de negocio, Asignación de Viajes y Liquidación - TAXIA CIMCO
 */

// ✅ CORRECCIÓN QUIRÚRGICA: Ruta corregida incluyendo la carpeta /firebase/
// Se mantiene el .js obligatorio para cumplimiento de ESM en Node 20
import admin, { db } from "../../../firebase/firebase-admin.js";

const appId = 'taxiacimco-app';

class RideService {

  // =========================================================
  // 🛡️ MÉTODOS DE INSTANCIA (CRUD REQUERIDO POR EL CONTROLADOR)
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
    
    // Aplicación dinámica de filtros
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
         query = query.where(key, "==", value);
      }
    }
    
    const snapshot = await query.get();
    if (snapshot.empty) return [];
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findById(id) {
    const docRef = db.collection("artifacts").doc(appId)
                     .collection("public").doc("data")
                     .collection("rides").doc(id);
                     
    const docSnap = await docRef.get();
    if (!docSnap.exists) return null;
    
    return { id: docSnap.id, ...docSnap.data() };
  }

  async updateStatus(id, status) {
    const docRef = db.collection("artifacts").doc(appId)
                     .collection("public").doc("data")
                     .collection("rides").doc(id);
                     
    await docRef.update({ 
        status, 
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
    });
    
    const updatedSnap = await docRef.get();
    return { id: updatedSnap.id, ...updatedSnap.data() };
  }

  // =========================================================
  // ⚙️ MÉTODOS ESTÁTICOS (REGLAS DE NEGOCIO Y TRANSACCIONES)
  // =========================================================

  /**
   * 🛡️ ACEPTAR VIAJE (CON VALIDACIÓN BANCARIA)
   */
  static async acceptRide(viajeId, conductorId) {
    const rideRef = db.collection("artifacts").doc(appId)
                      .collection("public").doc("data")
                      .collection("rides").doc(viajeId);
                      
    const driverRef = db.collection("artifacts").doc(appId)
                        .collection("public").doc("data")
                        .collection("usuarios").doc(conductorId);

    return await db.runTransaction(async (transaction) => {
      const rideSnap = await transaction.get(rideRef);
      if (!rideSnap.exists) throw new Error("VIAJE_NO_ENCONTRADO");
      
      const rideData = rideSnap.data();
      if (rideData.status !== "pending") throw new Error("VIAJE_YA_TOMADO");
      
      const driverSnap = await transaction.get(driverRef);
      if (driverSnap.exists) {
         const driverData = driverSnap.data();
         const saldo = driverData.saldo || 0;
         if (saldo < -5000) {
            throw new Error("SALDO_INSUFICIENTE");
         }
      }
      
      transaction.update(rideRef, {
         status: "accepted",
         driverId: conductorId,
         acceptedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { id: viajeId, status: "accepted", driverId: conductorId };
    });
  }

  static async asignarConductorCercano(latCliente, lngCliente, tipoVehiculoRequerido) {
    const conductoresRef = db.collection("artifacts").doc(appId)
                             .collection("public").doc("data")
                             .collection("usuarios");

    const snapshot = await conductoresRef
      .where("rol", "in", ["conductor", "mototaxi", "motocarga"])
      .where("estadoFisico", "==", "disponible")
      .get();

    if (snapshot.empty) return { success: false, message: "No hay conductores disponibles." };

    let conductorMasCercano = null;
    let distanciaMinima = 5; 

    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.ubicacionActual || data.tipoVehiculo !== tipoVehiculoRequerido) return;

      const { lat, lng } = data.ubicacionActual;
      const R = 6371; 
      const dLat = (lat - latCliente) * (Math.PI / 180);
      const dLon = (lng - lngCliente) * (Math.PI / 180);
      const a = Math.sin(dLat/2)**2 + Math.cos(latCliente*(Math.PI/180)) * Math.cos(lat*(Math.PI/180)) * Math.sin(dLon/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distancia = R * c;

      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        conductorMasCercano = { uid: doc.id, ...data, distanciaAprox: distancia };
      }
    });

    return conductorMasCercano ? { success: true, conductor: conductorMasCercano } : { success: false, message: "Fuera de rango." };
  }

  static async endTrip(rideId) {
    const rideRef = db.collection("artifacts").doc(appId)
                      .collection("public").doc("data")
                      .collection("rides").doc(rideId);

    return await db.runTransaction(async (transaction) => {
      const rideSnap = await transaction.get(rideRef);
      if (!rideSnap.exists) throw new Error("Viaje no encontrado");

      const rideData = rideSnap.data();
      const { driverId, tarifa, tipoVehiculo } = rideData;

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