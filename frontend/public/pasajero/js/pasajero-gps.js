import { db, doc, setDoc } from "./firebase-config-pasajero.js";

const estado = document.getElementById("estado");
const pasajeroEmail = localStorage.getItem("pasajeroEmail") || "anonimo@cimco.com";

const pasajeroRef = doc(db, "pasajeros_gps", pasajeroEmail);

const actualizarUbicacion = async (lat, lng) => {
  try {
    await setDoc(pasajeroRef, {
      email: pasajeroEmail,
      lat: lat,
      lng: lng,
      actualizado: new Date().toISOString(),
      online: navigator.onLine
    });
    estado.textContent = `📍 Ubicación actualizada (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  } catch (err) {
    console.error("⚠️ Error al actualizar ubicación:", err);
    estado.textContent = "⚠️ Error al enviar ubicación";
  }
};

if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      actualizarUbicacion(lat, lng);
    },
    (err) => {
      console.warn("❌ Error GPS:", err);
      estado.textContent = "No se pudo obtener ubicación";
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
} else {
  estado.textContent = "⚠️ GPS no disponible en este dispositivo.";
}
