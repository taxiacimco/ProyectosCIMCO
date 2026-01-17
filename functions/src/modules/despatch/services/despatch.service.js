/**
 * src/modules/despatch/services/despatch.service.js
 * Lógica de negocio para despacho y filtrado por cooperativa en TAXIA CIMCO.
 */

import { db } from "../../../firebase-admin.js";

class DespatchService {
  /**
   * Listar viajes pendientes filtrados por Cooperativa
   * Solo el despachador de la cooperativa X verá los viajes solicitados a la cooperativa X.
   */
  static async listPendingRidesByCooperative(cooperativeName) {
    try {
      const snapshot = await db
        .collection("rides")
        .where("status", "==", "pending")
        .where("tipoServicio", "==", "Vehiculo Intermunicipal")
        .where("cooperativaSolicitada", "==", cooperativeName) // Filtro clave
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error al listar viajes por cooperativa:", error);
      throw error;
    }
  }

  /**
   * Asignar un viaje a un conductor
   * Valida que el conductor pertenezca a la cooperativa que el pasajero solicitó.
   */
  static async assignRide({ rideId, driverId, despachadorCoop }) {
    const rideRef = db.collection("rides").doc(rideId);
    const driverRef = db.collection("users").doc(driverId);

    const [rideDoc, driverDoc] = await Promise.all([rideRef.get(), driverRef.get()]);

    if (!rideDoc.exists || !driverDoc.exists) {
      throw new Error("No se encontró el viaje o el conductor.");
    }

    const driverData = driverDoc.data();
    const rideData = rideDoc.data();

    // SEGURIDAD: Validar que el despachador solo asigne conductores de su misma cooperativa
    if (rideData.tipoServicio === "Vehiculo Intermunicipal") {
      if (driverData.cooperativa !== despachadorCoop) {
        throw new Error("Este conductor no pertenece a tu cooperativa.");
      }
    }

    await rideRef.set(
      {
        driverId,
        status: "assigned",
        assignedAt: new Date(),
        despachadoPor: despachadorCoop, // Auditoría
      },
      { merge: true }
    );

    return { success: true };
  }

  /**
   * Listar viajes de servicios directos (Sin despachador)
   * Mototaxi, Motoparrillero, Motocarga
   */
  static async listDirectServices() {
    const snapshot = await db
      .collection("rides")
      .where("status", "==", "pending")
      .where("tipoServicio", "in", ["Mototaxi", "Motoparrillero", "Motocarga"])
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
}

export default DespatchService;