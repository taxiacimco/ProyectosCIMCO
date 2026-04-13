// Versión Arquitectura: V8.1 - Optimización de Carga (Anti-Timeout)
/**
 * functions/src/triggers/trips.js
 * Trigger de Firestore: Reacciona a la creación de nuevos viajes.
 * Misión: Notificación masiva a conductores con carga perezosa (Lazy Loading)
 * para evitar Timeouts en el despliegue de Firebase V2.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";

/**
 * 🛡️ REGLA DE ARQUITECTURA:
 * No instanciamos servicios en el ámbito global. Esto previene que fallos en
 * módulos profundos bloqueen la inicialización de las Cloud Functions durante el deploy.
 */
export const onViajeCreado = onDocumentCreated(
  "artifacts/taxiacimco-app/public/data/rides/{viajeId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const viajeId = event.params.viajeId;
    const viajeData = snapshot.data();

    try {
        /**
         * 🚀 CARGA QUIRÚRGICA (Dynamic Import):
         * Solo cargamos la lógica de negocio cuando el evento ocurre.
         * Ruta validada: ../modules/rides/services/rides.service.js
         */
        const { default: RideService } = await import("../modules/rides/services/rides.service.js");
        const rideService = new RideService();

        console.log(`🚖 [Trigger] Nueva solicitud detectada: ${viajeId}. Delegando al RideService...`);
        
        // Ejecución de la lógica de notificación y filtrado geográfico
        // Se asume que notifyNearbyDrivers maneja internamente la lógica de la V8.0
        await rideService.notifyNearbyDrivers(viajeId, viajeData);

    } catch (error) {
        console.error(`❌ [Trigger Error] Falla crítica en despacho de viaje ${viajeId}:`, error);
    }
  }
);