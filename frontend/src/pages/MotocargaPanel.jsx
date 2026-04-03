/**
 * PROYECTO: TAXIA CIMCO - Módulo de Motocarga
 * Arquitectura: Hexagonal / React Functional Components
 * Estilo: Ciber-Neo-Brutalista (Emerald Industrial)
 * * Misión: Gestión de fletes pesados con comisión fija de $500 y 
 * rastreo GPS optimizado.
 */

import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  addDoc,
  getDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged 
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

// --- COMPONENTES Y HOOKS DEL ECOSISTEMA CIMCO ---
import useDriverTracking from '../hooks/useDriverTracking';
import ModalGpsInactivo from '../components/Conductor/ModalGpsInactivo';

// --- ICONOGRAFÍA ---
import { 
  Truck, AlertTriangle, Loader2, Navigation, 
  Phone, Box, ShieldAlert, Zap, Wallet, 
  CheckCircle, LogOut, MapPin, X, ChevronRight
} from 'lucide-react';

// --- CONFIGURACIÓN FIREBASE (INYECCIÓN DE ENTORNO) ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

const MotocargaPanel = () => {
  const navigate = useNavigate();
  
  // --- ESTADOS DE SESIÓN Y PERFIL ---
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  // --- ESTADOS DE LOGÍSTICA ---
  const [viajeActivo, setViajeActivo] = useState(null);
  const [solicitudesCarga, setSolicitudesCarga] = useState([]);
  const [errorGps, setErrorGps] = useState(null);

  // --- REFERENCIAS ---
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

  // --- INTEGRACIÓN DEL SISTEMA CENTINELA (GPS) ---
  const { location } = useDriverTracking(isOnline ? 'motocarga' : null);

  /**
   * EFECTO 1: Observador de Autenticación
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  /**
   * EFECTO 2: Sincronización con la Ruta Sagrada (Perfil y Viajes)
   */
  useEffect(() => {
    if (!user?.uid) return;

    // Escucha del Perfil en la Ruta Sagrada
    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUserData(snap.data());
      }
      setLoading(false);
    });

    // Escucha de Viajes Activos (Ruta Sagrada: rides)
    const ridesRef = collection(db, 'artifacts', appId, 'public', 'data', 'rides');
    const qActivo = query(
      ridesRef, 
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

    return () => { 
      unsubUser(); 
      unsubActivo(); 
    };
  }, [user, appId]);

  /**
   * EFECTO 3: Radar de Cargas Pendientes
   */
  useEffect(() => {
    if (!user || !isOnline || viajeActivo) { 
      setSolicitudesCarga([]); 
      return; 
    }

    const ridesRef = collection(db, 'artifacts', appId, 'public', 'data', 'rides');
    const qRadar = query(
      ridesRef, 
      where("estado", "==", "pendiente"), 
      where("servicioSolicitado", "==", "Motocarga")
    );

    const unsubRadar = onSnapshot(qRadar, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (docs.length > solicitudesCarga.length) {
        audioRef.current.play().catch(() => {});
      }
      setSolicitudesCarga(docs);
    });

    return () => unsubRadar();
  }, [user, isOnline, viajeActivo, appId, solicitudesCarga.length]);

  /**
   * ACCIÓN: Aceptar Flete
   * Implementa validación de saldo y asignación de rol para comisión fija ($500)
   */
  const aceptarFlete = async (viaje) => {
    // REGLA DE NEGOCIO: Bloqueo por saldo negativo crítico
    if ((userData?.saldoWallet || 0) <= -5000) {
      alert("⚠️ SALDO INSUFICIENTE: Recargue su boveda para aceptar fletes.");
      return;
    }

    try {
      const viajeRef = doc(db, 'artifacts', appId, 'public', 'data', 'rides', viaje.id);
      await updateDoc(viajeRef, {
        conductorId: user.uid,
        conductorNombre: userData?.nombre || "Unidad de Carga",
        conductorTelefono: userData?.telefono || "",
        estado: 'aceptado',
        tipoVehiculo: 'motocarga', // Flag para Backend Java (Comisión $500)
        fechaAceptado: serverTimestamp(),
        coordsConductor: location || { lat: 0, lng: 0 }
      });
    } catch (error) {
      console.error("❌ Error al aceptar flete:", error);
    }
  };

  /**
   * ACCIÓN: Ciclo de Vida del Viaje
   */
  const actualizarEstadoViaje = async (nuevoEstado) => {
    if (!viajeActivo) return;

    try {
      const viajeRef = doc(db, 'artifacts', appId, 'public', 'data', 'rides', viajeActivo.id);
      await updateDoc(viajeRef, { 
        estado: nuevoEstado, 
        [`hora_${nuevoEstado}`]: serverTimestamp() 
      });
    } catch (error) {
      console.error("❌ Error al actualizar estado:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col justify-center items-center gap-4">
        <Loader2 className="animate-spin text-emerald-500" size={50} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/50">Cargando Sistema de Carga</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col max-w-xl mx-auto pb-28 font-sans selection:bg-emerald-500 selection:text-black">
      
      {/* HEADER INDUSTRIAL */}
      <header className="p-6 bg-slate-900/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black italic tracking-tighter">
            CIMCO <span className="text-emerald-500">CARGA</span>
          </h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">
              ID: {user?.uid.slice(0, 8)}
            </span>
          </div>
        </div>

        {!viajeActivo && (
          <button 
            onClick={() => setIsOnline(!isOnline)} 
            className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] transition-all duration-500 border-b-4 active:border-b-0 active:translate-y-1 ${
              isOnline 
                ? 'bg-rose-500/10 border-rose-700 text-rose-500 hover:bg-rose-500 hover:text-white' 
                : 'bg-emerald-500 border-emerald-700 text-slate-950'
            }`}
          >
            {isOnline ? 'Desconectar' : 'Entrar Online'}
          </button>
        )}
      </header>

      <main className="p-6 flex-1">
        
        {/* PANEL DE SALDO (NEO-BRUTALISMO) */}
        <div className="mb-8 bg-slate-900 border border-white/5 p-6 rounded-[2.5rem] flex justify-between items-center">
          <div>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Bóveda de Trabajo</p>
            <h2 className={`text-2xl font-black ${ (userData?.saldoWallet || 0) < 0 ? 'text-rose-500' : 'text-white'}`}>
              ${userData?.saldoWallet?.toLocaleString() || '0'}
            </h2>
          </div>
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
             <Wallet className="text-emerald-500" size={24} />
          </div>
        </div>

        {/* ALERTAS DE SISTEMA */}
        {!location && isOnline && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="text-amber-500 shrink-0" size={20} />
            <p className="text-[10px] font-bold text-amber-200 uppercase">Esperando señal GPS precisa para recibir fletes...</p>
          </div>
        )}

        {viajeActivo ? (
          /* MODO: VIAJE EN CURSO */
          <div className="space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="bg-emerald-500 text-slate-950 p-8 rounded-[3.5rem] shadow-2xl shadow-emerald-500/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Truck size={120} />
              </div>
              
              <span className="bg-black text-white px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mb-4 inline-block">
                Flete en Progreso
              </span>
              
              <h3 className="text-3xl font-black italic uppercase leading-none mb-6">
                {viajeActivo.puntoRecogidaManual || 'Punto de Carga'}
              </h3>

              <div className="flex flex-col gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <MapPin size={16} />
                  <p className="text-xs font-bold opacity-80">{viajeActivo.destinoManual || 'Destino por confirmar'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Zap size={16} />
                  <p className="text-xl font-black">${viajeActivo.valorOfertado?.toLocaleString()}</p>
                </div>
              </div>

              <button 
                onClick={() => actualizarEstadoViaje(viajeActivo.estado === 'aceptado' ? 'en_ruta' : 'finalizado')} 
                className="w-full bg-black text-white py-6 rounded-[2.2rem] font-black uppercase text-sm italic flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform"
              >
                {viajeActivo.estado === 'aceptado' ? (
                  <><Box size={20} /> Confirmar Cargue</>
                ) : (
                  <><CheckCircle size={20} /> Confirmar Entrega</>
                )}
              </button>
            </div>

            <button className="w-full bg-slate-900 border border-white/10 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
              <Phone size={16} /> Contactar Cliente
            </button>
          </div>
        ) : (
          /* MODO: RADAR DE FLETES */
          <div className="space-y-6">
            <div className="flex justify-between items-end mb-4 px-2">
              <h2 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em]">Cargas Disponibles ({solicitudesCarga.length})</h2>
              {isOnline && <Loader2 className="animate-spin text-emerald-500/30" size={14} />}
            </div>

            {!isOnline ? (
              <div className="mt-20 flex flex-col items-center opacity-20">
                <ShieldAlert size={80} strokeWidth={1} />
                <p className="text-center font-black uppercase text-xs mt-4 tracking-widest text-slate-500">Sistema Fuera de Línea</p>
              </div>
            ) : solicitudesCarga.length === 0 ? (
              <div className="mt-20 text-center">
                <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                  <Navigation className="text-slate-700 animate-pulse" size={32} />
                </div>
                <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Escaneando zona logística...</p>
              </div>
            ) : (
              solicitudesCarga.map(flete => (
                <div 
                  key={flete.id} 
                  className="bg-slate-900 border border-white/5 p-8 rounded-[3.5rem] shadow-xl hover:border-emerald-500/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full group-hover:bg-emerald-500/10 transition-all"></div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Oferta de Carga</p>
                      <h3 className="text-4xl font-black italic text-white">${flete.valorOfertado?.toLocaleString()}</h3>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-2xl">
                      <Truck className="text-slate-500 group-hover:text-emerald-500 transition-colors" size={24} />
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-slate-400">
                      <MapPin size={14} className="text-emerald-500" />
                      <span className="text-[11px] font-bold uppercase truncate">{flete.puntoRecogidaManual}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <ChevronRight size={14} className="text-slate-600" />
                      <span className="text-[11px] font-bold uppercase truncate">{flete.destinoManual || 'Destino a convenir'}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => aceptarFlete(flete)} 
                    className="w-full bg-emerald-500 text-slate-950 py-6 rounded-[2.2rem] font-black uppercase text-xs italic flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Zap size={16} fill="currentColor" /> Tomar Flete
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* NAV INFERIOR INDUSTRIAL */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-3xl border-t border-white/5 p-8 flex justify-around items-end z-50">
        <button className="flex flex-col items-center gap-2 text-emerald-500">
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
            <Navigation size={22} strokeWidth={3} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Radar</span>
        </button>
        
        <button onClick={() => navigate('/billetera')} className="flex flex-col items-center gap-2 text-slate-500 hover:text-white transition-all">
          <div className="p-3"><Wallet size={22} /></div>
          <span className="text-[9px] font-black uppercase tracking-widest">Bóveda</span>
        </button>
        
        <button onClick={() => navigate('/perfil')} className="flex flex-col items-center gap-2 text-slate-500 hover:text-white transition-all">
          <div className="p-3"><Box size={22} /></div>
          <span className="text-[9px] font-black uppercase tracking-widest">Historial</span>
        </button>
      </nav>

      <ModalGpsInactivo isOpen={isOnline && !location} />
    </div>
  );
};

export default MotocargaPanel;