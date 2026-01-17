// ============================================================
// 🔔 ceo-notify.js — Sistema de notificaciones en tiempo real
// Roles: CEO / Admin / Coordinador
// Sonido + Toast visual + Control por permisos
// ============================================================

import { auth, db } from "../admin/js/firebase-config-ceo.js";
import {
  collection,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "../firebase/firebase-loader.js";

// ------------------------------------------------------------
// 🎵 Audio de notificación
// ------------------------------------------------------------
const audio = new Audio("/js/sounds/notify.mp3");

// ------------------------------------------------------------
// 🧱 Contenedor de toasts visuales
// ------------------------------------------------------------
let toastContainer = document.createElement("div");
toastContainer.className =
  "fixed top-4 right-4 z-50 space-y-3 max-w-xs";
document.body.appendChild(toastContainer);

// ------------------------------------------------------------
// ⚡ Función: Mostrar notificación visual
// ------------------------------------------------------------
function showToast(mensaje, tipo = "info") {
  const colores = {
    info: "bg-blue-600",
    success: "bg-green-600",
    warning: "bg-yellow-600",
    error: "bg-red-600",
  };

  const toast = document.createElement("div");
  toast.className = `${colores[tipo]} text-white p-3 rounded-xl shadow-lg animate-fade-in`;
  toast.innerHTML = `
    <strong>🔔 Nueva alerta</strong><br/>
    ${mensaje}
  `;

  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 7000);
}

// ------------------------------------------------------------
// 🔐 Detectar usuario y rol
// ------------------------------------------------------------
auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  console.log("👤 Usuario activo para notificaciones:", user.email);

  const token = await user.getIdTokenResult();
  const rol = token.claims.role || "sin_rol";

  iniciarNotificacionesPorRol(rol);
});

// ------------------------------------------------------------
// 🚦 Escuchar Firestore según rol
// ------------------------------------------------------------
function iniciarNotificacionesPorRol(rol) {
  console.log("🎯 Activando notificaciones para rol:", rol);

  // Definir colecciones o filtros según rol
  let colRef;

  switch (rol) {
    case "ceo":
      colRef = collection(db, "viajes_corporativos");
      break;
    case "admin":
      colRef = collection(db, "empresas_corporativas");
      break;
    case "coordinador":
      colRef = query(collection(db, "viajes_corporativos"), where("estado", "==", "En curso"));
      break;
    default:
      console.warn("⚠️ Rol no reconocido para notificaciones:", rol);
      return;
  }

  // Escuchar cambios
  onSnapshot(colRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        const mensaje =
          rol === "ceo"
            ? `Nuevo viaje corporativo de ${data.empresaNombre || "una empresa"}`
            : rol === "admin"
            ? `Nueva empresa registrada: ${data.nombre || data.empresa || "—"}`
            : `Viaje en curso para ${data.empresaNombre || "una empresa"}`;

        // Sonido + Toast
        audio.play().catch(() => {});
        showToast(mensaje, "success");
      }
    });
  });
}

// ------------------------------------------------------------
// 💫 Animación CSS
// ------------------------------------------------------------
const style = document.createElement("style");
style.innerHTML = `
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
`;
document.head.appendChild(style);

console.log("✅ ceo-notify.js cargado correctamente.");

