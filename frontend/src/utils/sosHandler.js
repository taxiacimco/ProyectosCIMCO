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
    console.error("SOS Fallido: Usuario no autenticado");
    return { success: false, error: "No autenticado" };
  }

  try {
    const sosRef = collection(db, 'alertas_sos');
    
    const nuevaAlerta = {
      usuarioId: user.uid,
      nombreUsuario: user.displayName || "Conductor Registrado",
      email: user.email,
      tipoVehiculo: tipoVehiculo || "No especificado",
      ubicacion: {
        lat: coords.lat,
        lng: coords.lng
      },
      fecha: serverTimestamp(),
      estado: 'ACTIVO', // ACTIVO -> EN_CAMINO -> RESUELTO
      prioridad: 'CRITICA',
      atendidoPor: null
    };

    // 1. Guardar en Firebase
    const docRef = await addDoc(sosRef, nuevaAlerta);
    
    // 2. Feedback Físico (Vibración de confirmación)
    if (navigator.vibrate) {
        // Vibra 3 veces rápido para avisar que se envió
        navigator.vibrate([200, 100, 200, 100, 500]);
    }

    console.log("¡SOS CRÍTICO ENVIADO! ID:", docRef.id);
    return { success: true, id: docRef.id };
    
  } catch (error) {
    console.error("Error al enviar SOS:", error);
    return { success: false, error: error.message };
  }
};