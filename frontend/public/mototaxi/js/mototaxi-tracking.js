import { db, auth } from "./firebase-config-mototaxi.js";
import { doc, setDoc, updateDoc, serverTimestamp, onSnapshot } from "../firebase/firebase-loader.js";

let watchId = null;
let last = { lat: null, lng: null };
let assignedTravelRef = null;
let unsubscribeTravel = null;

const assignedInfo = document.getElementById("assignedInfo");
const trackingBtn = document.getElementById("toggleTracking");

let trackingActive = false;

// -----------------------------
// Función para iniciar tracking
// -----------------------------
function startTracking() {
  if (!navigator.geolocation) {
    console.error("❌ Geolocalización no soportada");
    return;
  }

  watchId = navigator.geolocation.watchPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    // Evitar duplicados
    if (lat === last.lat && lng === last.lng) return;
    last = { lat, lng };

    const user = auth.currentUser;

    // Guardar local si no hay usuario
    if (!user) {
      console.warn("⚠️ Usuario no autenticado, guardando localmente");
      localStorage.setItem("mototaxi_ultima_pos", JSON.stringify({ lat, lng, timestamp: Date.now() }));
      return;
    }

    // Guardar en Firestore mototaxis_gps
    try {
      const gpsRef = doc(db, "mototaxis_gps", user.uid);
      await setDoc(gpsRef, {
        email: user.email || user.uid,
        lat,
        lng,
        actualizado: new Date().toISOString(),
        online: navigator.onLine
      }, { merge: true });

      // Si hay viaje asignado, actualizar ubicación en el viaje también
      if (assignedTravelRef) {
        await updateDoc(assignedTravelRef, { "posicionActual": { lat, lng }, "timestampPosicion": serverTimestamp() });
      }

    } catch (err) {
      console.error("❌ Error actualizando ubicación:", err);
      localStorage.setItem("mototaxi_pendiente", JSON.stringify({ lat, lng, ts: Date.now() }));
    }
  }, (err) => {
    console.error("❌ Error GPS:", err);
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });

  trackingActive = true;
  trackingBtn.textContent = "Desactivar seguimiento";
  console.log("📡 Seguimiento mototaxi activado.");
}

// -----------------------------
// Función para detener tracking
// -----------------------------
function stopTracking() {
  if (watchId) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  trackingActive = false;
  trackingBtn.textContent = "Activar seguimiento";
  console.log("🛑 Seguimiento mototaxi detenido.");
}

// -----------------------------
// Botón toggle
// -----------------------------
trackingBtn.addEventListener("click", () => {
  if (trackingActive) stopTracking();
  else startTracking();
});

// -----------------------------
// Sincronizar posiciones pendientes al reconectar
// -----------------------------
window.addEventListener("online", async () => {
  const pending = localStorage.getItem("mototaxi_pendiente");
  const user = auth.currentUser;

  if (pending && user) {
    try {
      const p = JSON.parse(pending);
      const gpsRef = doc(db, "mototaxis_gps", user.uid);
      await updateDoc(gpsRef, { lat: p.lat, lng: p.lng, timestamp: serverTimestamp() });
      localStorage.removeItem("mototaxi_pendiente");
      console.log("✅ Posición pendiente sincronizada.");
    } catch (err) {
      console.error("❌ Error sincronizando pendiente:", err);
    }
  }
});

// -----------------------------
// Escucha de viaje asignado en tiempo real
// -----------------------------
auth.onAuthStateChanged((user) => {
  if (!user) {
    if (unsubscribeTravel) unsubscribeTravel();
    assignedTravelRef = null;
    stopTracking();
    return;
  }

  // Referencia al viaje asignado
  assignedTravelRef = doc(db, "viajes_asignados", user.uid);

  if (unsubscribeTravel) unsubscribeTravel(); // limpiar si existía
  unsubscribeTravel = onSnapshot(assignedTravelRef, (docSnap) => {
    if (docSnap.exists()) {
      const travelData = docSnap.data();
      const assignedInfo = document.getElementById("assignedInfo");
      assignedInfo.textContent = `Viaje #${travelData.id || 'N/A'} - Posición actual: ${
        travelData.posicionActual?.lat?.toFixed(4) || '--'},${travelData.posicionActual?.lng?.toFixed(4) || '--'}`;

      // Iniciar tracking automáticamente si hay viaje asignado y tracking inactivo
      if (!trackingActive) startTracking();
    } else {
      const assignedInfo = document.getElementById("assignedInfo");
      assignedInfo.textContent = "No tienes viajes asignados.";
    }
  });

  // Intentar iniciar tracking automáticamente al loguearse
  startTracking();
});

// -----------------------------
// Limpiar watch al cerrar la pestaña
// -----------------------------
window.addEventListener("beforeunload", () => {
  if (watchId) navigator.geolocation.clearWatch(watchId);
});
