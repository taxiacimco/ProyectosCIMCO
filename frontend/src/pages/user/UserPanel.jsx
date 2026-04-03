import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, query, where, onSnapshot, addDoc, 
  doc, updateDoc, serverTimestamp, getDoc, orderBy, limit 
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, signInAnonymously, signInWithCustomToken } from 'firebase/auth';

// --- ICONOS ---
import { 
  LogOut, MessageSquare, Send, Loader2, MapPin, 
  Clock, Navigation, Bike, Phone, User, AlertCircle, DollarSign, Wallet, 
  ChevronRight, X, Star, Map as MapIcon, ShieldCheck, Car
} from 'lucide-react';

// --- CONFIGURACIÓN FIREBASE (Usando tus globales) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

// --- SUB-COMPONENTE: MAPA DE MONITOREO (Sincronizado con GPS) ---
const LiveTrackingMap = ({ conductorCoords, clienteCoords, estadoViaje }) => {
  return (
    <div className="w-full h-56 bg-slate-950 rounded-[2.5rem] relative overflow-hidden border border-white/5 shadow-2xl">
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center p-12">
        <div className="w-full h-[1px] bg-slate-800 relative">
           {/* Punto Cliente (GPS Real) */}
           <div className="absolute top-1/2 left-0 -translate-y-1/2 flex flex-col items-center">
              <div className="w-3 h-3 bg-white rounded-full border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]"></div>
              <span className="text-[7px] font-black mt-2 text-cyan-500 uppercase tracking-widest">Tu GPS</span>
           </div>

           {/* Trayectoria Dinámica */}
           <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-transparent transition-all duration-1000" style={{ width: '50%' }}></div>

           {/* Punto Conductor (GPS Real) */}
           <div className="absolute top-1/2 left-[50%] -translate-y-1/2 -translate-x-1/2">
              <div className="bg-cyan-500 p-2 rounded-xl shadow-lg shadow-cyan-500/40 animate-pulse">
                 <Car size={16} className="text-slate-950" />
              </div>
              <span className="text-[7px] font-black mt-2 text-white/40 uppercase absolute whitespace-nowrap -bottom-5 left-1/2 -translate-x-1/2">Piloto en camino</span>
           </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
        <span className="text-[8px] font-black uppercase text-emerald-500">Señal GPS Activa</span>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTE: CHAT INTERNO ---
const ChatPasajero = ({ viajeId, user }) => {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!viajeId || !user) return;
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'chats', viajeId, 'mensajes'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      setMensajes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, (err) => console.error("Error chat:", err));
  }, [viajeId, user]);

  const enviar = async (e) => {
    e.preventDefault();
    if (!nuevoMsg.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chats', viajeId, 'mensajes'), {
        text: nuevoMsg,
        senderId: user.uid,
        senderRole: 'pasajero',
        createdAt: serverTimestamp()
      });
      setNuevoMsg("");
    } catch (err) { console.error(err); }
  };

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col h-72 shadow-xl">
      <div className="p-4 border-b border-white/5 flex items-center gap-2">
        <MessageSquare size={14} className="text-cyan-500" />
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Canal de Comunicación</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {mensajes.map(m => (
          <div key={m.id} className={`flex ${m.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-[11px] font-bold ${m.senderId === user.uid ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-300 rounded-tl-none'}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <form onSubmit={enviar} className="p-3 bg-black/20 flex gap-2">
        <input 
          value={nuevoMsg} onChange={e => setNuevoMsg(e.target.value)}
          placeholder="Escribe al piloto..."
          className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-2 text-[11px] outline-none text-white"
        />
        <button type="submit" className="bg-cyan-500 p-2.5 rounded-xl text-slate-950">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

const UserPanel = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viajeActual, setViajeActual] = useState(null);
  const [datosConductor, setDatosConductor] = useState(null);
  const [conductorPos, setConductorPos] = useState(null);
  
  // Direcciones manuales (Sin enlace a GPS de mapas, solo texto informativo)
  const [origenManual, setOrigenManual] = useState('');
  const [destinoManual, setDestinoManual] = useState('');
  const [ofertaPasajero, setOfertaPasajero] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');

  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

  // 1. Auth & Profile
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();

    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const uRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', currentUser.uid);
        onSnapshot(uRef, (snap) => {
          if (snap.exists()) setUserData(snap.data());
          setLoading(false);
        });
      }
    });
  }, []);

  // 2. Monitoreo de Viajes
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
      where("clienteUid", "==", user.uid),
      where("estado", "in", ["pendiente", "aceptado", "en_ruta", "en_punto", "finalizado"]),
      limit(1)
    );
    
    return onSnapshot(q, async (snap) => {
      if (snap.empty) {
        setViajeActual(null);
        return;
      }
      const viaje = { id: snap.docs[0].id, ...snap.docs[0].data() };
      
      if (viaje.estado === 'finalizado' && !viaje.calificadoPorCliente) {
        setViajeActual(viaje);
        setShowRating(true);
      } else if (viaje.estado === 'finalizado' && viaje.calificadoPorCliente) {
        setViajeActual(null);
      } else {
        setViajeActual(viaje);
      }

      if (viaje.conductorUid) {
        const cSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', viaje.conductorUid));
        if (cSnap.exists()) setDatosConductor(cSnap.data());

        onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'ubicaciones', viaje.conductorUid), (pSnap) => {
          if (pSnap.exists()) setConductorPos(pSnap.data());
        });
      }
    });
  }, [user]);

  const activarGPS = () => {
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('active');
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true }
    );
  };

  const enviarSolicitud = async () => {
    if (!origenManual || !destinoManual || !ofertaPasajero) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'), {
        clienteUid: user.uid,
        clienteNombre: userData?.nombre || "Usuario CIMCO",
        clienteTelefono: userData?.telefono || "",
        origen: origenManual, // Texto manual
        destino: destinoManual, // Texto manual
        gpsCoords: gpsLocation, // Único dato de precisión técnica
        valorOfertado: parseInt(ofertaPasajero),
        metodoPago,
        estado: 'pendiente',
        servicioTipo: 'Taxi',
        calificadoPorCliente: false,
        createdAt: serverTimestamp(),
      });
      setOrigenManual(''); setDestinoManual(''); setOfertaPasajero('');
    } catch (err) { console.error(err); }
  };

  const enviarCalificacion = async () => {
    if (!viajeActual || rating === 0) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados', viajeActual.id), {
      calificacionCliente: rating,
      calificadoPorCliente: true
    });
    setShowRating(false);
    setViajeActual(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-cyan-500 font-black italic">
       <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
       CARGANDO PANEL...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col max-w-md mx-auto relative font-sans border-x border-white/5 shadow-2xl overflow-hidden">
      
      {/* APP BAR */}
      <div className="p-6 bg-slate-900/50 backdrop-blur-xl border-b border-white/5 flex justify-between items-center z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
            <Navigation size={20} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase italic tracking-tighter leading-none">CIMCO <span className="text-cyan-400">VIAJES</span></h2>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">Usuario Autenticado</p>
          </div>
        </div>
        <button onClick={() => signOut(auth)} className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors">
          <LogOut size={18} />
        </button>
      </div>

      <main className="flex-1 p-6 space-y-6 overflow-y-auto pb-32 custom-scrollbar">
        
        {viajeActual ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
            {/* CARD ESTADO VIAJE */}
            <div className="bg-cyan-600 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{viajeActual.estado}</span>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/50 uppercase">Oferta</p>
                    <p className="text-3xl font-black italic">${viajeActual.valorOfertado?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={14} className="text-white/40" />
                  <p className="text-lg font-black uppercase italic truncate">{viajeActual.destino}</p>
                </div>
              </div>
              <Car className="absolute -right-8 -bottom-8 text-white/10" size={120} />
            </div>

            {/* MAPA DE PRECISIÓN GPS */}
            {viajeActual.estado !== 'pendiente' && (
               <LiveTrackingMap 
                conductorCoords={conductorPos} 
                clienteCoords={gpsLocation} 
               />
            )}

            {/* INFO DEL PILOTO */}
            {viajeActual.estado !== 'pendiente' && datosConductor ? (
              <div className="bg-slate-900 border border-white/5 p-5 rounded-[2.5rem] flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden border border-white/5">
                  {datosConductor.fotoUrl ? <img src={datosConductor.fotoUrl} className="w-full h-full object-cover" /> : <User size={24} className="text-slate-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-black text-cyan-500 uppercase tracking-widest mb-0.5">Piloto Asignado</p>
                  <p className="text-sm font-black uppercase italic text-white truncate">{datosConductor.nombre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black bg-white/5 px-2 py-0.5 rounded border border-white/5 text-slate-400">{datosConductor.placa || 'CIMCO'}</span>
                    <div className="flex items-center text-yellow-500 gap-1"><Star size={10} fill="currentColor" /><span className="text-[9px] font-black">4.9</span></div>
                  </div>
                </div>
                <a href={`tel:${datosConductor.telefono}`} className="bg-emerald-500 text-slate-950 p-4 rounded-2xl shadow-lg active:scale-90 transition-transform">
                  <Phone size={20} />
                </a>
              </div>
            ) : (
              <div className="bg-slate-900/50 border-2 border-dashed border-white/5 p-10 rounded-[2.5rem] text-center">
                <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Buscando el mejor piloto...</p>
              </div>
            )}

            {viajeActual.estado !== 'pendiente' && <ChatPasajero viajeId={viajeActual.id} user={user} />}
          </div>
        ) : (
          /* FORMULARIO DE SOLICITUD */
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-1">
              <h1 className="text-4xl font-black italic uppercase tracking-tighter">¿A DÓNDE<br/><span className="text-cyan-500 text-5xl">VAMOS HOY?</span></h1>
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em]">Solicitud de servicio express</p>
            </div>

            <div className="space-y-4">
              {/* Activación de GPS (Indispensable para el monitoreo del piloto) */}
              <button 
                onClick={activarGPS}
                className={`w-full flex items-center justify-between p-4 rounded-3xl border-2 transition-all ${gpsStatus === 'active' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-900 border-white/5 text-slate-500'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${gpsStatus === 'active' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'bg-slate-800 text-slate-500'}`}>
                    <MapIcon size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-tighter">Calibrar GPS de recogida</p>
                    <p className="text-[8px] font-bold opacity-50 uppercase">{gpsStatus === 'active' ? "Señal satelital vinculada" : "Haz clic para precisión"}</p>
                  </div>
                </div>
                {gpsStatus === 'loading' && <Loader2 size={16} className="animate-spin" />}
              </button>

              {/* INPUTS DE TEXTO MANUAL (Dirección Recogida y Destino) */}
              <div className="space-y-3">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-500 rounded-full border-2 border-slate-950 z-10"></div>
                  <input 
                    placeholder="Dirección de recogida (Ej: Calle 10 #5-20)" 
                    className="w-full bg-slate-900 border border-white/5 p-4 pl-10 rounded-2xl text-[11px] font-bold outline-none focus:border-cyan-500/30 transition-all placeholder:text-slate-700"
                    value={origenManual} onChange={e => setOrigenManual(e.target.value)}
                  />
                </div>
                
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-600 rounded-full border-2 border-slate-950 z-10"></div>
                  <input 
                    placeholder="¿A qué lugar vas?" 
                    className="w-full bg-slate-900 border border-white/5 p-4 pl-10 rounded-2xl text-[11px] font-bold outline-none focus:border-cyan-500/30 transition-all placeholder:text-slate-700"
                    value={destinoManual} onChange={e => setDestinoManual(e.target.value)}
                  />
                </div>
              </div>

              {/* OFERTA DE PAGO */}
              <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5 text-center shadow-inner relative overflow-hidden">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Tu oferta económica</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black text-cyan-500 italic">$</span>
                  <input 
                    type="number"
                    placeholder="0"
                    className="bg-transparent text-6xl font-black w-32 text-center outline-none tracking-tighter placeholder:text-slate-800"
                    value={ofertaPasajero} onChange={e => setOfertaPasajero(e.target.value)}
                  />
                </div>
                <div className="mt-4 flex justify-center gap-2">
                  {['Efectivo', 'CIMCO Wallet'].map(m => (
                    <button 
                      key={m} onClick={() => setMetodoPago(m)}
                      className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase transition-all ${metodoPago === m ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-500'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={enviarSolicitud}
                disabled={!origenManual || !destinoManual || !ofertaPasajero}
                className="w-full bg-cyan-500 text-slate-950 font-black py-6 rounded-[2rem] text-[12px] uppercase italic tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-20"
              >
                Llamar Piloto Ahora <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE CALIFICACIÓN (Cierre de Viaje) */}
      {showRating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 p-10 rounded-[3.5rem] w-full text-center">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="text-cyan-500" size={32} />
            </div>
            <h3 className="text-xl font-black uppercase italic mb-2">¡Viaje Exitoso!</h3>
            <p className="text-slate-400 text-[9px] font-bold mb-8 uppercase tracking-widest">Tu opinión mejora a CIMCO</p>
            <div className="flex justify-center gap-2 mb-8">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)} className={`transition-all ${rating >= s ? 'text-yellow-400 scale-110' : 'text-slate-800'}`}>
                  <Star fill={rating >= s ? 'currentColor' : 'none'} size={28} />
                </button>
              ))}
            </div>
            <button 
              onClick={enviarCalificacion}
              disabled={rating === 0}
              className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg disabled:opacity-20"
            >
              Finalizar Calificación
            </button>
          </div>
        </div>
      )}

      {/* BOTÓN SOS */}
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-rose-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-rose-600/40 border-4 border-[#020617] active:scale-90 transition-all z-40">
        <AlertCircle size={24} className="text-white" />
      </button>

      {/* NAV INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 p-5 px-10 flex justify-between items-center z-50">
        <button className="text-cyan-500 flex flex-col items-center gap-1">
          <Navigation size={22} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Viajar</span>
        </button>
        <button className="text-slate-600 flex flex-col items-center gap-1">
          <Wallet size={22} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Billetera</span>
        </button>
        <button className="text-slate-600 flex flex-col items-center gap-1">
          <Clock size={22} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Historial</span>
        </button>
      </nav>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default UserPanel;