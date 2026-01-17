import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  serverTimestamp 
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
  DollarSign, 
  Users, 
  Package, 
  AlertTriangle, 
  LogOut, 
  MessageSquare, 
  Star, 
  Send,
  Phone,
  ShieldCheck,
  ChevronRight,
  Loader2
} from 'lucide-react';

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

// --- COMPONENTE INTERNO: CHAT ---
const ChatPasajero = ({ viajeId, user }) => {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState("");

  useEffect(() => {
    if (!viajeId || !user) return;
    
    // Siguiendo Regla 1 y 2 de Firestore: Path estricto y sin filtros complejos
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'chats', viajeId, 'mensajes');
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setMensajes(msgs);
    }, (error) => console.error("Error chat:", error));

    return () => unsubscribe();
  }, [viajeId, user]);

  const enviar = async (e) => {
    e.preventDefault();
    if (!nuevoMsg.trim() || !user) return;
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chats', viajeId, 'mensajes'), {
        text: nuevoMsg,
        senderId: user.uid,
        senderRole: 'cliente',
        createdAt: serverTimestamp()
      });
      setNuevoMsg("");
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-64 mt-4 shadow-xl">
      <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-cyan-400" />
          <span className="text-[10px] font-black uppercase text-white">Chat de Viaje</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        {mensajes.length === 0 && (
          <p className="text-[10px] text-slate-500 text-center mt-4 italic font-medium">No hay mensajes aún. Escríbele al conductor.</p>
        )}
        {mensajes.map(m => (
          <div key={m.id} className={`flex ${m.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] shadow-sm ${
              m.senderId === user.uid 
                ? 'bg-cyan-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-300 rounded-tl-none border border-slate-700'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} className="p-2 bg-slate-950 flex gap-2 border-t border-slate-800">
        <input 
          value={nuevoMsg} 
          onChange={e => setNuevoMsg(e.target.value)}
          placeholder="Escribe al conductor..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 text-white"
        />
        <button type="submit" className="bg-cyan-500 p-2.5 rounded-xl text-slate-950 hover:bg-cyan-400 active:scale-90 transition-all">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const PasajeroPanel = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState('Mototaxi');
  const [viajeActual, setViajeActual] = useState(null);
  const [conductorInfo, setConductorInfo] = useState(null);
  
  // Estados de Formulario
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [oferta, setOferta] = useState('');
  const [pasajeros, setPasajeros] = useState('1');
  const [carga, setCarga] = useState('');
  
  // UI Modals
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const conductorMarkerRef = useRef(null);

  // Inicialización de Auth (Regla 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Gestión de Viaje y Mapa
  useEffect(() => {
    if (!user) return;

    // Escuchar viaje activo siguiendo Regla 1 y 2
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
      where("clienteUid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      // Filtramos en memoria para cumplir Regla 2
      const viajesValidos = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(v => ["pendiente", "despachado", "aceptado", "en_ruta", "finalizado"].includes(v.estado))
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

      if (viajesValidos.length > 0) {
        const v = viajesValidos[0];
        
        if (v.estado === 'finalizado' && viajeActual?.estado !== 'finalizado') {
          setShowRating(true);
        }
        
        setViajeActual(v);

        // Si hay conductor asignado, obtener su ubicación
        if (v.conductorId) {
          const conductorOnlineRef = doc(db, 'artifacts', appId, 'public', 'data', 'conductores_online', v.conductorId);
          
          // Obtener info estática
          const cDoc = await getDoc(conductorOnlineRef);
          if (cDoc.exists()) setConductorInfo(cDoc.data());
          
          // Escuchar ubicación dinámica
          onSnapshot(conductorOnlineRef, (docSnap) => {
            const data = docSnap.data();
            if (data?.lastLocation && mapInstance.current) {
              const { latitude, longitude } = data.lastLocation;
              const L = window.L;
              if (L) {
                if (!conductorMarkerRef.current) {
                  conductorMarkerRef.current = L.marker([latitude, longitude], {
                    icon: L.divIcon({
                      html: `<div class="relative w-10 h-10 flex items-center justify-center">
                              <div class="absolute inset-0 bg-yellow-400 rounded-full opacity-30 animate-ping"></div>
                              <div class="bg-yellow-400 w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg z-10 text-lg">🛵</div>
                            </div>`,
                      className: 'cond-icon',
                      iconSize: [40, 40]
                    })
                  }).addTo(mapInstance.current);
                } else {
                  conductorMarkerRef.current.setLatLng([latitude, longitude]);
                }
              }
            }
          }, (err) => console.error("Error loc conductor:", err));
        }
      } else {
        setViajeActual(null);
        if (conductorMarkerRef.current) {
          conductorMarkerRef.current.remove();
          conductorMarkerRef.current = null;
        }
      }
    }, (error) => console.error("Error viajes:", error));

    setLoading(false);
    return () => unsubscribe();
  }, [user, viajeActual?.id]);

  // Inicialización de Mapa Leaflet
  useEffect(() => {
    if (loading || !mapContainer.current || mapInstance.current) return;
    
    const loadMap = () => {
      if (window.L) {
        mapInstance.current = window.L.map(mapContainer.current, { 
          zoomControl: false,
          attributionControl: false 
        }).setView([9.56, -73.33], 15);
        
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);

        // Geolocalización inicial
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            mapInstance.current.setView([latitude, longitude], 16);
            if (markerRef.current) markerRef.current.remove();
            markerRef.current = window.L.marker([latitude, longitude], {
              icon: window.L.divIcon({
                html: `<div class="bg-cyan-500 w-5 h-5 rounded-full border-2 border-white shadow-[0_0_15px_cyan] animate-pulse"></div>`,
                className: 'user-icon'
              })
            }).addTo(mapInstance.current);
          });
        }
      } else {
        setTimeout(loadMap, 500);
      }
    };
    loadMap();
  }, [loading]);

  const pedirServicio = async () => {
    if (!origen || !destino || !oferta) return;
    if (!user) return;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'), {
        clienteUid: user.uid,
        clienteNombre: user.displayName || 'Usuario Invitado',
        servicioSolicitado: selectedService,
        puntoRecogidaManual: origen,
        puntoDestinoManual: destino,
        valorOfertado: Number(oferta),
        detallesExtra: selectedService === 'Motocarga' ? carga : `${pasajeros} Pasajeros`,
        estado: 'pendiente',
        createdAt: serverTimestamp(),
        idPublico: Math.random().toString(36).substring(7).toUpperCase()
      });
    } catch (err) {
      console.error("Error al pedir servicio:", err);
    }
  };

  const cancelarViaje = async () => {
    if (!viajeActual || !user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados', viajeActual.id), {
        estado: 'cancelado',
        canceladoBy: 'cliente',
        fechaCancelado: serverTimestamp()
      });
    } catch (err) {
      console.error("Error cancelando:", err);
    }
  };

  const enviarPanico = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'alertas_panico'), {
        userId: user.uid,
        userName: user.displayName || 'Anónimo',
        viajeId: viajeActual?.id || 'sin_viaje',
        timestamp: serverTimestamp(),
        estado: 'activa'
      });
      alert("🚨 SOS: ALERTA ENVIADA A CENTRAL Y CONTACTOS 🚨");
    } catch (err) {
      console.error("Error pánico:", err);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-cyan-400">
        <Loader2 className="animate-spin" size={48} />
        <span className="font-black italic tracking-widest text-sm animate-pulse">SINCRONIZANDO GPS...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans max-w-md mx-auto shadow-2xl relative">
      
      {/* HEADER */}
      <header className="p-4 bg-slate-900/90 backdrop-blur-lg border-b border-slate-800 flex justify-between items-center sticky top-0 z-[100] shadow-xl">
        <div className="flex items-center gap-2">
          <div className="bg-cyan-500 p-2 rounded-xl text-slate-900 shadow-lg shadow-cyan-500/20">
            <ShieldCheck size={20} />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter">TAXIA<span className="text-cyan-400 uppercase">cimco</span></h1>
        </div>
        <div className="flex gap-2">
          <button onClick={enviarPanico} className="p-2.5 bg-red-600 rounded-xl shadow-lg shadow-red-600/30 active:scale-95">
            <AlertTriangle size={20} className="text-white fill-white" />
          </button>
          <button onClick={() => signOut(auth)} className="p-2.5 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* MAPA CONTAINER */}
      <div className="h-[30vh] relative z-10">
        <div ref={mapContainer} className="h-full w-full bg-slate-900"></div>
        <div className="absolute bottom-4 left-4 z-50">
          <div className="bg-slate-900/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-800 flex items-center gap-2 shadow-2xl">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Conexión Segura</span>
          </div>
        </div>
      </div>

      {/* ZONA DE CONTROL */}
      <main className="flex-1 p-5 -mt-8 z-20 space-y-4 overflow-y-auto pb-10 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
        
        {viajeActual ? (
          <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500">
            {/* TICKET DE VIAJE ACTIVO */}
            <div className="bg-slate-900 border-2 border-cyan-500/30 p-6 rounded-[2.5rem] shadow-2xl space-y-5 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Tu Viaje Actual</h2>
                  <p className="text-2xl font-black text-white italic uppercase leading-none">
                    {viajeActual.estado === 'pendiente' ? 'Buscando...' : 
                     viajeActual.estado === 'despachado' ? 'En camino' : 
                     viajeActual.estado === 'en_ruta' ? 'En viaje' : viajeActual.estado}
                  </p>
                </div>
                <div className="bg-slate-800/80 px-4 py-2 rounded-2xl text-cyan-400 font-black border border-slate-700">
                  ${viajeActual.valorOfertado}
                </div>
              </div>

              {conductorInfo && (
                <div className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                    {conductorInfo.foto ? <img src={conductorInfo.foto} className="rounded-2xl w-full h-full object-cover" /> : '🛵'}
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Vehículo Confirmado</p>
                    <p className="text-sm font-black text-white uppercase">{conductorInfo.placa || 'PLACA...'}</p>
                    <p className="text-[10px] text-cyan-400 font-bold">{conductorInfo.nombre || 'Conductor'}</p>
                  </div>
                  <button className="bg-cyan-500 p-3 rounded-2xl text-slate-950 shadow-lg shadow-cyan-500/20 active:scale-90 transition-transform">
                    <Phone size={18} />
                  </button>
                </div>
              )}

              <div className="space-y-4 border-y border-slate-800/50 py-4">
                <div className="flex gap-3 items-start">
                  <div className="bg-cyan-500/10 p-1.5 rounded-lg"><MapPin size={16} className="text-cyan-500" /></div>
                  <p className="text-[11px] text-slate-400 leading-tight pt-1">
                    <span className="text-white font-bold block mb-0.5">Recogida</span>
                    {viajeActual.puntoRecogidaManual}
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="bg-emerald-500/10 p-1.5 rounded-lg"><Navigation size={16} className="text-emerald-500" /></div>
                  <p className="text-[11px] text-slate-400 leading-tight pt-1">
                    <span className="text-white font-bold block mb-0.5">Destino</span>
                    {viajeActual.puntoDestinoManual}
                  </p>
                </div>
              </div>

              <button 
                onClick={cancelarViaje}
                className="w-full py-2 text-[10px] font-black text-red-500/70 hover:text-red-500 uppercase tracking-[0.3em] transition-colors"
              >
                Cancelar Solicitud
              </button>
            </div>

            <ChatPasajero viajeId={viajeActual.id} user={user} />
          </div>
        ) : (
          /* FORMULARIO DE PEDIDO */
          <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            
            <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar scroll-smooth">
              {['Mototaxi', 'Parrillero', 'Motocarga', 'Intermunicipal'].map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedService(s)}
                  className={`px-6 py-3.5 rounded-2xl whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    selectedService === s 
                      ? 'bg-cyan-500 text-slate-950 shadow-xl shadow-cyan-500/30 scale-105' 
                      : 'bg-slate-800/50 text-slate-500 border border-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500 transition-transform group-focus-within:scale-110" size={18} />
                <input 
                  value={origen} onChange={e => setOrigen(e.target.value)}
                  placeholder="¿Dónde te recogemos?" 
                  className="w-full bg-slate-800/30 border border-slate-700/50 p-4.5 pl-12 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-slate-800/50 transition-all text-white placeholder:text-slate-600"
                />
              </div>

              <div className="relative group">
                <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                <input 
                  value={destino} onChange={e => setDestino(e.target.value)}
                  placeholder="¿A dónde vas?" 
                  className="w-full bg-slate-800/30 border border-slate-700/50 p-4.5 pl-12 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-slate-800/50 transition-all text-white placeholder:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={18} />
                  <input 
                    type="number" value={oferta} onChange={e => setOferta(e.target.value)}
                    placeholder="Oferta $" 
                    className="w-full bg-slate-800/30 border border-slate-700/50 p-4.5 pl-11 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 text-white"
                  />
                </div>
                
                <div className="relative">
                  {selectedService === 'Motocarga' ? (
                    <>
                      <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" size={18} />
                      <input 
                        value={carga} onChange={e => setCarga(e.target.value)}
                        placeholder="¿Qué carga?" 
                        className="w-full bg-slate-800/30 border border-slate-700/50 p-4.5 pl-11 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 text-white"
                      />
                    </>
                  ) : (
                    <>
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                      <select 
                        value={pasajeros} onChange={e => setPasajeros(e.target.value)}
                        className="w-full bg-slate-800/30 border border-slate-700/50 p-4.5 pl-11 rounded-2xl text-sm appearance-none focus:outline-none text-white font-bold"
                      >
                        <option value="1">1 Per.</option>
                        <option value="2">2 Per.</option>
                      </select>
                    </>
                  )}
                </div>
              </div>

              <button 
                onClick={pedirServicio}
                disabled={!origen || !destino || !oferta}
                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-400 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-black py-5 rounded-[2rem] text-lg italic uppercase tracking-tighter shadow-2xl shadow-cyan-500/20 active:scale-95 hover:brightness-110 transition-all flex items-center justify-center gap-2 mt-4"
              >
                Solicitar Viaje <ChevronRight size={24} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL CALIFICACIÓN */}
      {showRating && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-10 text-center animate-in fade-in duration-500">
          <div className="space-y-8 max-w-xs">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 rounded-full blur-[60px] opacity-20 animate-pulse"></div>
              <div className="w-24 h-24 bg-cyan-500 rounded-full flex items-center justify-center mx-auto shadow-2xl z-10 relative">
                <Star size={48} className="text-slate-950 fill-slate-950" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">¡Destino Alcanzado!</h2>
              <p className="text-slate-400 font-bold uppercase text-[10px] mt-4 tracking-widest">Tu seguridad es nuestra prioridad. Califica el servicio.</p>
            </div>
            <div className="flex justify-center gap-4">
              {[1,2,3,4,5].map(s => (
                <button 
                  key={s} 
                  onClick={() => setRating(s)}
                  className={`transition-all duration-300 transform ${rating >= s ? 'text-amber-500 fill-amber-500 scale-125' : 'text-slate-700 scale-100 hover:text-slate-500'}`}
                >
                  <Star size={36} />
                </button>
              ))}
            </div>
            <button 
              onClick={() => {
                setShowRating(false);
                setViajeActual(null);
              }}
              className="w-full bg-white text-slate-950 py-4.5 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-transform"
            >
              Confirmar y Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ESTILOS GLOBALES */}
      <style>{`
        .leaflet-container { 
          background: #020617 !important; 
          border-radius: 0 0 2.5rem 2.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .user-icon, .cond-icon { 
          background: transparent !important; 
          border: none !important; 
        }
        ::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        input::placeholder { color: #334155; }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};

export default PasajeroPanel;