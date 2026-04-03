/**
 * functions/src/triggers/trips.js
 * Trigger de Firestore: Reacciona a la creación de nuevos viajes.
 * Lógica: Filtrado por cercanía y notificación masiva a conductores.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { db } from "../firebase/firebase-admin.js"; // Importación centralizada del Admin SDK
import { enviarNotificacionNuevaSolicitud } from "../modules/notifications/services/notification.service.js";
import { filtrarConductoresPorCercania } from "../modules/notifications/services/locationService.js";

// 📍 RUTA MAESTRA CIMCO: Se dispara cuando un cliente crea un documento en la subcolección de rides
export const onViajeCreado = onDocumentCreated(
  "artifacts/taxiacimco-app/public/data/rides/{viajeId}", 
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const viajeData = snapshot.data();
    const viajeId = event.params.viajeId;

    try {
      console.log(`🚖 [Trigger CIMCO] Nuevo viaje detectado: ${viajeId}. Iniciando radar de conductores...`);

      // 1. BUSCAR CONDUCTORES ACTIVOS
      // Filtramos por rol, estado 'disponible' y que el vehículo coincida con lo pedido (mototaxi, motocarga, etc.)
      const conductoresSnap = await db.collection("artifacts")
        .doc("taxiacimco-app")
        .collection("public")
        .doc("data")
        .collection("usuarios")
        .where("rol", "in", ["conductor", "mototaxi", "motoparrillero", "motocarga"])
        .where("estadoFisico", "==", "disponible") // Usamos estadoFisico para match con Rides Service
        .where("tipoVehiculo", "==", viajeData.tipoVehiculo || "mototaxi")
        .get();

      if (conductoresSnap.empty) {
        console.log("ℹ️ [Trigger] No hay conductores disponibles para este tipo de vehículo en este momento.");
        return;
      }

      // 2. EXTRAER DATOS PARA FILTRADO
      let conductores = [];
      conductoresSnap.forEach(doc => {
        conductores.push({ id: doc.id, ...doc.data() });
      });

      // 3. FILTRADO QUIRÚRGICO POR GEOLOCALIZACIÓN
      // El cliente debe enviar 'origen' con { latitude, longitude } desde el Frontend
      if (viajeData.origen && viajeData.origen.latitude && viajeData.origen.longitude) {
        console.log(`📍 [Trigger] Calculando cercanía respecto a: ${viajeData.origen.latitude}, ${viajeData.origen.longitude}`);
        
        conductores = filtrarConductoresPorCercania(
          conductores, 
          viajeData.origen.latitude, 
          viajeData.origen.longitude, 
          5 // Radio de 5 kilómetros (Ajustado para cobertura en La Jagua)
        );
        
        console.log(`🎯 [Trigger] Conductores en radio de acción: ${conductores.length}`);
      }

      if (conductores.length === 0) {
        console.log("ℹ️ [Trigger] Conductores encontrados pero fuera del radio de 5km.");
        return;
      }

      // 4. GESTIÓN DE TOKENS FCM (Push Notifications)
      // Soportamos tanto el campo fcmToken (string) como fcmTokens (array) para máxima compatibilidad
      let allTokens = [];
      for (const conductor of conductores) {
        if (conductor.fcmTokens && Array.isArray(conductor.fcmTokens)) {
          allTokens = [...allTokens, ...conductor.fcmTokens];
        } else if (conductor.fcmToken) {
          allTokens.push(conductor.fcmToken);
        }
      }

      // Limpieza de duplicados y valores nulos
      const tokensValidos = [...new Set(allTokens)].filter(t => t && t.length > 10);

      if (tokensValidos.length === 0) {
        console.log("⚠️ [Trigger] Conductores cerca, pero ninguno tiene un token de notificación válido.");
        return;
      }

      // 5. DISPARAR ALERTAS A DISPOSITIVOS MÓVILES
      await enviarNotificacionNuevaSolicitud(tokensValidos, viajeId, viajeData);
      
      console.log(`✅ [Trigger] Alertas enviadas con éxito a ${tokensValidos.length} dispositivos.`);

    } catch (error) {
      console.error("❌ [Trigger Error] Fallo crítico en proceso de asignación:", error.message);
    }
  }
);