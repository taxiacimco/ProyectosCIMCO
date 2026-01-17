import { auth, db } from "./firebase-config-mototaxi.js";
import { signOut } from "../firebase/firebase-loader.js";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "../firebase/firebase-loader.js";

const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");
const assignedInfo = document.getElementById("assignedInfo");
const acceptBtn = document.getElementById("acceptBtn");
const startRouteBtn = document.getElementById("startRouteBtn");
const finishBtn = document.getElementById("finishBtn");
const tripAlertSound = document.getElementById("tripAlertSound");

// --- UTILIDADES DE ALERTA ---
let ultimoEstado = null;

const ejecutarAlertaMototaxi = () => {
  // 1. Vibrar: patrón [200ms vibrar, 100ms pausa, 200ms vibrar]
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
  // 2. Sonar Ding
  if (tripAlertSound) {
    tripAlertSound.play().catch(e => console.log("Audio esperando interacción..."));
  }
};

// Mostrar email del mototaxi
window.addEventListener("DOMContentLoaded", () => {
  const email = localStorage.getItem("mototaxiEmail") || "conductor@cimco.com";
  userEmail.textContent = `👤 ${email}`;
});

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("mototaxiEmail");
      window.location.href = "./login-mototaxi.html";
    } catch (err) {
      console.error("❌ Error al cerrar sesión:", err);
    }
  });
}

function updateButtons(travelData) {
  if (!travelData) {
    assignedInfo.textContent = "Buscando servicios en la zona...";
    acceptBtn.classList.add("hidden");
    startRouteBtn.classList.add("hidden");
    finishBtn.classList.add("hidden");
    ultimoEstado = null; // Reiniciar estado
    return;
  }

  // --- LOGICA DE ALERTA DE NUEVO VIAJE ---
  if (travelData.estado === "asignado" && ultimoEstado !== "asignado") {
    ejecutarAlertaMototaxi();
  }
  ultimoEstado = travelData.estado;

  assignedInfo.innerHTML = `
    <div class="flex flex-col gap-1">
      <span class="text-cyan-400 font-black">VIAJE #${travelData.id.substring(0,6)}</span>
      <span class="text-white">📍 Origen: ${travelData.origenNombre || 'Ver en mapa'}</span>
      <span class="text-gray-400 text-[11px]">🎯 Destino: ${travelData.destino}</span>
    </div>
  `;
  
  switch(travelData.estado) {
    case "asignado":
      acceptBtn.classList.remove("hidden");
      startRouteBtn.classList.add("hidden");
      finishBtn.classList.add("hidden");
      break;
    case "aceptado":
      acceptBtn.classList.add("hidden");
      startRouteBtn.classList.remove("hidden");
      finishBtn.classList.add("hidden");
      break;
    case "en_ruta":
      acceptBtn.classList.add("hidden");
      startRouteBtn.classList.add("hidden");
      finishBtn.classList.remove("hidden");
      break;
    default:
      acceptBtn.classList.add("hidden");
      startRouteBtn.classList.add("hidden");
      finishBtn.classList.add("hidden");
      assignedInfo.textContent = "No tienes viajes activos.";
  }
}

// Funciones de botones con actualización a Firebase
acceptBtn.addEventListener("click", async () => {
  if (!assignedTravelRef) return;
  await updateDoc(assignedTravelRef, { estado: "aceptado", timestampAceptado: serverTimestamp() });
});

startRouteBtn.addEventListener("click", async () => {
  if (!assignedTravelRef) return;
  await updateDoc(assignedTravelRef, { estado: "en_ruta", timestampInicio: serverTimestamp() });
});

finishBtn.addEventListener("click", async () => {
  if (!assignedTravelRef) return;
  // Aquí podríamos disparar el confeti y el modal de calificación
  await updateDoc(assignedTravelRef, { estado: "finalizado", timestampFin: serverTimestamp() });
  alert("¡Viaje finalizado! Buen trabajo.");
});

// Suscripción en tiempo real
let assignedTravelRef = null;
let unsubscribeTravel = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    if (unsubscribeTravel) unsubscribeTravel();
    assignedTravelRef = null;
    return;
  }

  assignedTravelRef = doc(db, "viajes_asignados", user.uid);

  if (unsubscribeTravel) unsubscribeTravel();
  unsubscribeTravel = onSnapshot(assignedTravelRef, (docSnap) => {
    if (docSnap.exists()) {
      updateButtons(docSnap.data());
    } else {
      updateButtons(null);
    }
  });
});