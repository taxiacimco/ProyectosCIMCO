import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * MOTOR DE RASTREO CIMCO V5.0
 * Centraliza la emisión de coordenadas y gestión de batería.
 */
const useDriverTracking = ({ userId, rol, isOnline, viajeId }) => {
    const [ubicacion, setUbicacion] = useState(null);
    const [errorGps, setErrorGps] = useState(null);
    const watchId = useRef(null);
    const lastUpdate = useRef(0);

    const FRECUENCIA_MS = 5000; // 5 segundos para optimizar batería en La Jagua

    const detenerRastreo = () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
    };

    useEffect(() => {
        if (!isOnline || !userId) {
            detenerRastreo();
            return;
        }

        if (!("geolocation" in navigator)) {
            setErrorGps("GPS no compatible con este navegador");
            return;
        }

        watchId.current = navigator.geolocation.watchPosition(
            async (pos) => {
                const now = Date.now();
                if (now - lastUpdate.current < FRECUENCIA_MS) return;

                const coords = { 
                    lat: pos.coords.latitude, 
                    lng: pos.coords.longitude, 
                    heading: pos.coords.heading || 0,
                    speed: pos.coords.speed || 0
                };

                setUbicacion(coords);
                lastUpdate.current = now;

                try {
                    // 1. Actualización de disponibilidad en el perfil global del usuario
                    const userRef = doc(db, 'artifacts', 'taxiacimco-app', 'public', 'data', 'usuarios', userId);
                    await updateDoc(userRef, {
                        lastCoords: coords,
                        lastActive: serverTimestamp(),
                        online: true,
                        rol: rol
                    });

                    // 2. Rastreo específico del viaje en curso (si existe)
                    if (viajeId) {
                        const trackingRef = doc(db, 'artifacts', 'taxiacimco-app', 'public', 'data', 'ubicaciones_en_vivo', viajeId);
                        await setDoc(trackingRef, {
                            ...coords,
                            timestamp: serverTimestamp(),
                            estado: 'En camino'
                        }, { merge: true });
                    }
                } catch (err) {
                    console.error("Error en persistencia GPS CIMCO:", err);
                }
            },
            (err) => setErrorGps(err.message),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        return () => detenerRastreo();
    }, [isOnline, userId, viajeId, rol]);

    return { ubicacion, errorGps };
};

export default useDriverTracking;