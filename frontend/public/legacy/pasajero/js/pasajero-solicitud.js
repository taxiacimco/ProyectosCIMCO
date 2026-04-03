// ============================================================
// Módulo: pasajero-solicitud.js
// Función: Enviar solicitud de viaje a la API de Cloud Functions
// ============================================================

import { currentUserId, isAuthReady } from "./firebase-config-pasajero.js";

const solicitarBtn = document.getElementById("solicitarViaje");
const estadoTexto = document.getElementById("estado");
const origenInput = document.getElementById("origen");
const destinoInput = document.getElementById("destino");
const tipoPagoSelect = document.getElementById("tipoPago");
const loaderIcon = document.getElementById("loader-icon");
const buttonText = document.getElementById("button-text");

let currentPosition = null;

/**
 * 📍 Obtener y mostrar la ubicación GPS del pasajero.
 */
function getPassengerLocation() {
    if (!navigator.geolocation) {
        origenInput.value = "GPS no soportado.";
        estadoTexto.textContent = "⚠️ Tu navegador no soporta geolocalización.";
        solicitarBtn.disabled = true;
        return;
    }

    estadoTexto.textContent = "🧭 Buscando ubicación actual...";
    
    // Obtener la posición
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            
            // Simular una geocodificación inversa con una simple cadena para el Origen
            origenInput.value = `Lat: ${currentPosition.lat.toFixed(4)}, Lng: ${currentPosition.lng.toFixed(4)}`;
            
            solicitarBtn.disabled = false;
            buttonText.textContent = "SOLICITAR VIAJE AHORA";
            estadoTexto.textContent = "✅ Listo para solicitar. Ingresa tu destino.";
        },
        (error) => {
            console.error("Error al obtener ubicación GPS:", error);
            origenInput.value = "GPS fallido. Intenta recargar.";
            estadoTexto.textContent = `❌ Error GPS: ${error.message}`;
            solicitarBtn.disabled = true;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        }
    );
}

/**
 * 📲 Manejador principal para enviar la solicitud a Cloud Functions.
 */
solicitarBtn.addEventListener("click", async () => {
    if (!currentPosition) {
        estadoTexto.textContent = "⚠️ Necesitas obtener tu ubicación primero.";
        return;
    }

    const destino = destinoInput.value.trim();
    if (destino.length < 5) {
        estadoTexto.textContent = "❌ Por favor, ingresa una dirección de destino válida.";
        destinoInput.focus();
        return;
    }

    // Asegurarse de que la autenticación está lista y el ID de usuario es conocido
    if (!isAuthReady || !currentUserId) {
        estadoTexto.textContent = "⚠️ Esperando autenticación de usuario. Intenta de nuevo.";
        return;
    }
    
    // Preparar UI
    loaderIcon.classList.remove('hidden');
    buttonText.textContent = "Enviando Solicitud...";
    solicitarBtn.disabled = true;
    estadoTexto.textContent = "🕓 Enviando solicitud de viaje a la API...";

    const apiUrl = "/api/solicitud"; // La ruta en tu servidor Express/Cloud Function

    // Obtener el token de ID para la autenticación en el backend (authMiddleware)
    const token = await auth.currentUser.getIdToken();

    try {
        const payload = {
            pasajeroId: currentUserId,
            origen: currentPosition, // Enviamos el objeto {lat, lng} al backend
            destino: destino,
            tipoPago: tipoPagoSelect.value,
            // Puedes agregar más campos si los necesitas, como 'metodo' o 'valor'
        };

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`, // Necesario para authMiddleware en el backend
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok) {
            estadoTexto.classList.remove('text-gray-600');
            estadoTexto.classList.add('text-green-600', 'font-bold');
            estadoTexto.textContent = `✅ Solicitud #${result.id} creada. Esperando asignación.`;
            destinoInput.value = ""; // Limpiar destino
        } else {
            // Manejar errores de validación o del servidor (400, 500)
            const errorMsg = result.errors?.[0]?.msg || result.error || "Error desconocido en el servidor.";
            estadoTexto.classList.remove('text-gray-600');
            estadoTexto.classList.add('text-red-600', 'font-bold');
            estadoTexto.textContent = `❌ Error al solicitar: ${errorMsg}`;
        }
    } catch (error) {
        console.error("❌ Error de red o en la llamada a la API:", error);
        estadoTexto.classList.remove('text-gray-600');
        estadoTexto.classList.add('text-red-600', 'font-bold');
        estadoTexto.textContent = "❌ Error de conexión. Verifica tu red.";
    } finally {
        // Restaurar UI
        loaderIcon.classList.add('hidden');
        buttonText.textContent = "SOLICITAR VIAJE AHORA";
        solicitarBtn.disabled = false;
    }
});

// Iniciar la búsqueda de ubicación al cargar el script
getPassengerLocation();