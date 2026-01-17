// inter-tracking.js - Transmisor de GPS para Conductores
let watchId = null;

export function iniciarRastreoGPS() {
    if (!navigator.geolocation) {
        console.error("El navegador no soporta GPS");
        return;
    }

    const { db, auth, firebaseUtils } = window;
    const { doc, updateDoc, serverTimestamp } = firebaseUtils;

    // Configuración para máxima precisión y bajo consumo
    const geoOptions = {
        enableHighAccuracy: true, // Usa el GPS del hardware, no solo WiFi
        maximumAge: 30000,        // Cache de 30 segundos
        timeout: 27000            // Tiempo de espera para señal
    };

    watchId = navigator.geolocation.watchPosition(
        async (position) => {
            const user = auth.currentUser;
            if (!user) return;

            const { latitude, longitude, heading, speed } = position.coords;

            try {
                const conductorRef = doc(db, "conductores", user.uid);
                await updateDoc(conductorRef, {
                    ubicacion: {
                        lat: latitude,
                        lng: longitude
                    },
                    orientacion: heading || 0, // Hacia dónde apunta el vehículo
                    velocidad: speed || 0,      // Km/h para el panel de control
                    ultimaActualizacion: serverTimestamp(),
                    estado: "disponible"
                });
                console.log("📍 Ubicación enviada a CIMCO Cloud");
            } catch (error) {
                console.error("Error transmitiendo GPS:", error);
            }
        },
        (error) => console.error("Error de señal GPS:", error),
        geoOptions
    );
}

export function detenerRastreoGPS() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        console.log("🛑 Rastreo GPS detenido");
    }
}