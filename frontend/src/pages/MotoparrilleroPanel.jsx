/**
 * PROYECTO: TAXIA CIMCO - Motoparrillero Panel
 * Misión: Interfaz operativa con cobro de comisión del 10% vía Backend.
 * Estilo: Ciber-Neo-Brutalista (Púrpura)
 */
import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, doc, onSnapshot, updateDoc, serverTimestamp, 
  collection, query, where, addDoc 
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

// --- ICONOS ---
import { 
  MapPin, Navigation, Bell, Flag, 
  ShieldCheck, Wallet, Loader2, ShieldAlert, User, Phone, Zap
} from 'lucide-react';

// --- SERVICIOS Y HOOKS ---
import useDriverTracking from '../hooks/useDriverTracking';
import ModalGpsInactivo from '../components/Conductor/ModalGpsInactivo';
import { viajeService } from '../services/viajeService';

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

const MotoparrilleroPanel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [viajeActivo, setViajeActivo] = useState(null);
  const [solicitudesRadar, setSolicitudesRadar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enviandoSOS, setEnviandoSOS] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  const { ubicacion, errorGps } = useDriverTracking({
      userId: auth.currentUser?.uid,
      rol: 'motoparrillero',
      isOnline: isOnline,
      viajeId: viajeActivo?.id
  });

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) navigate('/login');
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid), (snap) => {
      if (snap.exists()) setUserData(snap.data());
      setLoading(false);
    });

    const qActivo = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
      where("conductorId", "==", user.uid),
      where("estado", "in", ["aceptado", "en_ruta"])
    );
    
    const unsubActivo = onSnapshot(qActivo, (snap) => {
      if (!snap.empty) {
        setViajeActivo({ id: snap.docs[0].id, ...snap.docs[0].data() });
        if (!isOnline) setIsOnline(true);
      } else {
        setViajeActivo(null);
      }
    });

    return () => { unsubUser(); unsubActivo(); };
  }, [user, isOnline]);

  useEffect(() => {
    if (!user || !isOnline) {
        setSolicitudesRadar([]);
        return;
    }

    const qRadar = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
      where("estado", "==", "pendiente"),
      where("tipoServicio", "==", "motoparrillero") // Filtro de Púrpura
    );
    
    const unsubRadar = onSnapshot(qRadar, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (docs.length > solicitudesRadar.length) {
        audioRef.current.play().catch(() => {});
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
      setSolicitudesRadar(docs);
    });

    return () => unsubRadar();
  }, [user, isOnline, solicitudesRadar.length]);

  // LÓGICA DE NEGOCIO VIA BACKEND
  const manejarAceptarViaje = async (viajeId) => {
    try {
      const res = await viajeService.aceptarViaje(viajeId, auth.currentUser.uid, 'motoparrillero');
      if (res && res.success) {
        Swal.fire({
          title: '¡Patrullaje Asignado!',
          text: 'Se descontó la comisión del 10%.',
          icon: 'success',
          background: '#020617',
          color: '#a855f7',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      Swal.fire('Atención', 'Saldo insuficiente o viaje ocupado.', 'warning');
      console.error(error);
    }
  };

  const actualizarEstado = async (nuevoEstado) => {
    if (!viajeActivo) return;
    try {
      if (nuevoEstado === 'finalizado') {
        await viajeService.finalizarViaje(viajeActivo.id, 'motoparrillero');
      } else {
        const viajeRef = doc(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados', viajeActivo.id);
        await updateDoc(viajeRef, {
          estado: nuevoEstado,
          [`hora_${nuevoEstado}`]: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Problema al actualizar el estado.', 'error');
    }
  };

  const manejarSOS = async () => {
    setEnviandoSOS(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'alertas_sos'), {
        conductorId: user.uid,
        nombre: userData?.nombre || "Parrillero Anónimo",
        tipo: 'Motoparrillero',
        ubicacion: ubicacion || { lat: 9.5614, lng: -73.3364 }, 
        fecha: serverTimestamp(),
        estado: 'ACTIVO'
      });
      setTimeout(() => setEnviandoSOS(false), 3000);
    } catch (e) { setEnviandoSOS(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <div className="relative">
        <Loader2 className="animate-spin text-purple-500" size={50} />
        <div className="absolute inset-0 blur-2xl bg-purple-500/20 animate-pulse"></div>
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-8 text-center">
        CIMCO SECURE OS<br/><span className="text-purple-600">UNIDAD PARRILLA</span>
      </p>
    </div>
  );

  const saldo = userData?.saldoWallet || 0;
  const estaBloqueado = saldo <= -5000;

  if (estaBloqueado) {
    return (
      <div className="min-h-screen bg-[#020617] p-8 flex items-center justify-center">
        <div className="bg-slate-900 border border-purple-500/20 rounded-[4rem] p-10 text-center shadow-2xl">
          <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-purple-500/20">
            <ShieldAlert className="text-purple-500" size={44} />
          </div>
          <h2 className="text-2xl font-black text-white uppercase italic">Servicio <span className="text-purple-500">Suspendido</span></h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase mt-4 mb-8 tracking-widest leading-relaxed">
            Tu saldo operativo ha llegado al límite.<br/>Recarga para reactivar el radar.
          </p>
          <div className="bg-black/50 p-8 rounded-[2.5rem] mb-10 border border-white/5">
              <span className="text-[9px] text-slate-500 block mb-2 uppercase font-black">Deuda Actual</span>
              <p className="text-3xl font-black text-purple-400">${saldo.toLocaleString()}</p>
          </div>
          <button onClick={() => navigate('/billetera')} className="w-full bg-purple-600 text-white py-6 rounded-3xl font-black uppercase text-xs mb-4 shadow-xl shadow-purple-600/20">Recargar Billetera</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col max-w-xl mx-auto border-x border-white/5 pb-28">
      <ModalGpsInactivo visible={userData?.gpsStatus === 'warning'} />

      {userData?.gpsStatus === 'rescue' && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 animate-pulse w-full px-6">
          <div className="bg-amber-500/20 border border-amber-500/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest text-center">
              Señal Débil - Usando Rescate GPS
            </span>
          </div>
        </div>
      )}

      <header className="p-6 bg-slate-900/40 backdrop-blur-2xl sticky top-0 z-30 border-b border-purple-500/20 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-600/40 -rotate-3">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase leading-none tracking-tighter text-white">
              CIMCO <span className="text-purple-400">PARRILLA</span>
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-purple-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-slate-600'}`} />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isOnline ? 'Radar Activo' : 'Fuera de Servicio'}</span>
            </div>
          </div>
        </div>
        
        {!viajeActivo && (
           <button 
              onClick={() => setIsOnline(!isOnline)}
              className={`px-4 py-3 rounded-2xl font-black uppercase text-[10px] transition-all shadow-lg ${isOnline ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white' : 'bg-purple-600 text-white shadow-purple-600/20'}`}
           >
              {isOnline ? 'Desconectar' : 'Entrar Online'}
           </button>
        )}
      </header>

      <main className="p-6 space-y-8">
        {errorGps && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl mb-6 text-[10px] font-black uppercase flex items-start gap-2">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span>⚠️ Error GPS Local: {errorGps}. Revisa los permisos de ubicación.</span>
            </div>
        )}

        <button 
          onClick={manejarSOS}
          className={`w-full py-5 rounded-[2.5rem] flex items-center justify-center gap-4 border-2 transition-all active:scale-95 ${enviandoSOS ? 'bg-red-600 border-red-400 shadow-[0_0_30px_rgba(220,38,38,0.5)]' : 'bg-red-600/5 border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white'}`}
        >
          <ShieldAlert size={24} className={enviandoSOS ? 'animate-bounce' : ''} />
          <span className="text-xs font-black uppercase tracking-[0.3em]">{enviandoSOS ? 'ENVIANDO SEÑAL...' : 'BOTÓN DE PÁNICO SOS'}</span>
        </button>

        {viajeActivo ? (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-slate-900 border-2 border-purple-500/30 p-8 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="flex justify-between items-start mb-10 relative z-10">
                  <div className="bg-purple-600 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase italic tracking-[0.2em] shadow-lg shadow-purple-600/20">
                    Servicio en Curso
                  </div>
                  <a href={`tel:${viajeActivo.clienteTelefono}`} className="bg-white p-4 rounded-2xl text-slate-900 shadow-2xl active:scale-90 transition-all">
                    <Phone size={24} />
                  </a>
               </div>
               
               <div className="relative z-10 space-y-8">
                 <div className="flex gap-5">
                    <div className="bg-purple-500/20 p-3 rounded-2xl h-fit"><MapPin className="text-purple-400" /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Recogida:</p>
                        <h3 className="text-2xl font-black uppercase italic leading-tight">{viajeActivo.puntoRecogidaManual || viajeActivo.puntoOrigen}</h3>
                    </div>
                 </div>

                 <div className="flex gap-5">
                    <div className="bg-cyan-500/20 p-3 rounded-2xl h-fit"><Flag className="text-cyan-400" /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Destino:</p>
                        <h3 className="text-2xl font-black uppercase italic leading-tight">{viajeActivo.puntoDestinoManual || viajeActivo.puntoDestino}</h3>
                    </div>
                 </div>
                 
                 <div className="bg-black/40 p-6 rounded-3xl border border-white/5 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-500 uppercase">Tarifa</span>
                    <span className="text-3xl font-black italic text-purple-400">${viajeActivo.valorOfertado?.toLocaleString() || viajeActivo.valor}</span>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                  {viajeActivo.estado === 'aceptado' ? (
                    <button 
                      onClick={() => actualizarEstado('en_ruta')} 
                      className="w-full bg-purple-600 text-white py-6 rounded-[2rem] font-black uppercase text-sm italic tracking-[0.2em] shadow-2xl shadow-purple-600/30 active:scale-95 transition-all"
                    >
                      Confirmar Llegada
                    </button>
                  ) : (
                    <button 
                      onClick={() => actualizarEstado('finalizado')} 
                      className="w-full bg-emerald-500 text-slate-950 py-6 rounded-[2rem] font-black uppercase text-sm italic tracking-[0.2em] shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all"
                    >
                      Finalizar Servicio
                    </button>
                  )}
                 </div>
               </div>
               <ShieldCheck className="absolute -bottom-16 -right-16 text-purple-500/5 w-64 h-64 -rotate-12" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/10 p-2 rounded-lg"><Bell size={18} className="text-purple-500" /></div>
                <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Radar Parrilla</h2>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 px-4 py-1.5 rounded-full border border-white/5">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-purple-500 animate-ping' : 'bg-slate-600'}`}></span>
                <span className="text-[9px] font-black text-slate-400 uppercase">{solicitudesRadar.length} DISPONIBLES</span>
              </div>
            </div>

            {!isOnline ? (
              <div className="py-28 text-center bg-slate-900/10 rounded-[4rem] border-2 border-dashed border-white/5">
                <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                  <Navigation className="text-slate-600" size={32} />
                </div>
                <p className="text-slate-500 font-black uppercase text-[10px] italic tracking-[0.3em] leading-relaxed">
                  Sistema Offline<br/>Enciende el radar para patrullar.
                </p>
              </div>
            ) : solicitudesRadar.length === 0 ? (
              <div className="py-28 text-center bg-slate-900/10 rounded-[4rem] border-2 border-dashed border-white/5">
                <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                  <Navigation className="text-slate-800 animate-pulse" size={32} />
                </div>
                <p className="text-slate-700 font-black uppercase text-[10px] tracking-[0.3em]">Patrullando La Jagua...</p>
              </div>
            ) : (
              <div className="grid gap-5">
                {solicitudesRadar.map(viaje => (
                  <div key={viaje.id} className="bg-slate-900/40 border border-white/5 p-7 rounded-[3.5rem] flex justify-between items-center hover:bg-slate-800/40 transition-all group overflow-hidden relative">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <User size={14} className="text-purple-400" />
                        <p className="text-[10px] font-black text-slate-400 uppercase italic">{viaje.clienteNombre}</p>
                      </div>
                      <h3 className="text-4xl font-black italic text-white mb-2 leading-none">
                        <span className="text-lg mr-1 opacity-40">$</span>{viaje.valorOfertado?.toLocaleString() || viaje.valor}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin size={12} />
                        <p className="text-[9px] font-bold uppercase truncate max-w-[140px] tracking-tighter">
                          Destino: {viaje.puntoDestinoManual || viaje.puntoDestino}
                        </p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => manejarAceptarViaje(viaje.id)}
                      className="bg-white text-slate-950 px-8 py-8 rounded-[2.5rem] font-black uppercase text-[11px] italic shadow-2xl group-hover:bg-purple-600 group-hover:text-white transition-all flex flex-col items-center justify-center gap-2 active:scale-90 relative z-10"
                    >
                      <Zap size={22} fill="currentColor" />
                      TOMAR
                    </button>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] rounded-full group-hover:bg-purple-500/10 transition-all"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-3xl border-t border-white/5 p-8 flex justify-around items-end z-50">
          <button className="flex flex-col items-center gap-2 text-purple-500">
            <div className="bg-purple-500/10 p-3 rounded-2xl border border-purple-500/20"><Navigation size={22} strokeWidth={3} /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Radar</span>
          </button>
          <button onClick={() => navigate('/billetera')} className="flex flex-col items-center gap-2 text-slate-500 hover:text-white transition-all">
            <div className="p-3"><Wallet size={22} /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Finanzas</span>
          </button>
          <button onClick={() => navigate('/perfil')} className="flex flex-col items-center gap-2 text-slate-500 hover:text-white transition-all">
            <div className="p-3"><User size={22} /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Perfil</span>
          </button>
      </nav>
    </div>
  );
};

export default MotoparrilleroPanel;