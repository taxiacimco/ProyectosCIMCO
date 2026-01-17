import { db } from '../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const ejecutarPruebaDeEstres = async (conductorId) => {
  console.log("🚀 Iniciando Prueba de Estrés: 5 viajes en ráfaga...");
  
  const servicios = ["Urbano Centro", "Vereda La Victoria", "Hospital", "Terminal", "Zona Minera"];
  
  for (let i = 0; i < 5; i++) {
    try {
      await addDoc(collection(db, "viajes_solicitados"), {
        clienteEmail: `test_pasajero_${i}@gmail.com`,
        clienteUid: "UID_PRUEBA_ESTRES",
        conductorId: conductorId, // Aquí pasamos el UID de tu conductor activo
        estado: "asignado",
        servicioSolicitado: `PRUEBA ESTRÉS #${i+1}: ${servicios[i]}`,
        ubicacion: { lat: 8.9, lng: -73.6 },
        timestamp: serverTimestamp(),
        costo: 0 // Se llenará al finalizar
      });
      console.log(`✅ Viaje de prueba ${i+1} enviado.`);
    } catch (e) {
      console.error("Error en prueba:", e);
    }
  }
  alert("🔥 Rafaga de 5 viajes enviada. ¡Verifica las notificaciones y el sonido!");
};