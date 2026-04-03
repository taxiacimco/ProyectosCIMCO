import { db } from './frontend/src/firebase/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

async function crearDespachadorPrueba() {
  try {
    await setDoc(doc(db, "users", "test_despachador_1"), {
      email: "despacho@lajagua.com",
      role: "despachadorinter",
      empresa: "TRANSPORTES LA JAGUA S.A.", // Este es el nombre que verá el pasajero
      status: "activo"
    });
    console.log("✅ Cooperativa de prueba creada con éxito");
  } catch (e) {
    console.error("❌ Error al crear:", e);
  }
}

crearDespachadorPrueba();