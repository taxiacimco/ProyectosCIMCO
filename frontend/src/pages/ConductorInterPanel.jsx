import React, { useEffect, useState, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  addDoc,
  getDoc, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken,
  signOut 
} from 'firebase/auth';
import { 
  MapPin, 
  Navigation, 
  LogOut, 
  MessageSquare, 
  DollarSign, 
  TrendingDown, 
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Star,
  Send
} from 'lucide-react';

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- COMPONENTE INTERNO: CHAT ---
const ChatInterno = ({ viajeId, user }) => {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState("");

  useEffect(() => {
    if (!viajeId) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'chats', viajeId, 'mensajes'));
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis());
      setMensajes(msgs);
    });
  }, [viajeId]);

  const enviar = async (e) => {
    e.preventDefault();
    if (!nuevoMsg.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chats', viajeId, 'mensajes'), {
      text: nuevoMsg,
      senderId: user.uid,
      senderRole: 'conductor',
      createdAt: serverTimestamp()
    });
    setNuevoMsg("");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-64">
      <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
        <MessageSquare size={14} className="text-cyan-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white">Chat con Pasajero</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {mensajes.map(m => (
          <div key={m.id} className={`flex ${m.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-2 rounded-2xl text-[11px] ${m.senderId === user.uid ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} className="p-2 bg-slate-950 flex gap-2">
        <input 
          value={nuevoMsg} 
          onChange={e => setNuevoMsg(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
        />
        <button type="submit" className="bg-cyan-500 p-2 rounded-xl text-slate-950"><Send size={16} /></button>
      </form>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const ConductorInterPanel = () => {
  const [user, setUser] = useState(null);
  const [viaje, setViaje] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [stats, setStats] = useState({ ingresos: 0, gastos: 0 });
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [showGastos, setShowGastos] = useState(false);
  const [showCalificacion, setShowCalificacion] = useState(false);
  const [montoGasto, setMontoGasto] = useState("");
  const [descGasto, setDescGasto] = useState("");

  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. Escuchar Perfil y Gastos (Privados)
    const unsubPerfil = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile'), (doc) => {
      if (doc.exists()) setPerfil(doc.data());
    });

    const unsubGastos = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'gastos'), (snap) => {
      let total = 0;
      snap.forEach(d => total += (d.data().monto || 0));
      setStats(prev => ({ ...prev, gastos: total }));
    });

    // 2. Escuchar Viajes Asignados (Públicos)
    const qViajes = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
      where("conductorId", "==", user.uid),
      where("estado", "in", ["despachado", "aceptado", "en_ruta"])
    );

    const unsubViajes = onSnapshot(qViajes, (snap) => {
      if (!snap.empty) {
        const v = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (v.estado === 'despachado' && (!viaje || viaje.estado !== 'despachado')) {
          audioRef.current.play().catch(() => {});
          if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        }
        setViaje(v);
      } else {
        setViaje(null);
      }
    });

    // 3. Escuchar Ingresos (Viajes Finalizados)
    const qIngresos = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
      where("conductorId", "==", user.uid),
      where("estado", "==", "finalizado")
    );
    const unsubIngresos = onSnapshot(qIngresos, (snap) => {
      let total = 0;
      snap.forEach(d => total += (d.data().costoFinal || 0));
      setStats(prev => ({ ...prev, ingresos: total }));
    });

    // 4. Geolocalización
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        
        // Actualizar marcador en el mapa
        if (mapInstance.current) {
          if (!markerRef.current) {
            const L = window.L;
            const icon = L.divIcon({
              html: `<div class="bg-cyan-500 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_15px_#06b6d4]"></div>`,
              className: 'custom-div-icon'
            });
            markerRef.current = L.marker([latitude, longitude], { icon }).addTo(mapInstance.current);
          } else {
            markerRef.current.setLatLng([latitude, longitude]);
          }
          if (!viaje) mapInstance.current.panTo([latitude, longitude]);
        }

        // Actualizar en Firestore para que el Despachador lo vea
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'conductores_online', user.uid), {
          lastLocation: { latitude, longitude },
          updatedAt: serverTimestamp(),
          disponible: !viaje
        }).catch(async () => {
          // Si no existe, lo creamos (primer login del día)
          console.log("Registrando conductor online...");
        });
      }, null, { enableHighAccuracy: true });
    }

    setLoading(false);
    return () => {
      unsubPerfil(); unsubGastos(); unsubViajes(); unsubIngresos();
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, viaje?.id]);

  // Mapa
  useEffect(() => {
    if (loading || !mapContainer.current || mapInstance.current) return;
    const initMap = () => {
      if (window.L) {
        mapInstance.current = window.L.map(mapContainer.current, { zoomControl: false }).setView([9.56, -73.33], 13);
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);
      } else { setTimeout(initMap, 500); }
    };
    initMap();
  }, [loading]);

  const manejarEstado = async (nuevoEstado) => {
    if (!viaje) return;
    const updates = { estado: nuevoEstado };
    
    if (nuevoEstado === 'finalizado') {
      const costo = prompt("Ingrese el valor cobrado:", viaje.valorOfertado || 5000);
      if (!costo) return;
      updates.costoFinal = Number(costo);
      updates.finalizadoAt = serverTimestamp();
      setShowCalificacion(true);
    }
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados', viaje.id), updates);
  };

  const registrarGasto = async () => {
    if (!montoGasto || !descGasto) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'gastos'), {
      monto: Number(montoGasto),
      descripcion: descGasto,
      createdAt: serverTimestamp()
    });
    setMontoGasto(""); setDescGasto(""); setShowGastos(false);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-500 uppercase font-black italic animate-pulse">Iniciando Unidad...</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans">
      {/* HEADER */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-20">
        <div>
          <h1 className="text-sm font-black text-cyan-400 italic tracking-tighter uppercase">Van Express Pro</h1>
          <p className="text-[9px] text-slate-500 font-bold uppercase">{perfil?.placa || "Unidad Activa"}</p>
        </div>
        <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
          <LogOut size={18} />
        </button>
      </header>

      {/* MAPA */}
      <div className="h-[35vh] relative z-10 shadow-2xl">
        <div ref={mapContainer} className="h-full w-full bg-slate-900"></div>
        <div className="absolute top-4 left-4 right-4 flex gap-2">
            <div className="flex-1 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 flex justify-between shadow-xl">
                <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase">Producido Hoy</p>
                    <p className="text-sm font-black text-green-400">${stats.ingresos.toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black text-slate-500 uppercase">Balance Neto</p>
                    <p className="text-sm font-black text-white">${(stats.ingresos - stats.gastos).toLocaleString()}</p>
                </div>
            </div>
            <button 
              onClick={() => setShowGastos(true)}
              className="bg-red-500 p-3 rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
            >
              <TrendingDown size={20} className="text-white" />
            </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 space-y-4 -mt-6 z-20 overflow-y-auto pb-10">
        {viaje ? (
          <div className="space-y-4">
            <div className="bg-slate-900 border-2 border-cyan-500/30 p-5 rounded-[2.5rem] shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${
                  viaje.estado === 'despachado' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-green-500/20 text-green-500 border border-green-500/30'
                }`}>
                  {viaje.estado === 'despachado' ? 'Viaje Asignado' : 'En Trayecto'}
                </span>
                <span className="text-xl font-black text-white italic">${viaje.valorOfertado}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-cyan-500/10 rounded-lg"><MapPin size={14} className="text-cyan-500" /></div>
                  <p className="text-xs font-bold text-slate-300">{viaje.puntoRecogidaManual}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-slate-800 rounded-lg"><Navigation size={14} className="text-slate-500" /></div>
                  <p className="text-xs font-bold text-slate-500">{viaje.puntoDestinoManual}</p>
                </div>
              </div>

              <button 
                onClick={() => manejarEstado(viaje.estado === 'despachado' ? 'en_ruta' : 'finalizado')}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl ${
                  viaje.estado === 'despachado' 
                  ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/20' 
                  : 'bg-green-500 text-slate-950 shadow-green-500/20'
                }`}
              >
                {viaje.estado === 'despachado' ? 'Aceptar y Recoger' : 'Finalizar Servicio'}
              </button>
            </div>

            <ChatInterno viajeId={viaje.id} user={user} />
          </div>
        ) : (
          <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center animate-pulse">
                <Navigation size={30} className="text-slate-600" />
            </div>
            <div>
                <p className="text-sm font-black text-white uppercase italic tracking-tighter">Esperando Despacho</p>
                <p className="text-[10px] text-slate-500 font-bold max-w-[180px] mx-auto uppercase mt-1">Mantén el app abierta para recibir notificaciones de la terminal</p>
            </div>
          </div>
        )}
      </main>

      {/* MODAL GASTOS */}
      {showGastos && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] p-6 border border-slate-800 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black italic text-white uppercase">Registrar Gasto</h3>
                <button onClick={() => setShowGastos(false)} className="text-slate-500"><X /></button>
            </div>
            <div className="space-y-4">
                <input 
                  type="number" 
                  value={montoGasto}
                  onChange={e => setMontoGasto(e.target.value)}
                  placeholder="Valor: Ej. 25000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 font-black text-white focus:outline-none focus:border-red-500"
                />
                <input 
                  type="text" 
                  value={descGasto}
                  onChange={e => setDescGasto(e.target.value)}
                  placeholder="Concepto: Ej. Combustible"
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-red-500"
                />
                <button 
                  onClick={registrarGasto}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                >
                  Guardar Gasto
                </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CALIFICACIÓN */}
      {showCalificacion && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-6 text-center">
            <div className="space-y-6">
                <div className="bg-green-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_#22c55e]">
                    <CheckCircle2 size={40} className="text-slate-950" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">¡Servicio Completado!</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase mt-1">Califica tu experiencia con el pasajero</p>
                </div>
                <div className="flex justify-center gap-2">
                    {[1,2,3,4,5].map(star => (
                        <Star key={star} size={32} className="text-amber-500 fill-amber-500 cursor-pointer hover:scale-125 transition-transform" />
                    ))}
                </div>
                <button 
                  onClick={() => setShowCalificacion(false)}
                  className="bg-white text-slate-950 px-10 py-3 rounded-full font-black uppercase tracking-widest text-xs"
                >
                    Finalizar Todo
                </button>
            </div>
        </div>
      )}

      <style>{`
        .leaflet-container { background: #020617 !important; cursor: crosshair; }
        .custom-div-icon { background: transparent !important; border: none !important; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default ConductorInterPanel;