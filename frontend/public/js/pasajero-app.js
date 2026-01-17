import { auth, db } from "./firebase/firebase-loader.js";
import { onAuthStateChanged, signOut, signInAnonymously } from "./firebase/firebase-loader.js";
import { 
    doc, collection, onSnapshot, addDoc, updateDoc, 
    serverTimestamp, query, where, getDocs 
} from "./firebase/firebase-loader.js";

// --- CONFIGURACIÓN DE ENTORNO ---
const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5001/pelagic-chalice-467818-e1/us-central1/api"
    : "https://tu-proyecto.cloudfunctions.net/api";

let passengerId, currentTripDocId, lastStatus = null;
const TRIPS_COLLECTION = "viajes"; // Colección unificada según tu informe

// --- 🚌 LÓGICA DE COOPERATIVAS (INTERMUNICIPAL) ---
const serviceTypeSelect = document.getElementById("serviceType");
const cooperativeSection = document.getElementById("cooperativeSection");
const cooperativeSelect = document.getElementById("cooperativeSelect");

// Carga las empresas que tienen despachadores activos
async function cargarCooperativas() {
    try {
        const q = query(collection(db, "users"), where("role", "==", "despachador"));
        const snapshot = await getDocs(q);
        cooperativeSelect.innerHTML = '<option value="">-- Elija Cooperativa --</option>';
        
        const nombresUnicos = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.cooperativa && !nombresUnicos.has(data.cooperativa)) {
                nombresUnicos.add(data.cooperativa);
                const option = document.createElement("option");
                option.value = data.cooperativa;
                option.textContent = data.cooperativa.toUpperCase();
                cooperativeSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error("Error cargando cooperativas:", error);
    }
}

// Escuchar cambios en el tipo de servicio
serviceTypeSelect.addEventListener("change", (e) => {
    if (e.target.value === "intermunicipal") {
        cooperativeSection.classList.remove("view-hidden"); // Quita el oculto
        cargarCooperativas();
    } else {
        cooperativeSection.classList.add("view-hidden"); // Oculta si no es intermunicipal
    }
});

// --- 🔔 SISTEMA DE AUDIO Y VIBRACIÓN ---
const playNotifySound = () => {
    const audio = document.getElementById("gpsSound"); 
    if (audio) {
        audio.play().catch(() => console.log("Interacción requerida para audio"));
    }
    if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
    }
};

// --- 🎉 SECUENCIA DE ÉXITO ---
const launchSuccessSequence = () => {
    if (window.confetti) {
        window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
    setTimeout(() => {
        const rating = prompt("¡Viaje finalizado! Califica a tu conductor (1 a 5):", "5");
        if (rating && currentTripDocId) {
            updateDoc(doc(db, TRIPS_COLLECTION, currentTripDocId), {
                calificacion: parseInt(rating),
                fechaCalificacion: serverTimestamp()
            });
        }
    }, 2000);
};

// --- 📍 GEOLOCALIZACIÓN ---
const startLocationTracking = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition((pos) => {
        window.currentLat = pos.coords.latitude;
        window.currentLon = pos.coords.longitude;
        window.dispatchEvent(new CustomEvent('userLocationUpdate', {
            detail: { lat: window.currentLat, lng: window.currentLon }
        }));
    }, null, { enableHighAccuracy: true });
};

// --- 🚀 SOLICITUD DE VIAJE ---
document.getElementById("solicitarViaje").onclick = async () => {
    const dest = document.getElementById("destinationAddress").value;
    const type = serviceTypeSelect.value;
    const price = document.getElementById("price").value;
    const coop = cooperativeSelect.value;
    const statusLabel = document.getElementById("estado");
    const statusContainer = document.getElementById("statusContainer");

    if (!dest) return alert("Por favor, ingresa un destino.");
    if (type === "intermunicipal" && !coop) return alert("Debes elegir una Cooperativa.");

    statusContainer.classList.remove("hidden");
    statusLabel.textContent = "⌛ Buscando conductores...";

    const tripData = {
        pasajeroId: passengerId,
        tipo_vehiculo: type,
        destino: dest,
        oferta_cop: price,
        estado: type === "intermunicipal" ? "requested" : "asignado", 
        cooperativaNombre: type === "intermunicipal" ? coop : null,
        ubicacion_recogida: { lat: window.currentLat || 0, lng: window.currentLon || 0 },
        createdAt: serverTimestamp()
    };

    try {
        const docRef = await addDoc(collection(db, TRIPS_COLLECTION), tripData);
        currentTripDocId = docRef.id;

        // Notificar a la API para procesos de backend (v1/rides)
        fetch(`${API_URL}/v1/rides`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...tripData, internalId: currentTripDocId })
        });

        monitorTrip();
    } catch (e) {
        statusLabel.textContent = "❌ Error al solicitar.";
    }
};

// --- 👁️ MONITOR DE ESTADO ---
const monitorTrip = () => {
    if (!currentTripDocId) return;
    onSnapshot(doc(db, TRIPS_COLLECTION, currentTripDocId), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const statusLabel = document.getElementById("estado");

        if (lastStatus !== data.estado) {
            playNotifySound();
            lastStatus = data.estado;

            const estados = {
                'aceptado': '✅ Conductor en camino...',
                'en_ruta': '<span class="text-cyan-400">🚀 ¡Viaje en curso!</span>',
                'finalizado': '🏁 Viaje completado',
                'requested': '🔔 Esperando despacho de Cooperativa...'
            };

            statusLabel.innerHTML = estados[data.estado] || "Buscando conductor...";
            if (data.estado === 'finalizado') launchSuccessSequence();
        }
    });
};

// --- 🔑 INICIO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        passengerId = user.uid;
        document.getElementById("userInfo").textContent = user.email.split('@')[0];
        startLocationTracking();
    } else {
        window.location.href = "/login-pasajero.html";
    }
});

document.getElementById("logoutBtn").onclick = () => signOut(auth);