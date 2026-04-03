import { db, auth } from "../../js/firebase/firebase-loader.js"; // Ajustado a tu ruta
import { 
    collection, onSnapshot, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- REFERENCIAS DOM ---
const counters = {
    conductores: document.getElementById("count-conductores"),
    viajes: document.getElementById("count-viajes"),
    pasajeros: document.getElementById("count-pasajeros"),
    money: document.getElementById("total-money"),
    badgeViajes: document.getElementById("viajes-badge")
};

// --- 1. MONITOR DE CONDUCTORES (Global) ---
function monitorConductores() {
    const q = query(collection(db, "users"), where("role", "in", ["mototaxi", "interconductor", "motocarga", "motoparrillero"]));
    onSnapshot(q, (snap) => {
        counters.conductores.innerText = snap.size;
    });
}

// --- 2. MONITOR DE PASAJEROS ---
function monitorPasajeros() {
    const q = query(collection(db, "users"), where("role", "==", "pasajero"));
    onSnapshot(q, (snap) => {
        counters.pasajeros.innerText = snap.size;
    });
}

// --- 3. MONITOR DE VIAJES Y DINERO ---
function monitorViajes() {
    onSnapshot(collection(db, "viajes"), (snap) => {
        let activos = 0;
        let totalRecaudado = 0;
        let statsGremios = { mototaxi: 0, intermunicipal: 0, motocarga: 0, motoparrillero: 0 };

        snap.forEach(doc => {
            const data = doc.data();
            // Contar viajes activos
            if (["asignado", "aceptado", "en_ruta"].includes(data.estado)) activos++;
            
            // Sumar dinero (solo de finalizados)
            if (data.estado === "finalizado" && data.oferta_cop) {
                totalRecaudado += parseInt(data.oferta_cop);
            }

            // Agrupar para gráfica
            if (data.tipo_vehiculo && statsGremios[data.tipo_vehiculo] !== undefined) {
                statsGremios[data.tipo_vehiculo]++;
            }
        });

        counters.viajes.innerText = activos;
        counters.badgeViajes.innerText = activos;
        counters.badgeViajes.classList.toggle("hidden", activos === 0);
        counters.money.innerText = `$${totalRecaudado.toLocaleString('es-CO')}`;
        
        updateCharts(statsGremios);
    });
}

// --- 4. GRÁFICAS (Chart.js) ---
let myChart;
function updateCharts(stats) {
    const ctx = document.getElementById('gremiosChart').getContext('2d');
    if (myChart) myChart.destroy();
    
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Mototaxi', 'Intermunicipal', 'Carga', 'Parrillero'],
            datasets: [{
                data: [stats.mototaxi, stats.intermunicipal, stats.motocarga, stats.motoparrillero],
                backgroundColor: ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { weight: 'bold' } } } }
        }
    });
}

// --- 5. INICIALIZACIÓN ---
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById("ceoEmail").innerText = user.email;
        monitorConductores();
        monitorPasajeros();
        monitorViajes();
    }
});

// Logout
document.getElementById("logoutBtn").onclick = () => auth.signOut();