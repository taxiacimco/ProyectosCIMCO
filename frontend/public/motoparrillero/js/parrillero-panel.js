import { auth, db } from "./firebase-config-motoparrillero.js";
import { signOut, onAuthStateChanged, collection, doc, onSnapshot, updateDoc, query, where } from "../firebase/firebase-loader.js";

const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const assignedInfo = document.getElementById("assignedInfo");
const acceptBtn = document.getElementById("acceptBtn");
const startBtn = document.getElementById("startBtn");
const finishBtn = document.getElementById("finishBtn");
const alertSound = document.getElementById("alertSound");

let map;
let currentTrip = null;
let ultimoEstado = null;

// --- 🔔 UTILIDAD DE ALERTA ---
const alertarNuevoViaje = () => {
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
  if (alertSound) {
    alertSound.play().catch(e => console.log("Interacción requerida para audio"));
  }
};

function initMap() {
  map = L.map("map").setView([9.56, -73.62], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "TAXIA CIMCO"
  }).addTo(map);
}

onAuthStateChanged(auth, async (user) => {
  if (!map) initMap();
  if (user) {
    userEmail.textContent = user.email;

    const q = query(collection(db, "viajes"), where("conductorId", "==", user.uid));
    onSnapshot(q, (snap) => {
      if (snap.empty) {
        assignedInfo.textContent = "Esperando solicitudes...";
        acceptBtn.classList.add("hidden");
        startBtn.classList.add("hidden");
        finishBtn.classList.add("hidden");
        currentTrip = null;
        ultimoEstado = null;
        return;
      }

      const viajeDoc = snap.docs[0];
      currentTrip = { id: viajeDoc.id, ...viajeDoc.data() };

      // --- DISPARAR ALERTA SI ES NUEVO ---
      if (currentTrip.estado === "asignado" && ultimoEstado !== "asignado") {
        alertarNuevoViaje();
      }
      ultimoEstado = currentTrip.estado;

      assignedInfo.innerHTML = `
        <div class="flex flex-col gap-1">
          <p class="text-purple-400 font-bold">📍 ORIGEN: <span class="text-white font-normal">${currentTrip.origen}</span></p>
          <p class="text-purple-400 font-bold">🎯 DESTINO: <span class="text-white font-normal">${currentTrip.destino}</span></p>
          <p class="text-xs text-slate-500 italic mt-2">Estado actual: ${currentTrip.estado.toUpperCase()}</p>
        </div>
      `;

      // Control de botones
      acceptBtn.classList.toggle("hidden", currentTrip.estado !== "asignado");
      startBtn.classList.toggle("hidden", currentTrip.estado !== "aceptado");
      finishBtn.classList.toggle("hidden", currentTrip.estado !== "en_ruta");
    });

  } else {
    window.location.href = "/motoparrillero/login-motoparrillero.html";
  }
});

acceptBtn.addEventListener("click", async () => {
  if (!currentTrip) return;
  await updateDoc(doc(db, "viajes", currentTrip.id), { estado: "aceptado" });
});

startBtn.addEventListener("click", async () => {
  if (!currentTrip) return;
  await updateDoc(doc(db, "viajes", currentTrip.id), { estado: "en_ruta" });
});

finishBtn.addEventListener("click", async () => {
  if (!currentTrip) return;
  // Al finalizar podrías integrar aquí el sistema de estrellas/confeti
  await updateDoc(doc(db, "viajes", currentTrip.id), { estado: "finalizado" });
  alert("¡Servicio terminado!");
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/motoparrillero/login-motoparrillero.html";
});

document.getElementById("toggleTracking").addEventListener("click", () => {
  window.dispatchEvent(new CustomEvent("toggleMotoParTracking"));
});