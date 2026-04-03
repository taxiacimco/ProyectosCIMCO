import { useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * Hook de Alta Precisión para TAXIA CIMCO
 * Optimizado para el radar de 5km en zonas urbanas y rurales.
 */
export const useGpsOptimizado = (appId, userId) => {
  const ultimaPos = useRef({ lat: 0, lng: 0, time: 0 });

  const calcularDistanciaMetros = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; 
  };

  /**
   * Actualiza la ubicación en Firestore solo si hay un movimiento significativo.
   * Esto evita que el backend procese conductores estáticos innecesariamente.
   */
  const actualizarUbicacion = async (posicion) => {
    if (!userId) return;

    const { latitude, longitude, heading } = posicion.coords;
    const ahora = Date.now();

    const distancia = calcularDistanciaMetros(
      latitude, longitude, 
      ultimaPos.current.lat, ultimaPos.current.lng
    );

    // 🚀 LÓGICA DE FILTRO CIMCO: 
    // Solo enviar si se movió > 15m O si pasaron 20 seg (latido de vida)
    if (distancia > 15 || (ahora - ultimaPos.current.time) > 20000) {
      try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', userId);
        
        await updateDoc(userRef, {
          ubicacion: {
            lat: latitude,
            lng: longitude,
            heading: heading || 0
          },
          lastUpdate: serverTimestamp(),
          estadoFisico: "disponible" // Asegura que el radar lo detecte
        });

        ultimaPos.current = { lat: latitude, lng: longitude, time: ahora };
        // console.log("📍 GPS Actualizado: Movimiento detectado.");
      } catch (error) {
        console.error("❌ Error actualizando GPS en Firestore:", error);
      }
    }
  };

  return { actualizarUbicacion };
};