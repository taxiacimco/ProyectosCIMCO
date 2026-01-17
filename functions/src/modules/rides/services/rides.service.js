/**
 * src/modules/rides/services/rides.service.js
 * Lógica de negocio para viajes (rides) - TAXIA CIMCO
 */

import { db } from "../../../firebase-admin.js";

class RideService {
  /**
   * Crear un nuevo viaje
   * Soporta Motos (Directo) e Intermunicipales (Despacho)
   */
  async create(data) {
    const docRef = await db.collection("rides").add({
      ...data,
      status: "pending",
      createdAt: new Date(),
    });

    return {
      id: docRef.id,
      ...data,
      status: "pending",
    };
  }

  /**
   * Obtener un viaje por ID
   */
  async findById(rideId) {
    const snapshot = await db.collection("rides").doc(rideId).get();

    if (!snapshot.exists) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  }

  /**
   * Listar viajes con filtros avanzados
   * Maneja la separación entre Motos y Cooperativas
   */
  async findAll(filters = {}) {
    let query = db.collection("rides");

    // Filtro por estado
    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }

    // Filtro por tipo de flujo (Directo o Despacho)
    if (filters.requiereDespachador !== undefined) {
      query = query.where("requiereDespachador", "==", filters.requiereDespachador);
    }

    // Filtro para el Despachador de Cooperativa
    if (filters.cooperativaSolicitada && filters.cooperativaSolicitada !== 'N/A') {
      query = query.where("cooperativaSolicitada", "==", filters.cooperativaSolicitada);
    }

    // Filtro por Usuario/Pasajero
    if (filters.requesterUid) {
      query = query.where("requesterUid", "==", filters.requesterUid);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Asignar conductor a un viaje (Llamado por el Despachador)
   */
  static async assignDriver(rideId, driverId, assignedBy) {
    const docRef = db.collection("rides").doc(rideId);

    await docRef.update({
      driverId,
      assignedBy,
      status: "assigned",
      assignedAt: new Date(),
    });

    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  }

  /**
   * Iniciar viaje
   */
  static async startTrip(rideId) {
    const docRef = db.collection("rides").doc(rideId);
    await docRef.update({
      status: "in_progress",
      startedAt: new Date(),
    });
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  }

  /**
   * Finalizar viaje
   */
  static async endTrip(rideId) {
    const docRef = db.collection("rides").doc(rideId);
    await docRef.update({
      status: "completed",
      completedAt: new Date(),
    });
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  }

  /**
   * Actualizar estado genérico (Mantenido por compatibilidad)
   */
  async updateStatus(rideId, status) {
    const docRef = db.collection("rides").doc(rideId);
    await docRef.set(
      {
        status,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    return { success: true };
  }
}

export default RideService;