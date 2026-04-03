// ceo-mapa.js - El "Radar" del CEO
export function inicializarMapaSeguimiento() {
    const { db, firebaseUtils } = window;
    const { collection, onSnapshot, query, where } = firebaseUtils;

    // Inicializar el mapa centrado en tu zona de operación
    const map = L.map('map-canvas').setView([9.56, -73.62], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© TAXIA CIMCO'
    }).addTo(map);

    const marcadoresConductores = {}; // Diccionario para rastrear iconos en memoria

    // Crear un icono personalizado para los taxis/vans
    const taxiIcon = L.icon({
        iconUrl: '../icons/conductor-192.png', // Usamos tu icono existente
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });

    console.log("🛰️ Iniciando escucha de conductores activos...");

    // ESCUCHA EN TIEMPO REAL
    const q = query(collection(db, "conductores")); // O "interconductores" según tu DB
    
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const id = change.doc.id;

            if (change.type === "added" || change.type === "modified") {
                if (data.ubicacion && data.ubicacion.lat) {
                    const pos = [data.ubicacion.lat, data.ubicacion.lng];

                    // Si el conductor ya tiene un marcador, solo lo movemos
                    if (marcadoresConductores[id]) {
                        marcadoresConductores[id].setLatLng(pos);
                        // Opcional: Rotar el icono si tienes el 'heading'
                        if (data.orientacion) marcadoresConductores[id].setRotationAngle?.(data.orientacion);
                    } else {
                        // Si es nuevo, lo creamos
                        marcadoresConductores[id] = L.marker(pos, { icon: taxiIcon })
                            .addTo(map)
                            .bindPopup(`<b>🚐 Conductor:</b> ${data.nombre || 'Sin nombre'}<br><b>Estado:</b> ${data.estado}`);
                    }
                }
            }

            if (change.type === "removed") {
                if (marcadoresConductores[id]) {
                    map.removeLayer(marcadoresConductores[id]);
                    delete marcadoresConductores[id];
                }
            }
        });
    });
}