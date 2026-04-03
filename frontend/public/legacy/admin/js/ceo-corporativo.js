// ============================================================
// 📊 Módulo CEO Corporativo
// Control en tiempo real de empresas y viajes con Leaflet + Firestore
// ============================================================

// Importaciones Firebase
import { auth, db, logoutAdmin } from "./firebase-config-ceo.js";
import {
  collection,
  onSnapshot
} from "../firebase/firebase-loader.js";

// ============================================================
// 🗺️ CONFIGURACIÓN MAPA
// ============================================================
let map;
if (!window._ceoMap) {
  map = L.map("map").setView([9.56, -73.62], 12); // Centro en La Jagua de Ibirico
  window._ceoMap = map;
} else {
  map = window._ceoMap;
}

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map);

// Contenedores globales
const empresaMarkers = {};
const viajeMarkers = {};
const viajeLines = {};

// ============================================================
// 🎨 ICONOS Y COLORES
// ============================================================
const estadoColor = {
  "Pendiente": "#06b6d4",
  "En curso": "#f59e0b",
  "Finalizado": "#10b981",
  "Cancelado": "#ef4444"
};

const makeDivIcon = (color) =>
  L.divIcon({
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>`,
    className: "",
    iconSize: [18, 18]
  });

// ============================================================
// 👥 AUTENTICACIÓN CEO / ADMIN
// ============================================================
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "/admin/login-ceo.html";
    return;
  }

  console.log("👤 Sesión activa:", user.email);
  document.getElementById("adminEmail")?.classList.remove("hidden");

  iniciarEscuchasTiempoReal();
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await logoutAdmin();
  alert("👋 Sesión cerrada correctamente.");
  window.location.href = "/admin/login-ceo.html";
});

document.getElementById("refreshBtn")?.addEventListener("click", () => {
  window.location.reload();
});

// ============================================================
// 🔄 ESCUCHAS EN TIEMPO REAL
// ============================================================
function iniciarEscuchasTiempoReal() {
  // 1️⃣ Escuchar empresas corporativas
  const empresasRef = collection(db, "empresas_corporativas");
  onSnapshot(
    empresasRef,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const id = change.doc.id;
        const data = change.doc.data();

        if (change.type === "added" || change.type === "modified") {
          if (data.ubicacion?.lat && data.ubicacion?.lng) {
            const latLng = [data.ubicacion.lat, data.ubicacion.lng];

            if (empresaMarkers[id]) {
              empresaMarkers[id].setLatLng(latLng);
              empresaMarkers[id].setPopupContent(popupHtmlEmpresa(data));
            } else {
              empresaMarkers[id] = L.marker(latLng, {
                icon: makeDivIcon("#0ea5a4")
              })
                .addTo(map)
                .bindPopup(popupHtmlEmpresa(data));
            }
          }
        }

        if (change.type === "removed") {
          if (empresaMarkers[id]) {
            map.removeLayer(empresaMarkers[id]);
            delete empresaMarkers[id];
          }
        }
      });
    },
    (err) => console.error("❌ Error escuchando empresas:", err)
  );

  // 2️⃣ Escuchar viajes corporativos
  const viajesRef = collection(db, "viajes_corporativos");
  onSnapshot(
    viajesRef,
    (snapshot) => {
      const tabla = document.getElementById("tablaViajes");
      if (tabla) tabla.innerHTML = "";

      snapshot.docChanges().forEach((change) => {
        const id = change.doc.id;
        const data = change.doc.data();
        const color = estadoColor[data.estado] || "#06b6d4";

        // Actualizar tabla
        if (tabla) {
          const fila = document.createElement("tr");
          fila.classList.add("hover:bg-slate-700");
          fila.innerHTML = `
            <td class="p-2">${escapeHtml(data.empresaNombre || "Sin nombre")}</td>
            <td class="p-2">${escapeHtml(data.empresaEmail || "—")}</td>
            <td class="p-2 text-${data.estado === "Finalizado" ? "green" : "yellow"}-400">${escapeHtml(data.estado || "Pendiente")}</td>
            <td class="p-2">${data.origen ? `${data.origen.lat.toFixed(4)}, ${data.origen.lng.toFixed(4)}` : "N/A"}</td>
            <td class="p-2">${data.actualizado ? new Date(data.actualizado.seconds * 1000).toLocaleString() : "N/A"}</td>
          `;
          tabla.appendChild(fila);
        }

        // Actualizar marcador
        if (change.type === "added" || change.type === "modified") {
          if (data.origen?.lat && data.origen?.lng) {
            const latLng = [data.origen.lat, data.origen.lng];

            if (viajeMarkers[id]) {
              viajeMarkers[id].setLatLng(latLng);
              viajeMarkers[id].setPopupContent(popupHtmlViaje(data));
            } else {
              viajeMarkers[id] = L.marker(latLng, {
                icon: makeDivIcon(color)
              })
                .addTo(map)
                .bindPopup(popupHtmlViaje(data));
            }
          }

          // Dibujar línea entre origen y destino
          if (data.origen && data.destino) {
            const latlngs = [
              [data.origen.lat, data.origen.lng],
              [data.destino.lat, data.destino.lng]
            ];

            if (viajeLines[id]) {
              viajeLines[id].setLatLngs(latlngs);
            } else {
              viajeLines[id] = L.polyline(latlngs, {
                color,
                weight: 3,
                opacity: 0.9
              }).addTo(map);
            }
          } else if (viajeLines[id]) {
            map.removeLayer(viajeLines[id]);
            delete viajeLines[id];
          }
        }

        // Eliminar viaje
        if (change.type === "removed") {
          if (viajeMarkers[id]) {
            map.removeLayer(viajeMarkers[id]);
            delete viajeMarkers[id];
          }
          if (viajeLines[id]) {
            map.removeLayer(viajeLines[id]);
            delete viajeLines[id];
          }
        }
      });
    },
    (err) => console.error("❌ Error escuchando viajes:", err)
  );
}

// ============================================================
// 💬 FUNCIONES DE POPUPS
// ============================================================
function popupHtmlEmpresa(data) {
  return `
    <div class="text-sm">
      <strong>${escapeHtml(data.nombre || data.empresa || "Empresa")}</strong><br/>
      ${data.email ? `📧 ${escapeHtml(data.email)}<br/>` : ""}
      ${data.telefono ? `📞 ${escapeHtml(data.telefono)}<br/>` : ""}
      ${data.ubicacion ? `📍 ${data.ubicacion.lat.toFixed(5)}, ${data.ubicacion.lng.toFixed(5)}<br/>` : ""}
    </div>
  `;
}

function popupHtmlViaje(data) {
  return `
    <div class="text-sm">
      <strong>🚘 Viaje (${escapeHtml(data.estado || "Pendiente")})</strong><br/>
      Empresa: ${escapeHtml(data.empresaNombre || data.empresaEmail || "—")}<br/>
      Origen: ${data.origen ? `${data.origen.lat.toFixed(5)}, ${data.origen.lng.toFixed(5)}` : "—"}<br/>
      Destino: ${data.destino ? `${data.destino.lat.toFixed(5)}, ${data.destino.lng.toFixed(5)}` : "—"}<br/>
      ${data.actualizado ? `🕒 ${new Date(data.actualizado.seconds * 1000).toLocaleString()}` : ""}
    </div>
  `;
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, (m) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m];
  });
}

// ============================================================
// 🎯 INICIO
// ============================================================
console.log("✅ Módulo CEO Corporativo cargado correctamente.");

