import { getAuth, onAuthStateChanged, signOut } from "../../js/firebase/firebase-loader.js";
import { 
    getFirestore, collection, doc, onSnapshot, updateDoc, 
    query, where, serverTimestamp, getDoc 
} from "../../js/firebase/firebase-loader.js";

// --- CONFIGURACIÓN DE RUTAS ---
// Usamos los paths que definiste en tu informe técnico
const RIDES_COLLECTION = "rides"; 
const USERS_COLLECTION = "users";
const DRIVERS_PATH = "conductores_inter"; // Colección específica para intermunicipales

let map, markers = {};
let ultimaCantidadViajes = 0;
let miCooperativa = null; // Se cargará desde el perfil del despachador

const db = getFirestore();
const auth = getAuth();
const newTripSound = document.getElementById("newTripSound");

// --- 1. INICIALIZACIÓN Y SEGURIDAD ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById("userEmail").textContent = user.email;
        
        // Obtener el perfil del despachador para saber su cooperativa
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
        if (userDoc.exists()) {
            miCooperativa = userDoc.data().cooperativa;
            console.log("Terminal vinculada a:", miCooperativa);
            
            if (!map) initMap();
            escucharViajesFiltrados();
            escucharFlotaCooperativa();
        } else {
            console.error("No se encontró perfil de despachador");
        }
    } else {
        window.location.href = "/login"; // Redirigir si no hay sesión
    }
});

// --- 2. MAPA DE CONTROL ---
function initMap() {
    // Coordenadas iniciales (puedes ajustarlas a tu zona: La Jagua de Ibirico)
    map = L.map("map").setView([9.56, -73.33], 13); 
    L.tileLayer("https://{s}.tile.envytools.com/dark_all/{z}/{x}/{y}.png", {
        attribution: "TAXIA CIMCO - LOGÍSTICA"
    }).addTo(map);
}

// --- 3. ESCUCHAR VIAJES (Solo los de su cooperativa) ---
function escucharViajesFiltrados() {
    if (!miCooperativa) return;

    // Filtramos por estado y que el nombre de la cooperativa coincida con la elegida por el pasajero
    const q = query(
        collection(db, RIDES_COLLECTION),
        where("cooperativaNombre", "==", miCooperativa)
    );

    onSnapshot(q, (snapshot) => {
        const containers = {
            requested: document.getElementById("list-pendientes"),
            dispatched: document.getElementById("list-despacho"),
            active: document.getElementById("list-activos")
        };

        // Limpiar vistas
        Object.values(containers).forEach(c => c.innerHTML = "");
        let counts = { requested: 0, dispatched: 0, active: 0 };

        snapshot.forEach(docSnap => {
            const v = { id: docSnap.id, ...docSnap.data() };
            const card = document.createElement("div");
            card.className = "bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-lg hover:border-cyan-500/50 transition-all mb-3";
            
            let actionBtn = "";
            let targetContainer = null;

            // Lógica de estados según el flujo de despacho
            if (v.status === "requested") {
                counts.requested++;
                targetContainer = containers.requested;
                actionBtn = `<button onclick="despacharViaje('${v.id}')" class="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-[10px] font-black py-2 rounded-lg mt-3 uppercase tracking-widest shadow-lg">ENVIAR A FLOTA</button>`;
            } 
            else if (v.status === "dispatched") {
                counts.dispatched++;
                targetContainer = containers.dispatched;
                actionBtn = `<div class="flex items-center gap-2 text-yellow-500 text-[10px] font-bold mt-3 italic"><span class="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></span> BUSCANDO CONDUCTOR...</div>`;
            }
            else if (["assigned_heading", "en_ruta"].includes(v.status)) {
                counts.active++;
                targetContainer = containers.active;
                actionBtn = `<div class="text-[10px] text-green-400 font-bold mt-3 border-t border-slate-700 pt-2 flex items-center gap-2"><i class="fas fa-id-badge"></i> ${v.driverName || 'Asignado'} - ${v.placa || 'N/A'}</div>`;
            }

            if (targetContainer) {
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[10px] font-black bg-slate-700 px-2 py-0.5 rounded text-cyan-400">ID: ${v.id.substring(0,5)}</span>
                        <span class="text-xs font-black text-white">$${v.priceSugested || v.tarifa}</span>
                    </div>
                    <div class="space-y-1">
                        <p class="text-[11px] text-slate-300 font-medium truncate"><i class="fas fa-map-marker-alt text-red-500 mr-1"></i> ${v.pickupLocationText}</p>
                        <p class="text-[11px] text-slate-400 font-bold truncate"><i class="fas fa-flag-checkered text-green-500 mr-1"></i> ${v.destinationText}</p>
                    </div>
                    ${actionBtn}
                `;
                targetContainer.appendChild(card);
            }
        });

        // Alerta sonora para nuevos viajes
        if (counts.requested > ultimaCantidadViajes) {
            newTripSound?.play().catch(() => {});
        }
        ultimaCantidadViajes = counts.requested;

        // Actualizar contadores
        document.getElementById("count-pendientes").textContent = counts.requested;
        document.getElementById("count-despacho").textContent = counts.dispatched;
        document.getElementById("count-activos").textContent = counts.active;
    });
}

// --- 4. ESCUCHAR CONDUCTORES (Solo de esta cooperativa) ---
function escucharFlotaCooperativa() {
    if (!miCooperativa) return;

    // Filtramos conductores que pertenezcan a la misma cooperativa
    const q = query(
        collection(db, DRIVERS_PATH),
        where("cooperativa", "==", miCooperativa),
        where("online", "==", true)
    );

    onSnapshot(q, (snap) => {
        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.lastLocation) {
                const pos = [data.lastLocation.latitude, data.lastLocation.longitude];
                
                // Icono personalizado para Intermunicipales
                const busIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="bg-purple-500 w-3 h-3 rounded-full border-2 border-white shadow-lg"></div>`,
                    iconSize: [12, 12]
                });

                if (!markers[docSnap.id]) {
                    markers[docSnap.id] = L.marker(pos, {icon: busIcon}).addTo(map)
                        .bindPopup(`<div class="text-slate-900 font-bold text-xs">${data.driverName}<br><span class="text-blue-600">${data.placa}</span></div>`);
                } else {
                    markers[docSnap.id].setLatLng(pos);
                }
            }
        });
    });
}

// --- 5. ACCIONES DEL DESPACHADOR ---
window.despacharViaje = async (id) => {
    try {
        const rideRef = doc(db, RIDES_COLLECTION, id);
        await updateDoc(rideRef, {
            status: "dispatched",
            despachadoAt: serverTimestamp(),
            despachadorId: auth.currentUser.uid
        });
        console.log("Viaje enviado a la flota intermunicipal");
    } catch (e) {
        alert("Error al despachar servicio");
    }
};

// --- LOGOUT ---
document.getElementById("logoutBtn").onclick = () => signOut(auth);