// Versión Arquitectura: V9.5 - Consola Motoparrillero (Radar GPS + Glassmorphism)
/**
 * Ubicación: frontend/src/pages/motoparrillero/HomeMotoparrillero.jsx
 * Misión: Dashboard del conductor de pasajeros. Integra mapa interactivo Leaflet y radar de ofertas.
 * Seguridad: Validación de Billetera (Min $2.000 COP) y guardas Anti-Undefined.
 */

import React, { useState, useEffect } from 'react';
import { 
  doc, onSnapshot, collection, query, where, updateDoc, serverTimestamp, addDoc, orderBy 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { 
  Navigation, Wallet, MapPin, AlertCircle, MessageSquare, Send, CheckCircle, Navigation2
} from 'lucide-react';

// Corrección de Iconos Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ 
    iconUrl: icon, 
    shadowUrl: iconShadow, 
    iconSize: [25, 41], 
    iconAnchor: [12, 41] 
});

const ParrilleroIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png', // Icono Moto
    iconSize: [38, 38],
    iconAnchor: [19, 38]
});

// Auto-enfoque del Mapa en el GPS
function RadarLocalizador({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 16);
    }, [center, map]);
    return null;
}

const HomeMotoparrillero = () => {
  const { user } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  
  const [position, setPosition] = useState([9.566, -73.333]); // La Jagua
  const [gpsActivo, setGpsActivo] = useState(false);
  const [ofertas, setOfertas] = useState([]);
  const [viajeActivo, setViajeActivo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [errorOperativo, setErrorOperativo] = useState('');
  const [loadingAccion, setLoadingAccion] = useState(false);

  // 1. 📡 TELEMETRÍA GPS
  useEffect(() => {
      const watchId = navigator.geolocation.watchPosition(
          (pos) => {
              setPosition([pos.coords.latitude, pos.coords.longitude]);
              setGpsActivo(true);
          },
          (err) => console.error("Error GPS:", err),
          { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 2. 📡 RADAR DE OFERTAS
  useEffect(() => {
    if (!user?.email) return;
    const q = query(
      collection(db, 'artifacts/taxiacimco-app/public/data/viajes'),
      where('estadoViaje', '==', 'buscando')
    );
    const unsub = onSnapshot(q, (snap) => setOfertas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [user]);

  // 3. 📡 MONITOREO DE VIAJE ASIGNADO
  useEffect(() => {
    if (!user?.email) return;
    const q = query(
      collection(db, 'artifacts/taxiacimco-app/public/data/viajes'),
      where('conductorId', '==', user.email)
    );
    const unsub = onSnapshot(q, (snap) => {
      const asignados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activo = asignados.find(v => ['aceptado', 'en_ruta'].includes(v.estadoViaje));
      setViajeActivo(activo || null);
    });
    return () => unsub();
  }, [user]);

  // 🏍️ ACEPTAR VIAJE (Regla Billetera + Core Node)
  const handleAceptarViaje = async (viaje) => {
    setErrorOperativo('');
    if (walletLoading || balance < 2000) {
      setErrorOperativo(`⛔ Denegado: Saldo insuficiente ($${balance || 0}). Mínimo $2.000 COP.`);
      return;
    }
    setLoadingAccion(true);
    try {
      const response = await fetch('http://localhost:5000/api/viajes/aceptar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId: viaje.id, conductorId: user.email })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || 'Viaje no disponible.');

      await updateDoc(doc(db, 'artifacts/taxiacimco-app/public/data/viajes', viaje.id), {
        estadoViaje: 'aceptado',
        conductorId: user.email,
        conductorUbicacion: { lat: position[0], lng: position[1] },
        fechaAsignacion: serverTimestamp()
      });
    } catch (err) {
      setErrorOperativo(err.message);
    } finally {
      setLoadingAccion(false);
    }
  };

  // 🏁 COMPLETAR VIAJE
  const handleCompletar = async () => {
    setLoadingAccion(true);
    try {
      const response = await fetch('http://localhost:5000/api/viajes/completar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId: viajeActivo.id })
      });
      if (response.ok) {
        await updateDoc(doc(db, 'artifacts/taxiacimco-app/public/data/viajes', viajeActivo.id), {
          estadoViaje: 'completado', fechaFinalizacion: serverTimestamp()
        });
      }
    } catch (err) {
      setErrorOperativo('Error al liquidar.');
    } finally {
      setLoadingAccion(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#09090b] font-sans relative overflow-hidden">
      
      {/* MAPA DE FONDO */}
      <div className="absolute inset-0 z-0">
          <MapContainer center={position} zoom={16} className="h-full w-full" zoomControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={position} icon={ParrilleroIcon}>
                  <Popup>Unidad Motoparrillero Activa</Popup>
              </Marker>
              <RadarLocalizador center={position} />
              
              {!viajeActivo && ofertas.map(o => (
                o.origen && <Marker key={o.id} position={[o.origen.lat, o.origen.lng]} icon={DefaultIcon} />
              ))}
          </MapContainer>
      </div>

      {/* HEADER GLASSMORPHISM */}
      <header className="z-10 m-4 backdrop-blur-md bg-[#121214]/80 border border-zinc-800/60 p-4 rounded-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${gpsActivo ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400' : 'bg-zinc-900/60 border-zinc-800/60 text-yellow-500 animate-pulse'}`}>
            <Navigation2 size={20} />
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-tight text-zinc-100">Motoparrillero</h1>
            <p className="text-[10px] text-zinc-400 uppercase">{gpsActivo ? 'GPS Conectado' : 'Buscando Satélite...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-zinc-950/70 border border-zinc-800/80 px-3 py-2 rounded-xl">
          <Wallet size={14} className="text-yellow-500" />
          <p className="text-xs font-bold text-yellow-500">${balance?.toLocaleString() || 0}</p>
        </div>
      </header>

      {errorOperativo && (
        <div className="z-10 mx-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs uppercase flex items-center gap-2 backdrop-blur-sm">
          <AlertCircle size={16} /> {errorOperativo}
        </div>
      )}

      {/* PANEL INFERIOR DINÁMICO */}
      <div className="z-10 mt-auto bg-gradient-to-t from-[#09090b] via-[#09090b]/90 to-transparent pt-10 pb-6 px-4">
        
        {viajeActivo ? (
          <div className="backdrop-blur-md bg-[#121214]/90 border border-yellow-500/30 rounded-2xl p-5 shadow-xl">
            <h2 className="text-yellow-500 text-xs font-bold uppercase mb-3 flex items-center gap-2">
              <CheckCircle size={14} /> Servicio en Curso
            </h2>
            <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl space-y-2 mb-4 text-xs text-zinc-300">
              <p><span className="text-zinc-500 uppercase">Desde:</span> {viajeActivo.origenTexto}</p>
              <p><span className="text-zinc-500 uppercase">Hacia:</span> {viajeActivo.destinoTexto}</p>
            </div>
            <button 
              onClick={handleCompletar} disabled={loadingAccion}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl uppercase transition-all shadow-lg"
            >
              {loadingAccion ? 'Liquidando...' : 'Finalizar Viaje'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
             <h2 className="text-xs font-bold uppercase text-zinc-400 drop-shadow-md">
               Ofertas Cercanas ({ofertas.length})
             </h2>
             <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
               {ofertas.length === 0 ? (
                 <div className="backdrop-blur-md bg-[#121214]/60 border border-zinc-800/50 p-6 rounded-xl text-center text-zinc-500 text-xs uppercase">
                   Escaneando la zona...
                 </div>
               ) : (
                 ofertas.map(o => (
                   <div key={o.id} className="backdrop-blur-md bg-[#121214]/90 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3 shadow-lg">
                     <div className="text-xs text-zinc-300 space-y-1">
                       <p className="truncate"><strong className="text-emerald-400">A:</strong> {o.origenTexto}</p>
                       <p className="truncate"><strong className="text-red-400">B:</strong> {o.destinoTexto}</p>
                     </div>
                     <div className="flex justify-between items-center border-t border-zinc-800/60 pt-3">
                       <span className="text-sm font-bold text-yellow-500">${(o.tarifa || 0).toLocaleString()}</span>
                       <button 
                         onClick={() => handleAceptarViaje(o)} disabled={balance < 2000 || loadingAccion}
                         className="bg-yellow-600 text-black px-4 py-2 rounded-lg text-xs font-bold uppercase disabled:bg-zinc-800 disabled:text-zinc-500"
                       >
                         Aceptar
                       </button>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeMotoparrillero;