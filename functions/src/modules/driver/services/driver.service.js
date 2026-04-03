/**
 * src/modules/driver/services/driver.service.js
 * Lógica de negocio para conductores de Mototaxis e Intermunicipales.
 */

import { db } from "../../../firebase/firebase-admin.js";

class DriverService {
  /**
   * Poner al conductor EN LÍNEA
   * Crucial: Captura el tipo de servicio y cooperativa para el despacho.
   */
  static async goOnline(driverId, location) {
    // 1. Buscamos los datos maestros del conductor en la colección 'users'
    const userDoc = await db.collection("users").doc(driverId).get();
    
    if (!userDoc.exists) {
      throw new Error("El perfil del conductor no existe en el sistema.");
    }

    const userData = userDoc.data();

    // 2. Preparamos el objeto de estado activo
    const activeDriverData = {
      driverId: driverId,
      nombre: userData.nombre || "Conductor",
      email: userData.email,
      placa: userData.placa || "S.P",
      numeroInterno: userData.numeroInterno || "000",
      tipoServicio: userData.tipoServicio, // Mototaxi, Motoparrillero, etc.
      cooperativa: userData.cooperativa || "N/A",
      location: location, // { lat: ..., lng: ... }
      isAvailable: true,
      lastUpdate: new Date()
    };

    // 3. Guardamos en una colección de conductores en línea (para consultas rápidas del mapa)
    await db.collection("active_drivers").doc(driverId).set(activeDriverData);

    // 4. También actualizamos su documento principal
    await db.collection("users").doc(driverId).update({
      isOnline: true,
      lastOnline: new Date()
    });

    return { success: true, tipoServicio: userData.tipoServicio };
  }

  /**
   * Poner al conductor FUERA DE LÍNEA
   */
  static async goOffline(driverId) {
    // Eliminamos de la lista de conductores activos para que ya no reciba viajes
    await db.collection("active_drivers").doc(driverId).delete();
    
    // Actualizamos el estado en su perfil
    await db.collection("users").doc(driverId).update({
      isOnline: false
    });

    return { success: true };
  }

  /**
   * Actualiza la ubicación en tiempo real mientras está en línea
   */
  static async updateLocation(driverId, location) {
    const batch = db.batch();
    
    // Actualizar en conductores activos
    const activeRef = db.collection("active_drivers").doc(driverId);
    batch.set(activeRef, { location, lastUpdate: new Date() }, { merge: true });

    // Actualizar en el perfil general (histórico)
    const userRef = db.collection("users").doc(driverId);
    batch.update(userRef, { lastLocation: location });

    await batch.commit();
    return { success: true };
  }

  /**
   * Obtiene el perfil completo del conductor
   */
  static async getProfile(driverId) {
    const docRef = db.collection("users").doc(driverId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new Error("Conductor no encontrado");
    }

    return { id: snapshot.id, ...snapshot.data() };
  }

  /**
   * Listar todos los conductores (Uso administrativo)
   */
  static async listDrivers() {
    const snapshot = await db.collection("users").where("role", "==", "driver").get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Aprobar documentos y activar conductor
   */
  static async approveDriver(driverId) {
    const docRef = db.collection("users").doc(driverId);

    await docRef.update({
      approved: true,
      approvedAt: new Date(),
      status: 'active'
    });

    return { success: true };
  }
}

export default DriverService;