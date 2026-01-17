import { initializeApp } from "../../js/firebase/firebase-loader.js";
import { getAuth, onAuthStateChanged } from "../../js/firebase/firebase-loader.js";
import { getFirestore, collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, GeoPoint } from "../../js/firebase/firebase-loader.js";

let db, auth, conductorActivo = null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const TRIPS_COLLECTION_PATH = `artifacts/${appId}/public/data/trips`;

const listaViajes = document.getElementById("viajesPendientes");
const estadoConductor = document.getElementById("estadoConductor");

// --- INICIALIZACIÓN ---
const initConductor = () => {
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            conductorActivo = user;
            estadoConductor.textContent = `🟢 En línea: ${user.email}`;
            escucharAsignacionesDespachador();
            iniciarSeguimientoGPS();
        } else {
            window.location.href = "../login.html";
        }
    });
};

// --- ESCUCHA DE VIAJES (FILTRADO POR DESPACHADOR) ---
function escucharAsignacionesDespachador() {
    // El despachador cambia el estado de 'requested' a 'dispatched'
    const q = query(collection(db, TRIPS_COLLECTION_PATH), where("status", "==", "dispatched"));

    onSnapshot(q, (snapshot) => {
        listaViajes.innerHTML = "";
        if (snapshot.empty) {
            listaViajes.innerHTML = "<p class='text-gray-500 text-center'>Esperando viajes del despachador...</p>";
            return;
        }

        snapshot.forEach((docSnap) => {
            const v = docSnap.data();
            const id = docSnap.id;
            
            // Vibrar y sonar al recibir nueva oferta
            if ("vibrate" in navigator) navigator.vibrate(500);
            
            const div = document.createElement("div");
            div.className = "bg-slate-800 border-l-4 border-cyan-500 p-4 rounded-xl shadow-lg mb-4 animate-pulse";
            div.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-cyan-400 font-bold">📍 Origen: <span class="text-white font-normal">${v.pickupLocationText || 'Ver mapa'}</span></p>
                        <p class="text-cyan-400 font-bold">🎯 Destino: <span class="text-white font-normal">${v.destinationText}</span></p>
                        <p class="text-green-400 font-black mt-2">💰 Oferta: $${v.priceSugested}</p>
                    </div>
                </div>
                <button class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg mt-4 transition-all" 
                        onclick="aceptarEsteViaje('${id}')">
                    TOMAR SERVICIO
                </button>
            `;
            listaViajes.appendChild(div);
        });
    });
}

// --- ACEPTAR VIAJE ---
window.aceptarEsteViaje = async (viajeId) => {
    try {
        const ref = doc(db, TRIPS_COLLECTION_PATH, viajeId);
        await updateDoc(ref, {
            status: "assigned_heading",
            driverId: conductorActivo.uid,
            driverName: conductorActivo.displayName || conductorActivo.email.split('@')[0],
            driverEmail: conductorActivo.email,
            acceptedAt: serverTimestamp()
        });
        alert("¡Viaje aceptado! Dirígete al punto de recogida.");
    } catch (err) {
        console.error("Error:", err);
    }
};

// --- GPS DEL CONDUCTOR ---
function iniciarSeguimientoGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            // Actualizar perfil del conductor para que el despachador lo vea en el mapa
            const condRef = doc(db, `artifacts/${appId}/public/data/conductores_inter`, conductorActivo.uid);
            updateDoc(condRef, {
                lastLocation: new GeoPoint(latitude, longitude),
                lastUpdate: serverTimestamp(),
                status: "ocupado"
            }).catch(() => {}); // Si no existe el documento aún, fallará silenciosamente
        }, null, { enableHighAccuracy: true });
    }
}

initConductor();