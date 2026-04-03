// ceo-loader.js
// Inyecta header/footer y realiza checks iniciales mínimos (favicon, fecha, toggle)
import { getCurrentMode, aplicarEstiloModo } from "./firebase-manager-ceo.js";

document.addEventListener("DOMContentLoaded", () => {
  // estado visual ya presente en tu HTML: actualizamos los elementos si existen
  const modoToggle = document.getElementById("modoToggle");
  const textoModo = document.getElementById("estadoFirebaseTexto") || document.getElementById("modeLabel");
  const indicador = document.getElementById("estadoFirebase");

  try { aplicarEstiloModo(modoToggle, textoModo, indicador); } catch (err) { /* noop */ }

  // botón cambiar modo (si existe)
  const switchBtn = document.getElementById("modoToggle");
  if (switchBtn) {
    switchBtn.addEventListener("click", () => {
      import("./firebase-manager-ceo.js").then(m => {
        m.toggleFirebaseMode();
        aplicarEstiloModo(switchBtn, textoModo, indicador);
        // recarga para aplicar nuevo entorno
        setTimeout(() => location.reload(), 700);
      });
    });
  }

  // fecha dinamica
  const fechaEl = document.getElementById("fechaHora");
  if (fechaEl) {
    setInterval(() => fechaEl.textContent = new Date().toLocaleString("es-CO"), 1000);
  }
});
