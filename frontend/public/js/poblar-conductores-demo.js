/**
 * poblar-conductores-demo.js
 *  Este script agrega conductores de ejemplo a Firestore
 * para que el mapa del CEO los muestre.
 */

import { initializeApp } from "../firebase/firebase-loader.js";
import { getFirestore, setDoc, doc, serverTimestamp } from "../firebase/firebase-loader.js";
import { firebaseConfig } from "./firebase-config-ceo.js"; // Usa tu config real

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔹 Conductores de ejemplo
const conductoresDemo = [
  {
    id: "mototaxi_1",
    nombre: "Carlos Mototaxi",
    lat: 9.5648,
    lng: -73.3344,
    estado: "Disponible",
  },
  {
    id: "mototaxi_2",
    nombre: "Juliana Parrillera",
    lat: 9.5660,
    lng: -73.3305,
    estado: "En servicio",
  },
  {
    id: "mototaxi_3",
    nombre: "Andrés Motocarga",
    lat: 9.5621,
    lng: -73.3380,
    estado: "Inactivo",
  },
];

// 🔹 Función principal
async function poblarConductores() {
  console.log(" Poblando Firestore con conductores de ejemplo...");

  for (const c of conductoresDemo) {
    const ref = doc(db, "ubicaciones_conductores", c.id);
    await setDoc(ref, {
      nombre: c.nombre,
      lat: c.lat,
      lng: c.lng,
      estado: c.estado,
      actualizado: serverTimestamp(),
    });
    console.log(` ${c.nombre} agregado`);
  }

  console.log(" Datos de ejemplo cargados correctamente.");
}

poblarConductores().catch(console.error);

