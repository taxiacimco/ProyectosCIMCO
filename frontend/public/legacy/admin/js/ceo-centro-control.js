// /admin/js/ceo-centro-control.js
// ===========================================================
// 🚖 TAXIA CIMCO — Centro de Control conectado a Firebase dinámico
// ===========================================================

import {
  getCurrentMode,
  loadFirebaseEnvironment,
  toggleFirebaseMode
} from "./firebase-manager-ceo.js";

const $ = id => document.getElementById(id);
let db, auth, userRole = "desconocido";
let viajes = [];

(async () => {
  try {
    const { db: _db, auth: _auth } = await loadFirebaseEnvironment();
    db = _db;
    auth = _auth;
    console.log("✅ Firebase cargado para Centro de Control.");

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = "/admin/login-ceo.html";
        return;
      }

      const token = await user.getIdTokenResult();
      userRole = token.claims.role || "sin-rol";
      $("userRole").textContent = `Rol: ${userRole.toUpperCase()} (${user.email})`;

      if (["ceo", "admin", "coordinador"].includes(userRole)) {
        await cargarDatos(userRole);
      } else {
        alert("⚠️ Rol no válido. Cerrando sesión.");
        await auth.signOut();
        window.location.href = "/admin/login-ceo.html";
      }
    });
  } catch (e) {
    console.error("❌ Error inicializando Centro de Control:", e);
  }
})();

async function cargarDatos(rol) {
  const { getDocs, collection } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
  const snapshot = await getDocs(collection(db, "viajes_corporativos"));
  viajes = snapshot.docs.map(doc => doc.data());

  if (rol === "coordinador") {
    const email = auth.currentUser.email;
    viajes = viajes.filter(v => v.empresaEmail === email);
  }

  renderDashboard();
  renderEstadisticas();
  renderExport();
  renderGraficos();
}

// ===========================================================
// 🧩 Renderización de secciones
// ===========================================================
function renderDashboard() {
  const total = viajes.length;
  const pendientes = viajes.filter(v => v.estado === "Pendiente").length;
  const curso = viajes.filter(v => v.estado === "En curso").length;
  const fin = viajes.filter(v => v.estado === "Finalizado").length;
  const empresas = new Set(viajes.map(v => v.empresaNombre || v.empresaEmail)).size;

  $("dashboardContainer").innerHTML = `
    ${card("🧾 Total Viajes", total, "text-cyan-400")}
    ${card("🚗 En Curso", curso, "text-yellow-400")}
    ${card("✅ Finalizados", fin, "text-green-400")}
    ${card("🏢 Empresas Activas", empresas, "text-blue-400")}
  `;
}

function card(titulo, valor, color) {
  return `<div class="bg-gray-800 p-4 rounded-xl shadow text-center">
    <h3 class="text-sm text-gray-400">${titulo}</h3>
    <p class="text-3xl font-bold ${color} mt-2">${valor}</p>
  </div>`;
}

function renderEstadisticas() {
  const empresas = {};
  viajes.forEach(v => {
    const e = v.empresaNombre || v.empresaEmail || "Desconocida";
    if (!empresas[e]) empresas[e] = { Pendiente: 0, "En curso": 0, Finalizado: 0 };
    empresas[e][v.estado] = (empresas[e][v.estado] || 0) + 1;
  });

  $("tablaEstadisticas").innerHTML = Object.entries(empresas).map(([e, est]) => {
    const total = Object.values(est).reduce((a, b) => a + b, 0);
    return `<tr class="hover:bg-gray-700"><td>${e}</td>
      <td>${est.Pendiente}</td><td>${est["En curso"]}</td>
      <td>${est.Finalizado}</td><td class="font-bold">${total}</td></tr>`;
  }).join("");
}

function renderExport() {
  $("tablaExportar").innerHTML = `
    <table class="w-full text-sm">
      <thead><tr><th>Empresa</th><th>Estado</th><th>Origen</th><th>Destino</th><th>Fecha</th></tr></thead>
      <tbody>
        ${viajes.map(v => `
          <tr>
            <td>${v.empresaNombre || v.empresaEmail}</td>
            <td>${v.estado}</td>
            <td>${v.origen ? `${v.origen.lat.toFixed(4)}, ${v.origen.lng.toFixed(4)}` : "—"}</td>
            <td>${v.destino ? `${v.destino.lat.toFixed(4)}, ${v.destino.lng.toFixed(4)}` : "—"}</td>
            <td>${v.actualizado ? new Date(v.actualizado.seconds * 1000).toLocaleString() : "—"}</td>
          </tr>`).join("")}
      </tbody>
    </table>
  `;
}

function renderGraficos() {
  console.log("📊 (pendiente integrar gráficos específicos de control)");
}

// ===========================================================
// 📦 Exportar
// ===========================================================
$("exportPdf").addEventListener("click", () => {
  const doc = new jspdf.jsPDF();
  doc.text("Reporte CIMCO", 10, 10);
  doc.autoTable({ html: "#tablaExportar table" });
  doc.save("reporte_cimco.pdf");
});

$("exportExcel").addEventListener("click", () => {
  const ws = XLSX.utils.json_to_sheet(viajes);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Viajes");
  XLSX.writeFile(wb, "reporte_cimco.xlsx");
});

// ===========================================================
// 🔒 Logout
// ===========================================================
$("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "/admin/login-ceo.html";
});

