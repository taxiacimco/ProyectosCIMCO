import { auth, db } from "./firebase-config-interconductor.js";
import { signOut, onAuthStateChanged, collection, doc, onSnapshot, updateDoc, query, where } from "../firebase/firebase-loader.js";

const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const assignedInfo = document.getElementById("assignedInfo");
const mapDiv = document.getElementById("map");
const toggleTrackingBtn = document.getElementById("toggleTracking");
const btnAceptar = document.getElementById("btnAceptar");
const btnFinalizar = document.getElementById("btnFinalizar");
const estadoTxt = document.getElementById("estado");

let map;
let currentTrip = null;
let marker = null;
let conductorMarker = null;
let pasajeroMarker = null;
let routeControl = null;

// Inicializa el mapa
function initMap() {
  map = L.map("map").setView([9.56, -73.62], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
}

// Actualiza la posición del conductor
function updateConductorMarker(lat, lng) {
  if (!conductorMarker) {
    conductorMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: `<div style="background:#00FFFF;width:16px;height:16px;border-radius:50%;border:2px solid white"></div>`,
        className: ""
      })
    }).addTo(map).bindPopup("Tu posición");
  } else {
    conductorMarker.setLatLng([lat, lng]);
  }
  map.setView([lat, lng], 14);
}

// Observa estado de autenticación
onAuthStateChanged(auth, (user) => {
  if (!map) initMap();

  if (user) {
    userEmail.textContent = user.email;

    // Consulta viajes asignados al conductor
    const q = query(collection(db, "viajes"), where("conductorId", "==", user.uid));
    onSnapshot(q, (snap) => {
      if (snap.empty) {
        assignedInfo.textContent = "No tienes viajes asignados.";
        currentTrip = null;
        estadoTxt.textContent = "📭 Sin viajes asignados";
        btnAceptar.classList.add("hidden");
        btnFinalizar.classList.add("hidden");
        return;
      }

      const viaje = snap.docs[0];
      currentTrip = { id: viaje.id, ...viaje.data() };
      assignedInfo.innerHTML = `
        <p><strong>Origen:</strong> ${currentTrip.origen}</p>
        <p><strong>Destino:</strong> ${currentTrip.destino}</p>
        <p><strong>Estado:</strong> ${currentTrip.estado}</p>
      `;

      estadoTxt.textContent = `🚖 Viaje ${currentTrip.estado}`;

      // Actualiza marcador del viaje en el mapa
      if (currentTrip.lat && currentTrip.lng) {
        if (!pasajeroMarker) {
          pasajeroMarker = L.marker([currentTrip.lat, currentTrip.lng]).addTo(map)
                            .bindPopup("📍 Pasajero");
        } else {
          pasajeroMarker.setLatLng([currentTrip.lat, currentTrip.lng]);
        }
      }

      // Muestra/oculta botones según estado
      if (currentTrip.estado === "pendiente") {
        btnAceptar.classList.remove("hidden");
        btnFinalizar.classList.add("hidden");
      } else if (currentTrip.estado === "aceptado" || currentTrip.estado === "en_ruta") {
        btnAceptar.classList.add("hidden");
        btnFinalizar.classList.remove("hidden");
      } else {
        btnAceptar.classList.add("hidden");
        btnFinalizar.classList.add("hidden");
      }
    });

    // Observa ubicación del conductor en tiempo real
    const conductorRef = doc(db, "interconductores", user.uid);
    onSnapshot(conductorRef, (snap) => {
      const data = snap.data();
      if (data?.lat && data?.lng) {
        updateConductorMarker(data.lat, data.lng);
      }
    });

    // 🔄 Geolocalización del navegador
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          updateConductorMarker(latitude, longitude);

          // Si hay un viaje en ruta, actualizamos Firestore
          if (currentTrip && (currentTrip.estado === "aceptado" || currentTrip.estado === "en_ruta")) {
            await updateDoc(doc(db, "viajes", currentTrip.id), {
              latConductor: latitude,
              lngConductor: longitude,
              estado: "en_ruta"
            });
          }

          // Actualiza Firestore ubicación conductor
          await updateDoc(doc(db, "interconductores", user.uid), {
            lat: latitude,
            lng: longitude
          });
        },
        (err) => console.warn("Error GPS:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    // ==========================
    // ✅ Aceptar viaje
    // ==========================
    btnAceptar.addEventListener("click", async () => {
      if (!currentTrip) return alert("No hay viaje asignado.");

      await updateDoc(doc(db, "viajes", currentTrip.id), { estado: "aceptado" });
      estadoTxt.textContent = "🟢 Viaje aceptado. Dirígete al pasajero.";
      btnAceptar.classList.add("hidden");
      btnFinalizar.classList.remove("hidden");

      // Mostrar ruta hacia pasajero
      if (pasajeroMarker && conductorMarker) {
        routeControl = L.Routing.control({
          waypoints: [
            L.latLng(conductorMarker.getLatLng()),
            L.latLng(pasajeroMarker.getLatLng())
          ],
          lineOptions: { styles: [{ color: "#00FFFF", weight: 4 }] },
          createMarker: () => null
        }).addTo(map);
      }
    });

    // ==========================
    // 🏁 Finalizar viaje
    // ==========================
    btnFinalizar.addEventListener("click", async () => {
      if (!currentTrip) return;

      await updateDoc(doc(db, "viajes", currentTrip.id), { estado: "finalizado" });
      estadoTxt.textContent = "🏁 Viaje finalizado con éxito.";
      btnFinalizar.classList.add("hidden");

      if (routeControl) map.removeControl(routeControl);
    });

  } else {
    window.location.href = "/interconductor/login-interconductor.html";
  }
});

// ==========================
// 🔐 Cerrar sesión
// ==========================
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/interconductor/login-interconductor.html";
});

// ==========================
// Control de tracking GPS desde botón
// ==========================
toggleTrackingBtn.addEventListener("click", () => {
  window.dispatchEvent(new CustomEvent("toggleInterTracking"));
});
