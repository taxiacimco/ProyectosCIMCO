// Versión Arquitectura: V1.0 - Trigger de Inicialización de Chat
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

export const onTripAcceptedInitChat = onDocumentUpdated(
  "artifacts/taxiacimco-app/public/data/trips/{tripId}",
  async (event) => {
    const newValue = event.data.after.data();
    const previousValue = event.data.before.data();

    // 🛡️ Solo inicializar si el status cambia a 'ACCEPTED'
    if (newValue.status === 'ACCEPTED' && previousValue.status !== 'ACCEPTED') {
      const tripId = event.params.tripId;
      const chatRef = db.doc(`artifacts/taxiacimco-app/public/data/chats/${tripId}`);

      await chatRef.set({
        tripId,
        participants: [newValue.pasajeroId, newValue.conductorId],
        createdAt: new Date().toISOString(),
        active: true
      });

      console.log(`✅ Chat inicializado para el viaje: ${tripId}`);
    }
  }
);