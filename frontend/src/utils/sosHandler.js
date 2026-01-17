import { db, auth } from '../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Función para disparar una alerta SOS desde cualquier panel de conductor.
 * @param {Object} coords - Coordenadas actuales {lat, lng}
 * @param {String} tipoVehiculo - 'Mototaxi', 'Motocarga', etc.
 */
export const enviarAlertaSOS = async (coords, tipoVehiculo) => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Usuario no autenticado para enviar SOS");
  }

  try {
    const sosRef = collection(db, 'alertas_sos');
    
    const nuevaAlerta = {
      usuarioId: user.uid,
      nombreUsuario: user.displayName || "Conductor Anónimo",
      email: user.email,
      tipoVehiculo: tipoVehiculo,
      ubicacion: {
        lat: coords.lat,
        lng: coords.lng
      },
      fecha: serverTimestamp(),
      estado: 'ACTIVO', // ACTIVO, EN_CAMINO, RESUELTO
      prioridad: 'CRITICA'
    };

    const docRef = await addDoc(sosRef, nuevaAlerta);
    console.log("SOS enviado con éxito, ID:", docRef.id);
    return { success: true, id: docRef.id };
    
  } catch (error) {
    console.error("Error al enviar SOS:", error);
    return { success: false, error: error.message };
  }
};