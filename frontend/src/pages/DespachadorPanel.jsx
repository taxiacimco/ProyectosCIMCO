import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDoc, 
  serverTimestamp, 
  increment,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  Building2, 
  Users, 
  Map as MapIcon, 
  LogOut, 
  Bell, 
  Send, 
  ShieldCheck, 
  Activity,
  Loader2,
  MapPin,
  Flag,
  ShieldAlert,
  Volume2,
  VolumeX,
  XCircle,
  Phone
} from 'lucide-react';

// Configuración de Firebase integrada
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const DespachadorPanel = () => {
  const [user, setUser] = useState(null);
  const [pedidos, setPedidos] = useState({ requested: [], dispatched: [], active: [] });
  const [conductoresEnLinea, setConductoresEnLinea] = useState([]);
  const [alertasSOS, setAlertasSOS] = useState([]);
  const [perfilDespachador, setPerfilDespachador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sirenaActiva, setSirenaActiva] = useState(false);
  
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({}); 
  const driverMarkersRef = useRef({}); 
  // Sirena de emergencia persistente
  const sirenaRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'));
  const notifyRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

  useEffect(() => {
    sirenaRef.current.loop = true;
  }, []);

  // 1. Manejo de Autenticación
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Carga de Datos y Monitoreo SOS
  useEffect(() => {
    if (!user) return;

    const cargarDatos = async () => {
      // Perfil del despachador
      const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      const userDoc = await getDoc(userDocRef);
      
      let cooperativa = "Cootransjagual"; 
      if (userDoc.exists()) {
        const data = userDoc.data();
        setPerfilDespachador(data);
        cooperativa = data.cooperativa || cooperativa;
      }

      // --- ESCUCHA DE ALERTAS SOS (CRÍTICO) ---
      const qSOS = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'alertas_sos'),
        where("estado", "==", "ACTIVO")
      );

      const unsubSOS = onSnapshot(qSOS, (snap) => {
        const alertas = [];
        snap.forEach(d => alertas.push({ id: d.id, ...d.data() }));
        setAlertasSOS(alertas);
        
        if (alertas.length > 0) {
          activarSirena();
        } else {
          desactivarSirena();
        }
      });

      // Escuchar Viajes
      const qViajes = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
        where("cooperativaNombre", "==", cooperativa)
      );

      const unsubViajes = onSnapshot(qViajes, (snap) => {
        const cat = { requested: [], dispatched: [], active: [] };
        snap.forEach(d => {
          const v = { id: d.id, ...d.data() };
          if (v.estado === "pendiente") cat.requested.push(v);
          else if (v.estado === "despachado") cat.dispatched.push(v);
          else if (["aceptado", "en_ruta"].includes(v.estado)) cat.active.push(v);
          
          if (v.origenCoords?.lat && mapInstance.current) actualizarMarcadorPasajero(v);
        });
        setPedidos(cat);
      });

      // Escuchar Flota Online
      const qFlota = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'conductores_online')
      );

      const unsubFlota = onSnapshot(qFlota, (snap) => {
        const drivers = [];
        snap.forEach(d => {
          const driver = { id: d.id, ...d.data() };
          drivers.push(driver);
          if (driver.lastLocation && mapInstance.current) actualizarMarcadorConductor(driver);
        });
        setConductoresEnLinea(drivers);
      });

      setLoading(false);
      return () => { unsubViajes(); unsubFlota(); unsubSOS(); };
    };

    cargarDatos();
  }, [user]);

  // 3. Funciones de Alerta
  const activarSirena = () => {
    setSirenaActiva(true);
    sirenaRef.current.play().catch(e => console.log("Interacción requerida para audio"));
    if ("vibrate" in navigator) navigator.vibrate([500, 200, 500, 200, 500]);
  };

  const desactivarSirena = () => {
    setSirenaActiva(false);
    sirenaRef.current.pause();
    sirenaRef.current.currentTime = 0;
  };

  const resolverSOS = async (sosId) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'alertas_sos', sosId), {
        estado: 'RESUELTO',
        resueltoPor: user.uid,
        fechaResolucion: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Inicialización de Mapa
  useEffect(() => {
    if (loading || !mapContainer.current || mapInstance.current) return;

    const initMap = () => {
      if (window.L) {
        const L = window.L;
        mapInstance.current = L.map(mapContainer.current, { zoomControl: false })
          .setView([9.563, -73.336], 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);
      } else {
        setTimeout(initMap, 500);
      }
    };

    if (!document.getElementById('leaflet-js')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.id = 'leaflet-js'; script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap; document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [loading]);

  const actualizarMarcadorPasajero = (v) => {
    const L = window.L; if (!L || !mapInstance.current) return;
    if (markersRef.current[v.id]) markersRef.current[v.id].remove();
    markersRef.current[v.id] = L.circleMarker([v.origenCoords.lat, v.origenCoords.lng], {
      radius: 8, color: '#f59e0b', fillOpacity: 0.8, weight: 2
    }).addTo(mapInstance.current).bindPopup(`<b>Pasajero:</b> ${v.clienteNombre || 'Usuario'}`);
  };

  const actualizarMarcadorConductor = (d) => {
    const L = window.L; if (!L || !mapInstance.current) return;
    const pos = [d.lastLocation.latitude, d.lastLocation.longitude];
    if (driverMarkersRef.current[d.id]) {
      driverMarkersRef.current[d.id].setLatLng(pos);
    } else {
      const busIcon = L.divIcon({
        html: `<div class="${d.tipoServicio === 'Motoparrillero' ? 'bg-purple-500' : 'bg-cyan-500'} w-3 h-3 rounded-full border-2 border-white shadow-[0_0_10px_currentColor]"></div>`,
        className: 'custom-icon'
      });
      driverMarkersRef.current[d.id] = L.marker(pos, { icon: busIcon }).addTo(mapInstance.current)
        .bindPopup(`<b>${d.placa || 'Moto'}</b><br>${d.driverName}`);
    }
  };

  const despacharViaje = async (viajeId) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados', viajeId), {
        estado: "despachado",
        despachadoAt: serverTimestamp(),
        despachadorId: user.uid
      });
      notifyRef.current.play().catch(() => {});
    } catch (e) { alert("Error en despacho"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-cyan-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-black italic tracking-widest uppercase">Cargando Terminal CIMCO...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* MODAL SOS DE EMERGENCIA */}
      {alertasSOS.length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-red-600/20 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-red-600 w-full max-w-md rounded-[3rem] p-8 shadow-[0_0_100px_rgba(220,38,38,0.5)] animate-pulse">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-red-600 p-6 rounded-full shadow-lg shadow-red-900/50">
                <ShieldAlert size={64} className="text-white animate-bounce" />
              </div>
              <div>
                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">ALERTA SOS</h2>
                <p className="text-red-500 font-bold uppercase tracking-widest text-xs">Emergencia en Progreso</p>
              </div>

              <div className="w-full space-y-4">
                {alertasSOS.map(alerta => (
                  <div key={alerta.id} className="bg-slate-950 border border-red-900/50 p-6 rounded-3xl text-left">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Conductor en Riesgo</p>
                    <p className="text-xl font-black text-white italic">{alerta.nombre}</p>
                    <div className="flex justify-between mt-4">
                      <span className="text-xs font-bold text-red-500 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20">
                        {alerta.tipoServicio}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">Ubicación: {alerta.ubicacion}</span>
                    </div>
                    <button 
                      onClick={() => resolverSOS(alerta.id)}
                      className="w-full mt-6 bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <XCircle size={20} /> MARCAR COMO ATENDIDO
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR DE CONTROL */}
      <div className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-10">
        <header className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-red-600 to-purple-600 p-2 rounded-lg shadow-lg">
              <Building2 size={20} className="text-white" />
            </div>
            <h1 className="text-lg font-black tracking-tighter text-white uppercase italic leading-none">CIMCO CONTROL</h1>
          </div>
          <p className="text-[9px] font-bold text-cyan-500 uppercase tracking-[0.2em]">Terminal La Jagua</p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* NUEVAS SOLICITUDES */}
          <div>
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">En Espera de Despacho</h2>
              <span className="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-500/20">
                {pedidos.requested.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {pedidos.requested.map(v => (
                <div key={v.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl hover:border-cyan-500/50 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-mono text-slate-500">#{v.id.slice(-5).toUpperCase()}</span>
                    <span className="text-sm font-black text-white italic">${v.valorOfertado}</span>
                  </div>
                  <div className="space-y-1 mb-4">
                    <p className="text-[10px] font-bold text-slate-300">📍 {v.puntoRecogidaManual}</p>
                    <p className="text-[10px] font-bold text-slate-500 italic">🏁 {v.puntoDestinoManual}</p>
                  </div>
                  <button 
                    onClick={() => despacharViaje(v.id)}
                    className="w-full bg-slate-100 text-slate-900 text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-lg"
                  >
                    Despachar Ruta
                  </button>
                </div>
              ))}
              {pedidos.requested.length === 0 && (
                <p className="text-center py-8 text-[10px] font-bold text-slate-700 uppercase italic">Sin solicitudes pendientes</p>
              )}
            </div>
          </div>
        </div>

        <footer className="p-4 bg-slate-950 border-t border-slate-800">
            <button onClick={() => auth.signOut()} className="w-full flex items-center justify-center gap-2 text-red-500 text-[10px] font-bold uppercase py-3 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-900/30">
              <LogOut size={14} /> Desconectar Terminal
            </button>
        </footer>
      </div>

      {/* MAPA Y FLOTA */}
      <div className="flex-1 relative h-[50vh] md:h-screen">
        <div ref={mapContainer} className="h-full w-full bg-slate-950"></div>
        
        {/* PANEL FLOTANTE FLOTA */}
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-700 shadow-2xl w-52 z-[1000] hidden md:block">
           <h3 className="text-[10px] font-black text-cyan-500 uppercase mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
             <Activity size={12} className="animate-pulse" /> Flota en Zona
           </h3>
           <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
             {conductoresEnLinea.map(c => (
               <div key={c.id} className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className={`p-1.5 rounded-lg border ${c.tipoServicio === 'Motoparrillero' ? 'bg-purple-900/20 border-purple-500/30' : 'bg-cyan-900/20 border-cyan-500/30'}`}>
                     <Activity size={12} className={c.tipoServicio === 'Motoparrillero' ? 'text-purple-400' : 'text-cyan-400'} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-white uppercase leading-none">{c.placa || 'Moto'}</p>
                     <p className="text-[8px] text-slate-500 font-bold uppercase">{c.tipoServicio}</p>
                   </div>
                 </div>
                 <div className={`w-2 h-2 rounded-full animate-pulse ${c.tipoServicio === 'Motoparrillero' ? 'bg-purple-500' : 'bg-cyan-500'}`}></div>
               </div>
             ))}
           </div>
        </div>

        {/* INDICADOR INFERIOR */}
        <div className="absolute bottom-6 left-6 z-[1000] flex gap-2">
            <div className="bg-slate-900/90 px-5 py-3 rounded-2xl border border-slate-700 backdrop-blur shadow-2xl flex items-center gap-4">
                <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Servicios en Ruta</span>
                    <span className="text-sm font-black text-white italic">{pedidos.active.length} Unidades activas</span>
                </div>
                <div className="h-8 w-[1px] bg-slate-800"></div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter">Sistema Online</span>
                </div>
                <button 
                  onClick={() => setSirenaActiva(!sirenaActiva)} 
                  className={`ml-2 p-2 rounded-lg border transition-all ${sirenaActiva ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                >
                  {sirenaActiva ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
            </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .leaflet-container { background: #020617 !important; font-family: inherit; }
        .leaflet-popup-content-wrapper { background: #0f172a; color: white; border-radius: 12px; border: 1px solid #1e293b; }
        .leaflet-popup-tip { background: #1e293b; }
        .custom-icon { pointer-events: none; }
      `}</style>
    </div>
  );
};

export default DespachadorPanel;