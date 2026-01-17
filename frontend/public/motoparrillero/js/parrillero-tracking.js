import { db, auth } from "./firebase-config-motoparrillero.js";
import { doc, setDoc, serverTimestamp } from "../firebase/firebase-loader.js";

let watchId = null;

window.addEventListener("toggleMotoParTracking", () => {
  if (watchId) stopTracking();
  else startTracking();
});

function startTracking() {
  if (!navigator.geolocation) return alert("GPS no disponible");
  watchId = navigator.geolocation.watchPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, "motoparrilleros", user.uid), {
        lat: latitude,
        lng: longitude,
        timestamp: serverTimestamp(),
        nombre: user.displayName || user.email,
        estado: "activo"
      }, { merge: true });
    } catch (err) {
      console.error("Error actualizando posición:", err);
    }
  }, console.error, { enableHighAccuracy: true });
}

function stopTracking() {
  if (watchId) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}
