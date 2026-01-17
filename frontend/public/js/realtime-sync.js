// ============================================================
// 🌎 realtime-sync.js
// Sincronización visual y sonora entre todos los roles CIMCO
// ============================================================

import { db } from "../admin/js/firebase-config-ceo.js";
import { collection, onSnapshot } from "../firebase/firebase-loader.js";

// ============================================================
// 🎵 Inicialización de sonido
// ============================================================
const sound = new Audio("/js/sounds/notify.mp3");

// ============================================================
// 🎨 Configuración de colores según estado
// ============================================================
const ESTADOS = {
  pendiente: "#facc15",   // Amarillo
  aceptado: "#22c55e",    // Verde
  en_ruta: "#3b82f6",     // Azul
  finalizado: "#9333ea",  // Morado
  cancelado: "#ef4444"    // Rojo
};

// ============================================================
// 🗺️ Mapa global (debe existir el div#map en tu HTML)
// ============================================================
const map = L.map("map").setView([9.56, -73.62], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

const markers = {}; // Marcadores por ID de viaje

// ============================================================
// 🔁 Escucha en tiempo real de la colección "viajes"
// ============================================================
const viajesRef = collection(db, "viajes");

onSnapshot(viajesRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    const data = change.doc.data();
    const id = change.doc.id;

    if (!data.lat || !data.lng) return;

    // 🎨 Determinar color según estado
    const color = ESTADOS[data.estado] || "#9ca3af"; // gris por defecto

    // 🎯 Crear o actualizar marcador
    if (change.type === "added" || change.type === "modified") {
      if (markers[id]) map.removeLayer(markers[id]);

      const icon = L.divIcon({
        html: `<div style="
          background:${color};
          width:18px;
          height:18px;
          border-radius:50%;
          border:2px solid white;
        "></div>`,
        className: ""
      });

      markers[id] = L.marker([data.lat, data.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <strong>🚖 Viaje</strong><br>
          Pasajero: ${data.emailPasajero || "Anon"}<br>
          Estado: <b style="color:${color}">${data.estado}</b><br>
          Origen: ${data.origen || "Sin origen"}<br>
          Destino: ${data.destino || "Sin destino"}
        `);

      // 🔊 Sonido de actualización si hay cambios importantes
      if (["pendiente", "aceptado", "finalizado"].includes(data.estado)) {
        sound.play().catch(() => {});
      }
    }

    // 🗑️ Eliminación de viajes terminados
    if (change.type === "removed") {
      if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    }
  });
});

