import React, { useEffect, useState, useRef, memo } from 'react';
import { 
  getFirestore, doc, setDoc, serverTimestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { Navigation, Loader2, ShieldCheck } from 'lucide-react';

/**
 * LiveTrackingMap Component
 * Utiliza la API de Leaflet inyectada dinámicamente para evitar errores de compilación.
 */
const LiveTrackingMap = ({ 
  modo = "pasajero", 
  estadoActual = "disponible", 
  conductores = [], 
  height = "400px" 
}) => {
  const [myLocation, setMyLocation] = useState(null);
  const [isSearching, setIsSearching] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const myMarkerRef = useRef(null);
  const watchId = useRef(null);

  // Inicialización de Firebase
  const firebaseConfig = JSON.parse(__firebase_config);
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

  useEffect(() => {
    // Cargar Leaflet desde CDN para máxima compatibilidad
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current) return;

    // Inicializar Mapa
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([9.3025, -73.3245], 16);

      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }

    const L = window.L;

    // Iconos personalizados
    const motoIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048314.png',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const userIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/235/235861.png',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      className: 'hue-rotate-[180deg]'
    });

    // Tracking GPS
    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          const coords = { lat, lng };
          
          setMyLocation(coords);
          setIsSearching(false);

          // Centrado suave
          mapInstanceRef.current.flyTo([lat, lng], 16, { animate: true, duration: 1 });

          // Actualizar/Crear marcador propio
          if (!myMarkerRef.current) {
            myMarkerRef.current = L.marker([lat, lng], { icon: modo === 'conductor' ? motoIcon : userIcon }).addTo(mapInstanceRef.current);
          } else {
            myMarkerRef.current.setLatLng([lat, lng]);
          }

          // Sincronizar Firestore
          if (auth.currentUser && modo !== 'admin_global') {
            const locRef = doc(db, 'artifacts', appId, 'public', 'data', 'ubicaciones_en_vivo', auth.currentUser.uid);
            setDoc(locRef, { 
              lat, lng, 
              lastUpdate: serverTimestamp(), 
              rol: modo,
              estado: estadoActual,
              userId: auth.currentUser.uid,
              accuracy: accuracy
            }, { merge: true });
          }
        },
        () => setIsSearching(false),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    }

    // Dibujar conductores si es admin
    if (modo === 'admin_global') {
      conductores.forEach(cond => {
        if (cond.lat && cond.lng) {
          if (!markersRef.current[cond.id]) {
            markersRef.current[cond.id] = L.marker([cond.lat, cond.lng], { icon: motoIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup(`<b class="uppercase text-[10px] font-black">${cond.nombre}</b>`);
          } else {
            markersRef.current[cond.id].setLatLng([cond.lat, cond.lng]);
          }
        }
      });
    }

  }, [mapLoaded, conductores, modo, estadoActual]);

  return (
    <div style={{ height }} className="w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 relative bg-slate-900">
      
      {/* Overlay: Estado del Sensor */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-lg">
          <div className={`w-2 h-2 rounded-full animate-pulse ${estadoActual === 'disponible' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">{modo}: {estadoActual}</span>
        </div>
      </div>

      {/* Contenedor del Mapa (Leaflet nativo) */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Pantalla de carga */}
      {(isSearching && !myLocation) && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[2000] flex flex-col items-center justify-center">
          <Loader2 className="text-cyan-500 animate-spin mb-4" size={40} />
          <p className="text-cyan-500 font-black text-[10px] uppercase tracking-[0.4em]">Sincronizando Radar...</p>
        </div>
      )}

      {/* Botón Flotante para Re-centrar */}
      {myLocation && (
        <button 
          onClick={() => mapInstanceRef.current.flyTo([myLocation.lat, myLocation.lng], 16)}
          className="absolute bottom-6 right-6 z-[1000] bg-cyan-500 text-slate-950 p-4 rounded-full shadow-2xl active:scale-90 transition-all"
        >
          <Navigation size={20} />
        </button>
      )}

      {/* Branding */}
      <div className="absolute bottom-4 left-6 z-[1000] opacity-40 pointer-events-none">
        <span className="text-white text-[9px] font-black uppercase italic">
          CIMCO <span className="text-cyan-500">Logistics Map</span>
        </span>
      </div>
    </div>
  );
};

export default memo(LiveTrackingMap);