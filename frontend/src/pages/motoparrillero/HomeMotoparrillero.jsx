// Versión Arquitectura: V11.1 - PROD READY: Integración Quirúrgica Motor Telemetría GPS en Motoparrillero
import React, { useState, useEffect } from 'react';
import { 
  doc, onSnapshot, collection, query, where, updateDoc, serverTimestamp, addDoc, orderBy 
} from 'firebase/firestore';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { API_FUNCTIONS_URL } from '@/config/api'; 
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { 
  Navigation, Wallet, MapPin, AlertCircle, MessageSquare, Send, CheckCircle, Navigation2, Truck
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

const HomeMotoparrillero = () => {
  const { user } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  
  // 📡 ESTADOS DE TELEMETRÍA (Reemplazo atómico de posición estática)
  const [posicionActual, setPosicionActual] = useState([7.4, -73.6]);
  const [gpsActivo, setGpsActivo] = useState(false);
  
  const [ofertas, setOfertas] = useState([]);
  const [viajeActivo, setViajeActivo] = useState(null); // Necesario para el contexto de telemetría
  const [errorOperativo, setErrorOperativo] = useState('');
  const [loadingAccion, setLoadingAccion] = useState(false);

  // 🛰️ MOTOR DE RASTREO EN TIEMPO REAL (RADAR)
  useEffect(() => {
    if (!user?.email) return;
  
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosicionActual([lat, lng]);
        setGpsActivo(true);
  
        try {
          // 1. Actualizar presencia global del conductor en el Radar
          const conductorRef = doc(db, FIRESTORE_PATHS.usuarios || 'usuarios', user.email);
          await updateDoc(conductorRef, {
            location: { latitude: lat, longitude: lng },
            ultimaConexion: serverTimestamp(),
            estadoRadar: 'ONLINE'
          });
  
          // 2. Si hay un viaje activo, transmitir coordenadas al pasajero
          if (viajeActivo?.id) {
            const viajeRef = doc(db, FIRESTORE_PATHS.viajes, viajeActivo.id);
            await updateDoc(viajeRef, {
              "conductorLocation.latitude": lat,
              "conductorLocation.longitude": lng
            });
          }
        } catch (err) {
          console.error("❌ Falla de sincronización telemétrica:", err);
        }
      },
      (err) => {
        console.error("⚠️ Señal GPS perdida:", err);
        setGpsActivo(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, viajeActivo]);

  // Efecto para escuchar ofertas en tiempo real
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, FIRESTORE_PATHS.viajes),
      where('estadoViaje', '==', 'pendiente')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOfertas(data);
    });

    return () => unsub();
  }, [user]);

  // Lógica de Aceptar Viaje con integración de telemetría
  const handleAceptarViaje = async (viaje) => {
    setErrorOperativo('');
    
    const tarifaViaje = parseFloat(viaje.tarifa) || 0;
    const comision = tarifaViaje * 0.10;

    if (walletLoading || balance < comision) {
      setErrorOperativo(`⛔ Denegado: Saldo insuficiente. La comisión requerida es del 10% ($${comision.toLocaleString()} COP).`);
      return;
    }

    setLoadingAccion(true);
    try {
      const response = await fetch(`${API_FUNCTIONS_URL}/api/viajes/aceptar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            viajeId: viaje.id, 
            conductorId: user.email,
            comision: comision 
        })
      });
      
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || 'Viaje no disponible.');

      await updateDoc(doc(db, FIRESTORE_PATHS.viajes, viaje.id), {
        estadoViaje: 'aceptado',
        conductorId: user.email,
        comisionCobrada: comision, 
        conductorUbicacion: { lat: posicionActual[0], lng: posicionActual[1] },
        fechaAsignacion: serverTimestamp()
      });
      
      setViajeActivo({ id: viaje.id }); // Sincronización del estado de monitoreo
    } catch (err) {
      setErrorOperativo(err.message);
    } finally {
      setLoadingAccion(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-black text-white uppercase tracking-tighter">
          Modo <span className="text-cyan-500">Motoparrillero</span>
        </h1>
        <div className="backdrop-blur-md bg-[#121214]/80 px-3 py-1 rounded-full border border-white/5 flex items-center gap-2 shadow-lg relative">
          <div className={`w-2 h-2 rounded-full ${gpsActivo ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] text-zinc-400 font-bold uppercase">{gpsActivo ? 'Online' : 'GPS Offline'}</span>
        </div>
      </div>

      {errorOperativo && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle size={14} className="shrink-0" />
          {errorOperativo}
        </div>
      )}

      <div className="h-64 rounded-3xl overflow-hidden mb-6 border border-white/5 shadow-2xl relative z-0">
         <MapContainer center={posicionActual} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={posicionActual} icon={DefaultIcon}>
                <Popup>Tu ubicación en tiempo real</Popup>
            </Marker>
         </MapContainer>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Ofertas Disponibles</h2>
        
        {ofertas.length === 0 ? (
          <div className="backdrop-blur-md bg-[#121214]/40 p-8 text-center text-zinc-500 border border-dashed border-white/5 rounded-2xl shadow-lg">
            <p className="text-xs uppercase font-bold tracking-widest">Buscando pasajeros cerca...</p>
          </div>
        ) : (
          ofertas.map(o => (
            <div key={o.id} className="backdrop-blur-md bg-[#121214]/80 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 shadow-lg hover:border-white/10 transition-all">
              <div className="text-xs text-zinc-300 space-y-1">
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-cyan-400 mt-0.5 shrink-0" />
                  <p className="truncate"><strong className="text-zinc-500 uppercase tracking-widest text-[10px]">Desde:</strong> {o.origen?.direccion || 'N/A'}</p>
                </div>
                <div className="flex items-start gap-2 border-t border-white/5 pt-1">
                  <MapPin size={13} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="truncate"><strong className="text-zinc-500 uppercase tracking-widest text-[10px]">Hacia:</strong> {o.destino?.direccion || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center border-t border-white/5 pt-3">
                <div className="flex flex-col bg-[#09090b]/60 px-3 py-1 rounded-lg border border-white/5">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Tarifa</span>
                    <span className="text-sm font-black text-emerald-400">${(parseFloat(o.tarifa) || 0).toLocaleString()}</span>
                </div>
                
                <button 
                  onClick={() => handleAceptarViaje(o)} 
                  disabled={loadingAccion || balance < (parseFloat(o.tarifa) * 0.1)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-zinc-950 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase disabled:bg-[#121214] disabled:text-zinc-600 disabled:border-white/5 border border-cyan-400 transition-all shadow-md"
                >
                  {loadingAccion ? 'Procesando...' : 'Aceptar Servicio'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HomeMotoparrillero;