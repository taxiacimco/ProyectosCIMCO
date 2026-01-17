// ceo-notifications-panel.js - Notificaciones persistentes
let notificacionesCache = new Set();

export function initNotificacionesPersistentes() {
  // Extraemos las herramientas de la ventana global (configuradas por firebase-loader.js)
  const { db, firebaseUtils } = window;
  const { collection, query, onSnapshot, orderBy, limit } = firebaseUtils;

  const viajesRef = collection(db, "viajes");
  const q = query(viajesRef, orderBy("fecha", "desc"), limit(5));
  
  const badge = document.getElementById("viajes-badge");
  const panelList = document.getElementById("notificationsList");

  onSnapshot(q, (snapshot) => {
    let nuevas = 0;
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const id = change.doc.id;
        if (!notificacionesCache.has(id)) {
          notificacionesCache.add(id);
          nuevas++;
          guardarNotificacion(change.doc.data());
        }
      }
    });

    if (nuevas > 0 && badge) {
      badge.textContent = nuevas;
      badge.classList.remove("hidden");
      reproducirSonido();
      cargarNotificacionesRecientes(panelList);
    }
  });

  if (panelList) cargarNotificacionesRecientes(panelList);
}

async function guardarNotificacion(data) {
  const { db, firebaseUtils } = window;
  const { collection, addDoc, serverTimestamp } = firebaseUtils;

  try {
    await addDoc(collection(db, "notificaciones"), {
      tipo: "Nuevo viaje activo 🚕",
      detalle: data?.destino || "Viaje sin destino especificado",
      fecha: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error guardando notificación:", err);
  }
}

function reproducirSonido() {
  // Ruta corregida a tu carpeta de sonidos
  const audio = new Audio("/js/sounds/notify.mp3");
  audio.play().catch(() => {});
}

function cargarNotificacionesRecientes(panelList) {
  const { db, firebaseUtils } = window;
  const { collection, query, onSnapshot, orderBy, limit } = firebaseUtils;

  const q = query(collection(db, "notificaciones"), orderBy("fecha", "desc"), limit(5));
  
  onSnapshot(q, (snapshot) => {
    if (!panelList) return;
    panelList.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      li.className = "p-2 border-b border-slate-700 text-sm text-gray-200";
      li.innerHTML = `
        <span>${data.tipo}</span>
        <span class="block text-xs text-cyan-400">${formatearFecha(data.fecha)}</span>
      `;
      panelList.appendChild(li);
    });
  });
}

function formatearFecha(fecha) {
  try {
    const d = fecha?.toDate?.() || new Date();
    return `${d.toLocaleDateString()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "Ahora";
  }
}