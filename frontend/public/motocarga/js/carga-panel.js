import { auth, db } from "./firebase-config-motocarga.js";
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
let ultimoEstado = null; // Para control de alertas

// --- 🔔 SISTEMA DE ALERTA PROFESIONAL ---
const dispararAlertaCarga = () => {
  // Vibración táctica
  if ("vibrate" in navigator) {
    navigator.vibrate([300, 100, 300]); // Un poco más larga para carga
  }
  // Sonido de aviso
  if (alertSound) {
    alertSound.play().catch(e => console.warn("Audio bloqueado por el navegador"));
  }
};

function initMap() {
  map = L.map("map", { zoomControl: false }).setView([9.56, -73.62], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "CIMCO LOGISTICS"
  }).addTo(map);
}

onAuthStateChanged(auth, async (user) => {
  if (!map) initMap();
  if (user) {
    userEmail.textContent = user.email;

    // Escuchamos los viajes asignados a este conductor de carga
    const q = query(collection(db, "viajes"), where("conductorId", "==", user.uid));
    
    onSnapshot(q, (snap) => {
      if (snap.empty) {
        assignedInfo.textContent = "Esperando solicitudes de transporte...";
        acceptBtn.classList.add("hidden");
        startBtn.classList.add("hidden");
        finishBtn.classList.add("hidden");
        currentTrip = null;
        ultimoEstado = null;
        return;
      }

      const viajeDoc = snap.docs[0];
      currentTrip = { id: viajeDoc.id, ...viajeDoc.data() };

      // --- DISPARADOR DE ALERTA ---
      if (currentTrip.estado === "asignado" && ultimoEstado !== "asignado") {
        dispararAlertaCarga();
      }
      ultimoEstado = currentTrip.estado;

      assignedInfo.innerHTML = `
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            <p class="text-xs font-bold text-slate-400 uppercase">Punto de Carga:</p>
          </div>
          <p class="text-white font-medium pl-4">${currentTrip.origen}</p>
          
          <div class="flex items-center gap-2 mt-3">
            <span class="w-2 h-2 bg-red-500 rounded-full"></span>
            <p class="text-xs font-bold text-slate-400 uppercase">Punto de Entrega:</p>
          </div>
          <p class="text-white font-medium pl-4">${currentTrip.destino}</p>
        </div>
      `;

      // Gestión de visibilidad de botones mediante estados
      acceptBtn.classList.toggle("hidden", currentTrip.estado !== "asignado");
      startBtn.classList.toggle("hidden", currentTrip.estado !== "aceptado");
      finishBtn.classList.toggle("hidden", currentTrip.estado !== "en_ruta");
    });

  } else {
    window.location.href = "/motocarga/login-motocarga.html";
  }
});

// --- ACCIONES DE FIREBASE ---
acceptBtn.addEventListener("click", async () => {
  if (!currentTrip) return;
  await updateDoc(doc(db, "viajes", currentTrip.id), { 
    estado: "aceptado",
    fechaAceptado: new Date().toISOString() 
  });
});

startBtn.addEventListener("click", async () => {
  if (!currentTrip) return;
  await updateDoc(doc(db, "viajes", currentTrip.id), { 
    estado: "en_ruta",
    fechaInicio: new Date().toISOString()
  });
});

finishBtn.addEventListener("click", async () => {
  if (!currentTrip) return;
  // Actualizamos y alertamos
  await updateDoc(doc(db, "viajes", currentTrip.id), { 
    estado: "finalizado",
    fechaFin: new Date().toISOString()
  });
  alert("🚚 ¡Flete entregado con éxito!");
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/motocarga/login-motocarga.html";
});

document.getElementById("toggleTracking").addEventListener("click", () => {
  window.dispatchEvent(new CustomEvent("toggleCargaTracking"));
});