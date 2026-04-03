/**
 * PROYECTO: TAXIA CIMCO - Mototaxi Panel
 * Misión: Interfaz operativa con cobro de comisión del 10% vía Backend.
 * Estilo: Ciber-Neo-Brutalista (Cyan)
 */
import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, doc, onSnapshot, updateDoc, serverTimestamp, 
  collection, query, where 
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

// --- ICONOS ---
import { 
  MapPin, Navigation, LogOut, Bell, 
  Loader2, User, ShieldAlert, Wallet, Lock, Phone,
  Map as MapIcon, Zap
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

const MototaxiPanel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [viajeActivo, setViajeActivo] = useState(null);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false); 

  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  // 1. MOTOR DE RASTREO PROFESIONAL
  const { ubicacion, errorGps } = useDriverTracking({
      userId: auth.currentUser?.uid,
      rol: 'mototaxi',
      isOnline: isOnline,
      viajeId: viajeActivo?.id
  });

  // 2. GESTIÓN DE AUTENTICACIÓN
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

  // 3. RADAR DE OPERACIONES EN TIEMPO REAL (RUTA SAGRADA)
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
        setSolicitudesPendientes([]);
        return;
    }

    const qRadar = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
      where("estado", "==", "pendiente"),
      where("tipoServicio", "==", "mototaxi") // Filtrado estricto
    );
    
    const unsubRadar = onSnapshot(qRadar, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (docs.length > solicitudesPendientes.length) audioRef.current.play().catch(() => {});
      setSolicitudesPendientes(docs);
    });

    return () => unsubRadar();
  }, [user, isOnline, solicitudesPendientes.length]);

  // 4. LÓGICA DE NEGOCIO (VÍA BACKEND PARA COBRO)
  const manejarAceptarViaje = async (viajeId) => {
    try {
      // ⚡ Fusión Atómica: Delegamos el cobro del 10% a Java/Node
      const res = await viajeService.aceptarViaje(viajeId, auth.currentUser.uid, 'mototaxi');
      if (res && res.success) {
        Swal.fire({
          title: '¡Viaje Aceptado!',
          text: 'Comisión del 10% descontada exitosamente.',
          icon: 'success',
          background: '#020617',
          color: '#10b981',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      Swal.fire('Error Operativo', 'Saldo insuficiente o el viaje ya fue tomado.', 'error');
      console.error("Error al aceptar:", error);
    }
  };

  const finalizarViaje = async () => {
    if (!viajeActivo) return;
    try {
      const res = await viajeService.finalizarViaje(viajeActivo.id, 'mototaxi');
      if (res && res.success) {
         setViajeActivo(null);
      }
    } catch (err) { 
      console.error(err); 
      Swal.fire('Error', 'No se pudo finalizar el servicio.', 'error');
    }
  };

  const handleLogout = () => signOut(auth).then(() => navigate('/login'));

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <div className="relative">
        <Loader2 className="animate-spin text-cyan-500" size={50} />
        <div className="absolute inset-0 blur-xl bg-cyan-500/20 animate-pulse"></div>
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-8">CIMCO OS • MOTOTAXI</p>
    </div>
  );

  const saldo = userData?.saldoWallet || 0;
  const estaBloqueado = saldo <= -5000;

  if (estaBloqueado) {
    return (
      <div className="min-h-screen bg-[#020617] p-8 flex items-center justify-center">
        <div className="bg-slate-900 border border-red-500/20 rounded-[4rem] p-10 text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
              <Lock className="text-red-500" size={44} />
            </div>
            <h2 className="text-3xl font-black text-white uppercase italic leading-none">Terminal <span className="text-red-500">Bloqueada</span></h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-4 mb-8 tracking-widest leading-loose">
              Tu deuda excede el límite operativo.<br/>Abona saldo para reactivar el radar.
            </p>
            <div className="bg-black/50 p-8 rounded-[2.5rem] mb-10 border border-white/5">
                <span className="text-[9px] text-slate-500 block mb-2 uppercase font-black">Deuda Pendiente</span>
                <p className="text-4xl font-black text-red-500">${saldo.toLocaleString()}</p>
            </div>
            <button onClick={() => navigate('/billetera')} className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase text-xs mb-6 shadow-xl active:scale-95 transition-all">Ir a Billetera</button>
            <button onClick={handleLogout} className="text-slate-600 text-[10px] font-black uppercase underline tracking-widest">Cerrar Sesión</button>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-red-500/5 rounded-full blur-3xl"></div>
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

      <header className="p-6 bg-slate-900/40 backdrop-blur-2xl sticky top-0 z-30 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/40 rotate-3">
            <Zap size={28} className="text-slate-950" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase leading-none tracking-tighter text-white">
              CIMCO <span className="text-cyan-500">MOTOTAXI</span>
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`} />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isOnline ? 'Radar Activo' : 'Fuera de Servicio'}</span>
            </div>
          </div>
        </div>
        
        {!viajeActivo && (
           <button 
              onClick={() => setIsOnline(!isOnline)}
              className={`px-4 py-3 rounded-2xl font-black uppercase text-[10px] transition-all shadow-lg ${isOnline ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'}`}
           >
              {isOnline ? 'Desconectar' : 'Entrar Online'}
           </button>
        )}
      </header>

      <main className="p-6">
        {errorGps && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl mb-6 text-[10px] font-black uppercase flex items-start gap-2">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span>⚠️ Error GPS Local: {errorGps}. Revisa los permisos de ubicación.</span>
            </div>
        )}

        {viajeActivo ? (
          <div className="animate-in zoom-in-95 duration-500">
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-700 p-8 rounded-[3.5rem] text-slate-950 shadow-2xl relative overflow-hidden">
               <div className="flex justify-between items-start mb-10 relative z-10">
                  <div className="bg-slate-950 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase italic tracking-widest">Misión Prioritaria</div>
                  <div className="flex gap-3">
                    <a href={`tel:${viajeActivo.clienteTelefono}`} className="bg-slate-950 p-4 rounded-2xl text-white shadow-2xl active:scale-90 transition-all"><Phone size={22} /></a>
                  </div>
               </div>
               
               <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em]">Punto de Recogida</p>
                 <h3 className="text-3xl font-black uppercase italic leading-tight mb-8 drop-shadow-sm">{viajeActivo.puntoRecogidaManual || viajeActivo.puntoOrigen}</h3>
                 
                 <div className="bg-slate-950/10 p-6 rounded-3xl border border-black/5 mb-10 backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-4">
                       <MapPin size={22} />
                       <div>
                          <p className="text-[9px] font-black uppercase opacity-60">Destino Final</p>
                          <p className="text-base font-bold leading-tight">{viajeActivo.puntoDestinoManual || viajeActivo.puntoDestino}</p>
                       </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-black/10">
                        <span className="text-[10px] font-black uppercase">Tarifa Acordada</span>
                        <span className="text-2xl font-black italic">${viajeActivo.valorOfertado?.toLocaleString() || viajeActivo.valor}</span>
                    </div>
                 </div>

                 <button 
                  onClick={finalizarViaje}
                  className="w-full bg-slate-950 text-white py-7 rounded-[2.5rem] font-black uppercase text-sm italic tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
                 >
                   Finalizar Servicio
                 </button>
               </div>
               <Navigation className="absolute -bottom-14 -right-14 text-black/5 w-64 h-64 -rotate-12" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/10 p-2 rounded-lg"><Bell size={18} className="text-cyan-500" /></div>
                <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Radar de Operaciones</h2>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 px-4 py-1.5 rounded-full border border-white/5">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-cyan-500 animate-ping' : 'bg-slate-600'}`}></span>
                <span className="text-[9px] font-black text-slate-400 uppercase">{solicitudesPendientes.length} VIAJES</span>
              </div>
            </div>

            {!isOnline ? (
              <div className="py-28 text-center bg-slate-900/10 rounded-[4rem] border-2 border-dashed border-white/5">
                <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                  <Navigation className="text-slate-600" size={32} />
                </div>
                <p className="text-slate-500 font-black uppercase text-[10px] italic tracking-[0.3em] leading-relaxed">
                  Sistema Offline<br/>Enciende el radar para trabajar.
                </p>
              </div>
            ) : solicitudesPendientes.length === 0 ? (
              <div className="py-28 text-center bg-slate-900/10 rounded-[4rem] border-2 border-dashed border-white/5">
                <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                  <MapIcon className="text-cyan-500 animate-pulse" size={32} />
                </div>
                <p className="text-cyan-500 font-black uppercase text-[10px] italic tracking-[0.3em]">Escaneando La Jagua...</p>
              </div>
            ) : (
              <div className="grid gap-5">
                {solicitudesPendientes.map(viaje => (
                  <div key={viaje.id} className="bg-slate-900/40 border border-white/5 p-7 rounded-[3rem] flex justify-between items-center hover:bg-slate-900/60 transition-all group relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <p className="text-[10px] font-black text-emerald-400 uppercase italic">{viaje.clienteNombre}</p>
                      </div>
                      <h3 className="text-4xl font-black italic text-white mb-2 leading-none">
                        <span className="text-lg mr-1">$</span>{viaje.valorOfertado?.toLocaleString() || viaje.valor}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin size={12} />
                        <p className="text-[9px] font-bold uppercase truncate max-w-[140px] tracking-tighter">
                          Hacia: {viaje.puntoDestinoManual || viaje.puntoDestino}
                        </p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => manejarAceptarViaje(viaje.id)}
                      className="bg-white text-slate-950 px-8 py-8 rounded-[2.5rem] font-black uppercase text-[10px] italic shadow-2xl group-hover:bg-cyan-500 transition-all flex flex-col items-center justify-center leading-none gap-2 active:scale-90 relative z-10"
                    >
                      <Zap size={20} fill="currentColor" />
                      ACEPTAR
                    </button>
                    
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] rounded-full group-hover:bg-cyan-500/10 transition-all"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-3xl border-t border-white/5 p-8 flex justify-around items-end z-50">
          <button className="flex flex-col items-center gap-2 text-cyan-500">
            <div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20"><Navigation size={22} strokeWidth={3} /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Radar</span>
          </button>
          <button onClick={() => navigate('/billetera')} className="flex flex-col items-center gap-2 text-slate-500 hover:text-white transition-all">
            <div className="p-3"><Wallet size={22} /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Bóveda</span>
          </button>
          <button onClick={() => navigate('/perfil')} className="flex flex-col items-center gap-2 text-slate-500 hover:text-white transition-all">
            <div className="p-3"><User size={22} /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Perfil</span>
          </button>
      </nav>
    </div>
  );
};

export default MototaxiPanel;