// ============================================================
//  inter-aceptar-viaje.js
//  Módulo para gestionar la aceptación y actualización de viajes
// ============================================================

import { db, auth } from "./firebase-config-inter.js";
import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp
} from "../firebase/firebase-loader.js";
import {
  onAuthStateChanged
} from "../firebase/firebase-loader.js";

// ============================================================
//  Elementos del DOM
// ============================================================
const estadoEl = document.getElementById("estado");
const aceptarBtn = document.createElement("button");
const rechazarBtn = document.createElement("button");
const enRutaBtn = document.createElement("button");
const finalizarBtn = document.createElement("button");

// Estilos comunes
[aceptarBtn, rechazarBtn, enRutaBtn, finalizarBtn].forEach((btn) => {
  btn.className =
    "w-full py-3 mt-2 rounded-lg font-bold transition transform hover:scale-105";
});

// Botones
aceptarBtn.textContent = "✅ Aceptar Viaje";
aceptarBtn.style.backgroundColor = "#16a34a";

rechazarBtn.textContent = "❌ Rechazar Viaje";
rechazarBtn.style.backgroundColor = "#dc2626";

enRutaBtn.textContent = "🛵 En Ruta";
enRutaBtn.style.backgroundColor = "#2563eb";

finalizarBtn.textContent = "🏁 Finalizar Viaje";
finalizarBtn.style.backgroundColor = "#9333ea";

// Insertar botones debajo del estado
document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.querySelector("main");
  contenedor.appendChild(aceptarBtn);
  contenedor.appendChild(rechazarBtn);
});

// ============================================================
//  Lógica principal
// ============================================================
let currentUser = null;
let viajeActualId = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    escucharViajePendiente(user.uid);
  } else {
    window.location.href = "./login-inter.html";
  }
});

// ============================================================
//  Escucha en tiempo real de viajes asignados al conductor
// ============================================================
function escucharViajePendiente(conductorId) {
  const ref = doc(db, "viajes_asignados", conductorId);
  onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      viajeActualId = snap.id;

      estadoEl.innerHTML = `
        🚖 Viaje pendiente: 
        <br><strong>Pasajero:</strong> ${data.nombrePasajero || "Sin nombre"}
        <br><strong>Destino:</strong> ${data.destinoNombre || "Desconocido"}
        <br><strong>Estado:</strong> ${data.estado}
      `;

      if (data.estado === "pendiente") {
        mostrarBotones(aceptarBtn, rechazarBtn);
      } else if (data.estado === "aceptado") {
        mostrarBotones(enRutaBtn);
      } else if (data.estado === "en_ruta") {
        mostrarBotones(finalizarBtn);
      } else {
        ocultarBotones();
        estadoEl.textContent = "✅ No tienes viajes pendientes.";
      }
    } else {
      ocultarBotones();
      estadoEl.textContent = "✅ No tienes viajes asignados actualmente.";
    }
  });
}

// ============================================================
//  Actualización de estado del viaje en Firestore
// ============================================================
async function actualizarEstado(estado, mensaje) {
  if (!viajeActualId) return;

  try {
    const ref = doc(db, "viajes_asignados", viajeActualId);
    await updateDoc(ref, {
      estado,
      actualizado: serverTimestamp(),
    });

    estadoEl.textContent = mensaje;

    // También actualizamos en la colección global de "viajes"
    const globalRef = doc(db, "viajes", viajeActualId);
    await updateDoc(globalRef, {
      estado,
      actualizado: serverTimestamp(),
    });

    console.log(`🚕 Estado del viaje actualizado a: ${estado}`);
  } catch (err) {
    console.error("⚠️ Error actualizando estado:", err);
  }
}

// ============================================================
//  Acciones de los botones
// ============================================================
aceptarBtn.addEventListener("click", async () => {
  await actualizarEstado("aceptado", "✅ Has aceptado el viaje. Dirígete al pasajero.");
  mostrarBotones(enRutaBtn);
});

rechazarBtn.addEventListener("click", async () => {
  await deleteDoc(doc(db, "viajes_asignados", currentUser.uid));
  estadoEl.textContent = "❌ Has rechazado el viaje.";
  ocultarBotones();
});

enRutaBtn.addEventListener("click", async () => {
  await actualizarEstado("en_ruta", "🛵 Estás en ruta al destino.");
  mostrarBotones(finalizarBtn);
});

finalizarBtn.addEventListener("click", async () => {
  await actualizarEstado("finalizado", "🏁 Has finalizado el viaje.");
  await deleteDoc(doc(db, "viajes_asignados", currentUser.uid));
  ocultarBotones();
});

// ============================================================
//  Utilidades visuales
// ============================================================
function mostrarBotones(...botones) {
  ocultarBotones();
  const contenedor = document.querySelector("main");
  botones.forEach((btn) => contenedor.appendChild(btn));
}

function ocultarBotones() {
  [aceptarBtn, rechazarBtn, enRutaBtn, finalizarBtn].forEach((btn) => {
    if (btn.parentNode) btn.remove();
  });
}

