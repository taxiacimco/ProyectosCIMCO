import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Cargamos dinámicamente Leaflet desde el CDN para evitar errores de compilación
const LeafletMap = ({ conductores, focusUser }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    // Insertar CSS de Leaflet
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Cargar Script de Leaflet
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => initMap();
    document.body.appendChild(script);

    const initMap = () => {
      if (!mapInstance.current && window.L) {
        mapInstance.current = window.L.map(mapRef.current, { zoomControl: false }).setView([9.50, -73.33], 14);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(mapInstance.current);
      }
    };

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Manejo de Marcadores
  useEffect(() => {
    if (!window.L || !mapInstance.current) return;

    const L = window.L;
    const taxiIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
      iconSize: [35, 35],
      iconAnchor: [17, 35],
      popupAnchor: [0, -35]
    });

    // Actualizar o crear marcadores
    conductores.forEach(u => {
      if (u.ubicacion) {
        const pos = [u.ubicacion.lat, u.ubicacion.lng];
        if (markersRef.current[u.id]) {
          markersRef.current[u.id].setLatLng(pos);
        } else {
          const marker = L.marker(pos, { icon: taxiIcon }).addTo(mapInstance.current);
          marker.bindPopup(`
            <div style="min-width: 150px">
              <b style="color: #0f172a; font-size: 14px;">📍 ${u.nombre}</b>
              <p style="margin: 4px 0; color: #64748b; text-transform: capitalize; font-style: italic;">${u.rol}</p>
              <p style="margin: 0; color: #10b981; font-weight: bold;">Saldo: $${u.saldoWallet?.toLocaleString() || 0}</p>
              <div style="display: flex; align-items: center; gap: 5px; margin-top: 8px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${u.estado === 'Disponible' ? '#10b981' : '#ef4444'}"></div>
                <span style="font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">${u.estado || 'Offline'}</span>
              </div>
            </div>
          `);
          markersRef.current[u.id] = marker;
        }
      }
    });

    // Remover marcadores de conductores que ya no están en la lista
    Object.keys(markersRef.current).forEach(id => {
      if (!conductores.find(c => c.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [conductores]);

  // Efecto de vuelo para FocusUser
  useEffect(() => {
    if (focusUser && focusUser.ubicacion && mapInstance.current && window.L) {
      mapInstance.current.flyTo([focusUser.ubicacion.lat, focusUser.ubicacion.lng], 17, {
        duration: 1.5
      });
    }
  }, [focusUser]);

  return <div ref={mapRef} className="h-full w-full" />;
};

const App = ({ focusUser }) => {
  const [conductores, setConductores] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const rolesInteres = ["mototaxi", "motoparrillero", "motocarga", "conductorinter"];
    // Importante: Usamos la ruta de colección estricta según las reglas del sistema
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'usuarios'),
      where("rol", "in", rolesInteres)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setConductores(docs);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-inner relative bg-slate-900">
      <LeafletMap conductores={conductores} focusUser={focusUser} />

      {/* Indicador flotante cuando hay un usuario enfocado */}
      {focusUser && (
        <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 border border-cyan-500/50 px-4 py-2 rounded-full shadow-lg animate-pulse">
          <p className="text-cyan-400 text-xs font-bold flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Siguiendo a: {focusUser.nombre}
          </p>
        </div>
      )}

      {/* Leyenda Simple */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] text-white font-bold uppercase">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-[10px] text-white font-bold uppercase">Ocupado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;