// js/despachador-mapa.js
import { db, collection, query, where, onSnapshot } from "./firebase-config-despachador.js";

const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("despEmail");
  window.location.href = "../login-despachador.html";
});

// 🔹 Identificar cooperativa según correo
const email = localStorage.getItem("despEmail");
const cooperativaId = email ? email.split("@")[0] : "sin_coop";

// 🔹 Configurar el mapa centrado en Cesar - La Jagua
const map = L.map("map").setView([9.53, -73.33], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// 🔹 Diccionario de marcadores activos
const marcadores = {};

// 🔹 Consulta a Firestore: conductores intermunicipales de su cooperativa
const q = query(collection(db, "conductores_intermunicipales"), where("cooperativaId", "==", cooperativaId));

// 🔹 Escuchar en tiempo real los cambios
onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    const data = change.doc.data();
    const id = change.doc.id;

    if ((change.type === "added" || change.type === "modified") && data.lat && data.lng) {
      // Si ya existe el marcador, lo actualiza
      if (marcadores[id]) map.removeLayer(marcadores[id]);

      const icon = L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/3448/3448339.png",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -35]
      });

      marcadores[id] = L.marker([data.lat, data.lng], { icon }).addTo(map)
        .bindPopup(`
          <b>${data.nombre || "Conductor"}</b><br>
          Placa: ${data.placa || "Sin placa"}<br>
          Estado: <span class="text-cyan-400">${data.estado || "N/A"}</span>
        `);
    }

    if (change.type === "removed" && marcadores[id]) {
      map.removeLayer(marcadores[id]);
      delete marcadores[id];
    }
  });
}, (error) => {
  console.error("Error escuchando conductores:", error);
});
