// ===========================================================
// 🚖 TAXIA CIMCO — CEO Dashboard con Monitoreo Firestore en Tiempo Real
// ===========================================================

import {
  getCurrentMode,
  toggleFirebaseMode,
  loadFirebaseEnvironment
} from "./firebase-manager-ceo.js";

// ===========================================================
// 🔧 Variables Globales
// ===========================================================
let ENTORNO = getCurrentMode();
let db = null;
const $ = id => document.getElementById(id);

// ===========================================================
// 🚀 Inicialización del Dashboard
// ===========================================================
(async () => {
  try {
    const firebase = await loadFirebaseEnvironment();
    db = firebase.db;
    console.log(`✅ Firebase conectado (${ENTORNO.toUpperCase()})`);

    inicializarDashboard();
    actualizarEstadoFirestore();
    setInterval(actualizarEstadoFirestore, 60000);
  } catch (error) {
    console.error("❌ Error al inicializar Firebase:", error);
    inicializarDashboard(true);
  }
})();

// ===========================================================
// 🧠 Inicializar Dashboard Simulado o Real
// ===========================================================
function inicializarDashboard(simulado = false) {
  $("loader")?.classList.add("hidden");
  $("headerCEO")?.classList.remove("hidden");
  $("mainDashboard")?.classList.remove("hidden");
  $("miniStatusPanel")?.classList.remove("hidden");
}

// ===========================================================
// 🔍 Monitorear Firestore desde servidor Express
// ===========================================================
async function actualizarEstadoFirestore() {
  try {
    // 🔹 Lectura directa desde tu servidor Express
    const response = await fetch("http://localhost:3000/logs/status.json?" + Date.now());
    const data = await response.json();

    const box = $("estadoSistema");
    const icon = $("estadoIcon");
    const texto = $("estadoTexto");
    const tiempo = $("ultimaRevision");

    if (!box || !icon || !texto || !tiempo) return;

    if (data.status === "OK") {
      icon.textContent = "🟢";
      texto.textContent = "Firestore operativo";
      box.style.borderColor = "#22c55e";
      box.style.boxShadow = "0 0 20px rgba(34,197,94,0.6)";
    } else if (data.status === "ERROR") {
      icon.textContent = "🔴";
      texto.textContent = "Error en Firestore";
      box.style.borderColor = "#ef4444";
      box.style.boxShadow = "0 0 25px rgba(239,68,68,0.7)";
      // 🔺 abrir automáticamente el monitor externo
      window.open("status-firestore.html", "_blank");
    } else {
      icon.textContent = "🟡";
      texto.textContent = "En revisión";
      box.style.borderColor = "#facc15";
      box.style.boxShadow = "0 0 25px rgba(250,204,21,0.7)";
    }

    tiempo.textContent = "Última revisión: " + (data.lastCheck || "—");
  } catch (error) {
    console.warn("⚠️ No se pudo obtener status.json:", error);
    const box = $("estadoSistema");
    if (box) {
      box.style.borderColor = "#facc15";
      box.style.boxShadow = "0 0 25px rgba(250,204,21,0.7)";
      $("estadoTexto").textContent = "⚠️ Sin conexión al servidor";
    }
  }
}
