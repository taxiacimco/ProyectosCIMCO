// public/admin/js/ceo-centro-live.js
// Panel CEO - Mapa en vivo + KPIs + alertas visuales (Leaflet + Firestore v11)
// Requiere: ./firebase-config-ceo.js que exporte { auth, db }

// -------------------------------------------------------------------
// CORRECCIÓN CLAVE: Se cambió la ruta de importación de
// "/js/firebase-config-ceo.js" a "./firebase-config-ceo.js" para que
// sea relativa al directorio actual, resolviendo el error de ruteo
// en el hosting.
// -------------------------------------------------------------------
import { auth, db } from "./firebase-config-ceo.js"; 
import { signOut } from "../firebase/firebase-loader.js";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit
} from "../firebase/firebase-loader.js";

/* -------------------------
   CONFIG
   ------------------------- */
const DEFAULT_CENTER = [9.56, -73.62];
const DEFAULT_ZOOM = 12;
const BLINK_INTERVAL_MS = 600; // velocidad de parpadeo para alertas

/* -------------------------
   DOM SELECTORS (asegúrate de tener estos IDs en HTML)
   - #mapLive
   - #kpiActive, #kpiConnected, #kpiInactive
   - #logLive (opcional para debug)
   ------------------------- */
const kpiActiveEl = document.getElementById("kpiActive");
const kpiConnectedEl = document.getElementById("kpiConnected");
const kpiInactiveEl = document.getElementById("kpiInactive");
const logLiveEl = document.getElementById("logLive");

/* -------------------------
   MAP INITIALIZATION (guardamos en window para evitar doble init)
   ------------------------- */
let map;
if (!window._ceoLiveMap) {
  map = L.map("mapLive", { preferCanvas: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  window._ceoLiveMap = map;
} else {
  map = window._ceoLiveMap;
}
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

/* -------------------------
   MARKER STORAGE
   ------------------------- */
const empresaMarkers = {};   // empresaId -> { marker, blinkHandle, lastUpdate }
const viajeMarkers = {};     // viajeId -> { marker, line, blinkHandle, lastUpdate }

/* -------------------------
   UTILS
   ------------------------- */
const makeDivIcon = (color = "#06b6d4", size = 14) => L.divIcon({
  html: `<div style="background:${color}; width:${size}px; height:${size}px; border-radius:50%; border:2px solid white; box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
  className: "",
  iconSize: [size, size],
  iconAnchor: [size/2, size/2]
});

function safeLog(msg) {
  if (logLiveEl) {
    const p = document.createElement("div");
    p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logLiveEl.prepend(p);
    // limitar
    if (logLiveEl.childNodes.length > 50) logLiveEl.removeChild(logLiveEl.lastChild);
  } else {
    console.debug("live:", msg);
  }
}

function startBlinkFor(markerObj) {
  // markerObj: { marker, blinkHandle }
  if (!markerObj || !markerObj.marker) return;
  if (markerObj.blinkHandle) return; // ya parpadea

  const el = markerObj.marker._icon;
  if (!el) return;
  let visible = true;
  markerObj.blinkHandle = setInterval(() => {
    visible = !visible;
    try { el.style.opacity = visible ? "1" : "0.25"; } catch(e) {}
  }, BLINK_INTERVAL_MS);
}

function stopBlinkFor(markerObj) {
  if (!markerObj) return;
  if (markerObj.blinkHandle) {
    clearInterval(markerObj.blinkHandle);
    markerObj.blinkHandle = null;
    try { markerObj.marker._icon.style.opacity = "1"; } catch(e) {}
  }
}

function setMarkerPosition(markerObj, lat, lng) {
  if (!markerObj || !markerObj.marker) return;
  markerObj.marker.setLatLng([lat, lng]);
  markerObj.lastUpdate = Date.now();
}

/* -------------------------
   KPI update helper
   ------------------------- */
function updateKPIs() {
  // active = viajes con estado "En curso"
  // connected = empresas con ubicación actualizada en los últimos 2 minutos
  // inactive = empresas sin actualización reciente
  const ahora = Date.now();
  const empresas = Object.values(empresaMarkers);
  const connected = empresas.filter(e => e.lastUpdate && (ahora - e.lastUpdate) < (1000 * 60 * 2)).length;
  const inactive = empresas.length - connected;

  const viajes = Object.values(viajeMarkers);
  const active = viajes.filter(v => v.estado === "En curso").length;

  if (kpiActiveEl) kpiActiveEl.textContent = active;
  if (kpiConnectedEl) kpiConnectedEl.textContent = connected;
  if (kpiInactiveEl) kpiInactiveEl.textContent = inactive;
}

/* -------------------------
   FIRESTORE LISTENERS
   ------------------------- */

function listenEmpresas() {
  const ref = collection(db, "empresas_corporativas");
  onSnapshot(ref, snapshot => {
    snapshot.docChanges().forEach(change => {
      const id = change.doc.id;
      const data = change.doc.data();

      if (change.type === "added" || change.type === "modified") {
        if (data.ubicacion && typeof data.ubicacion.lat === "number" && typeof data.ubicacion.lng === "number") {
          const lat = data.ubicacion.lat;
          const lng = data.ubicacion.lng;

          if (empresaMarkers[id]) {
            // actualizar
            empresaMarkers[id].marker.setLatLng([lat, lng]);
            empresaMarkers[id].lastUpdate = Date.now();
            empresaMarkers[id].marker.setPopupContent(`<strong>${escapeHtml(data.nombre || data.email || id)}</strong><br/>${data.telefono || ""}`);
          } else {
            // crear
            const marker = L.marker([lat, lng], { icon: makeDivIcon("#0ea5a4") }).addTo(map)
              .bindPopup(`<strong>${escapeHtml(data.nombre || data.email || id)}</strong><br/>${data.telefono || ""}`);
            empresaMarkers[id] = { marker, lastUpdate: Date.now(), blinkHandle: null };
          }
        } else {
          // si no tienen ubicación -> eliminar marcador
          if (empresaMarkers[id]) {
            try { map.removeLayer(empresaMarkers[id].marker); } catch(e) {}
            stopBlinkFor(empresaMarkers[id]);
            delete empresaMarkers[id];
          }
        }
      }

      if (change.type === "removed") {
        if (empresaMarkers[id]) {
          try { map.removeLayer(empresaMarkers[id].marker); } catch(e) {}
          stopBlinkFor(empresaMarkers[id]);
          delete empresaMarkers[id];
        }
      }
    });

    updateKPIs();
  }, err => {
    console.error("Error en empresas listener:", err);
    safeLog("Error empresas listener: " + err.message);
  });
}

function listenViajesCorporativos() {
  const ref = collection(db, "viajes_corporativos");
  onSnapshot(ref, snapshot => {
    snapshot.docChanges().forEach(change => {
      const id = change.doc.id;
      const data = change.doc.data();

      if (change.type === "added" || change.type === "modified") {
        // asegurar origen
        if (data.origen && data.origen.lat && data.origen.lng) {
          const lat = data.origen.lat;
          const lng = data.origen.lng;
          const color = (data.estado === "En curso") ? "#f59e0b" : (data.estado === "Finalizado" ? "#10b981" : "#06b6d4");

          if (viajeMarkers[id]) {
            viajeMarkers[id].marker.setLatLng([lat, lng]);
            viajeMarkers[id].marker.setPopupContent(popupHTMLViaje(data));
            viajeMarkers[id].estado = data.estado || viajeMarkers[id].estado;
            // actualizar linea si destino existe
            if (data.destino && data.destino.lat && data.destino.lng) {
              const latlngs = [[data.origen.lat, data.origen.lng], [data.destino.lat, data.destino.lng]];
              if (viajeMarkers[id].line) {
                viajeMarkers[id].line.setLatLngs(latlngs);
              } else {
                viajeMarkers[id].line = L.polyline(latlngs, { color, weight: 3 }).addTo(map);
              }
            } else {
              if (viajeMarkers[id].line) {
                try { map.removeLayer(viajeMarkers[id].line); } catch(e) {}
                viajeMarkers[id].line = null;
              }
            }
          } else {
            const marker = L.marker([lat, lng], { icon: makeDivIcon(color) }).addTo(map)
              .bindPopup(popupHTMLViaje(data));
            let line = null;
            if (data.destino && data.destino.lat && data.destino.lng) {
              line = L.polyline([[data.origen.lat, data.origen.lng], [data.destino.lat, data.destino.lng]], { color, weight: 3 }).addTo(map);
            }
            viajeMarkers[id] = { marker, line, estado: data.estado, blinkHandle: null, lastUpdate: Date.now() };
          }

          // si estado es "Pendiente" o "En curso" hacemos blinking
          if (data.estado === "Pendiente" || data.estado === "En curso") {
            startBlinkFor(viajeMarkers[id]);
          } else {
            stopBlinkFor(viajeMarkers[id]);
          }

        } else {
          // no tiene origen -> eliminar marcador si existía
          if (viajeMarkers[id]) {
            try { map.removeLayer(viajeMarkers[id].marker); } catch(e) {}
            if (viajeMarkers[id].line) try { map.removeLayer(viajeMarkers[id].line); } catch(e) {}
            stopBlinkFor(viajeMarkers[id]);
            delete viajeMarkers[id];
          }
        }
      }

      if (change.type === "removed") {
        if (viajeMarkers[id]) {
          try { map.removeLayer(viajeMarkers[id].marker); } catch(e) {}
          if (viajeMarkers[id].line) try { map.removeLayer(viajeMarkers[id].line); } catch(e) {}
          stopBlinkFor(viajeMarkers[id]);
          delete viajeMarkers[id];
        }
      }
    });

    // actualizar KPIs con el nuevo estado de viajes
    updateKPIs();
  }, err => {
    console.error("Error viajes listener:", err);
    safeLog("Error viajes listener: " + err.message);
  });
}

/* -------------------------
   Small popup renderer for viajes
   ------------------------- */
function popupHTMLViaje(data) {
  return `
    <div style="min-width:200px">
      <strong>Viaje: ${escapeHtml(data.estado || "Pendiente")}</strong><br/>
      Empresa: ${escapeHtml(data.empresaNombre || data.empresaEmail || "—")}<br/>
      Origen: ${data.origen ? `${Number(data.origen.lat).toFixed(5)}, ${Number(data.origen.lng).toFixed(5)}` : "—"}<br/>
      Destino: ${data.destino ? `${Number(data.destino.lat).toFixed(5)}, ${Number(data.destino.lng).toFixed(5)}` : "—"}<br/>
      Fecha: ${escapeHtml(data.fecha || (data.actualizado && data.actualizado.seconds ? new Date(data.actualizado.seconds * 1000).toLocaleString() : "—"))}
    </div>
  `;
}

/* -------------------------
   Simple html escape
   ------------------------- */
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, function (m) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m];
  });
}

/* -------------------------
   AUTH / START
   ------------------------- */
auth.onAuthStateChanged(user => {
  if (!user) {
    // redirigir al login CEO si no hay sesión
    window.location.href = "/admin/login-ceo.html";
    return;
  }
  safeLog("Sesión CEO: " + (user.email || user.uid));
  listenEmpresas();
  listenViajesCorporativos();

  // refrescar KPIs cada 30s para limpiar estados por timeouts
  setInterval(updateKPIs, 30000);
});

// Logout del botón global (si existe)
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "/admin/login-ceo.html";
  });
}
