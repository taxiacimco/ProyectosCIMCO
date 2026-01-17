import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';

// --- CONFIGURACIÓN DE ENTORNO ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- ICONOS (SVG) ---
const Icons = {
  Motorcycle: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 640 512" height="1em" width="1em"><path d="M512 240c0-13.3-10.7-24-24-24h-44.4c-13.4-32.6-45.2-56-82.6-56h-11c-6.6 0-12 5.4-12 12v24c0 6.6 5.4 12 12 12h11c11 0 20.1 8.9 20.1 20v8h-122l-10-60.1C250.6 120.3 201.8 80 145.4 80H120c-13.3 0-24 10.7-24 24v24c0 13.3 10.7 24 24 24h25.4c18.8 0 35.1 13.4 38 31.9l10.3 62.1C184.2 254.8 176 266.4 176 280c0 13.3 10.7 24 24 24h160c13.3 0 24-10.4 24-24 0-13.1-10.5-23.7-23.5-24h76.1c11.1 27.2 37.8 46.5 68.9 47.7-4.1 7.4-6.5 15.9-6.5 25 0 28.7 23.3 52 52 52s52-23.3 52-52c0-28.7-23.3-52-52-52-16.1 0-30.5 7.4-40 18.9V240zm39 89.3c0 7.2-5.8 13-13 13s-13-5.8-13-13 5.8-13 13-13 13 5.8 13 13z"></path></svg>,
  Navigation: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em"><path d="M446.7 98.6l-67.6 318.8c-5.1 22.5-29.7 33.9-48.7 21.5L218.8 362.4l-77 77c-14.1 14.1-38.1 4.1-38.1-15.9V249.7L21.5 170.1c-19-19-12.1-51.9 14.3-61.1L403.7 2.1c25-8.6 51.7 18.1 43 43.1l-22.3 53.4z"></path></svg>,
  MapPin: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 384 512" height="1em" width="1em"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"></path></svg>,
  Phone: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em"><path d="M493.4 445.6l-71.5-69.5c-9.3-9.1-24.3-9.1-33.6 0l-33.1 32.1c-8.3 8.1-21.7 8.1-29.9 0-73.8-71.7-123.9-120.3-195.6-192.1-8.3-8.1-8.3-21.1 0-29.2l32.1-33.1c9.3-9.1 9.3-24.3 0-33.6L90.6 50.7c-9.3-9.1-24.3-9.1-33.6 0l-41.2 40.1C4 102.5-3.3 120.6 1.4 140.4 22.5 226 71.5 308.2 134.7 371.5c63.2 63.2 145.4 112.2 231.1 133.3 19.8 4.7 37.9-2.6 49.7-14.4l40.1-41.2c9.2-9.1 9.2-24.3-.1-33.6z"></path></svg>,
  Check: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em"><path d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.404c-9.998 9.997-26.207 9.997-36.204 0z"></path></svg>,
  Wallet: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em"><path d="M461.2 128H80c-8.84 0-16-7.16-16-16s7.16-16 16-16h384c8.84 0 16-7.16 16-16s-7.16-16-16-16H80C35.82 64 0 99.82 0 144v288c0 44.18 35.82 80 80 80h381.2c44.18 0 80-35.82 80-80V208c0-44.18-35.82-80-80-80zM416 336c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32z"></path></svg>,
  Power: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em"><path d="M400 54.1c63 45 104 118.6 104 201.9 0 136.8-110.8 247.7-247.5 248C120 504.3 8.2 393.6 8 256.4 7.9 173.1 48.9 99.3 111.8 54.2c11.7-8.3 28-5.5 36.3 6.2 8.3 11.7 5.5 28-6.2 36.3-48 34.4-79.8 90.7-80 153.3-.4 104.4 85 189.9 189.3 190.1C355.7 440.3 440 355.8 440 251.5c0-63-31.7-119.5-80.4-154-11.7-8.2-14.6-24.5-6.4-36.2 8.2-11.8 24.5-14.6 36.8-7.2zM256 0c15.5 0 28 12.5 28 28v200c0 15.5-12.5 28-28 28s-28-12.5-28-28V28c0-15.5 12.5-28 28-28z"></path></svg>
};

const ConductorMasterPanel = () => {
  // --- ESTADO ---
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  // FLUJO DE VIAJE
  const [viewState, setViewState] = useState('buscando'); // 'buscando' | 'oferta' | 'en_progreso'
  const [viajeActual, setViajeActual] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [tripStep, setTripStep] = useState('yendo_al_origen'); // 'yendo_al_origen' | 'esperando_cliente' | 'en_ruta'

  const configRoles = {
    mototaxi: { label: 'Mototaxi', color: 'from-yellow-400 to-yellow-600', icon: <Icons.Motorcycle /> },
    motoparrillero: { label: 'Motoparrillero', color: 'from-blue-400 to-blue-600', icon: <Icons.Motorcycle /> },
    motocarga: { label: 'Motocarga', color: 'from-orange-500 to-red-600', icon: <Icons.Motorcycle /> },
    conductorinter: { label: 'Intermunicipal', color: 'from-emerald-500 to-teal-700', icon: <Icons.Motorcycle /> }
  };

  // --- EFECTO 1: AUTENTICACIÓN ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- EFECTO 2: SINCRONIZACIÓN DE DATOS (FIRESTORE) ---
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid);
    
    // Escuchar cambios en tiempo real
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        setIsOnline(data.estado === 'Disponible');
      } else {
        // Inicializar si no existe el documento
        const initialData = {
          nombre: 'Carlos Fuentes',
          rol: 'mototaxi',
          saldoWallet: 15000,
          estado: 'Desconectado',
          calificacion: 4.9,
          vehiculo: 'Bóxer CT100 - ABC12D'
        };
        setDoc(userRef, initialData);
        setUserData(initialData);
      }
      setLoading(false);
    }, (err) => console.error("Error Firestore:", err));

    return () => unsubscribe();
  }, [user]);

  // --- EFECTO 3: CRONOMETRO DE OFERTA ---
  useEffect(() => {
    if (viewState !== 'oferta') return;
    if (timeLeft === 0) { 
      setViewState('buscando'); 
      setViajeActual(null); 
      return; 
    }
    const timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [viewState, timeLeft]);

  // --- EFECTO 4: SIMULADOR DE VIAJE ENTRANTE ---
  useEffect(() => {
    if (isOnline && viewState === 'buscando') {
      const sim = setTimeout(() => {
        setViajeActual({
          id: 'vj-' + Math.floor(Math.random()*1000),
          pasajero: 'Andrés López',
          origen: 'Centro Comercial Gran Plaza',
          destino: 'Barrio Las Américas, Calle 4',
          tarifa: 7500,
          distancia: '2.1 km'
        });
        setTimeLeft(15);
        setViewState('oferta');
      }, 7000); // Aparece un viaje a los 7 segundos de estar online
      return () => clearTimeout(sim);
    }
  }, [isOnline, viewState]);

  // --- HANDLERS ---
  const toggleEstado = async () => {
    if (!user) return;
    const nEstado = isOnline ? 'Desconectado' : 'Disponible';
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid), { 
        estado: nEstado 
      });
    } catch (e) {
      console.error("Error al cambiar estado:", e);
    }
  };

  const handleAceptarViaje = () => {
    setViewState('en_progreso');
    setTripStep('yendo_al_origen');
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const currentRole = configRoles[userData?.rol] || configRoles.mototaxi;

  // --- VISTA: VIAJE EN PROGRESO ---
  if (viewState === 'en_progreso') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <div className="relative h-[40vh] bg-slate-800 overflow-hidden">
          <div className="absolute inset-0 opacity-40 bg-[url('https://www.google.com/maps/vt/pb=!1m4!1m3!1i14!2i4850!3i7521!2m3!1e0!2sm!3i420120488!3m8!2ses!3scol!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m1!1e0!23i4111425')] bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950"></div>
          <div className="absolute top-6 left-6 right-6 flex justify-between">
            <div className="bg-slate-900/90 backdrop-blur p-4 rounded-2xl border border-white/10 flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-lg animate-pulse"><Icons.Navigation /></div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase">Navegación Activa</p>
                <p className="font-bold text-sm">8 min • {viajeActual.distancia}</p>
              </div>
            </div>
            <button className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-red-600/20">S.O.S</button>
          </div>
        </div>

        <div className="flex-1 bg-slate-950 rounded-t-[3rem] -mt-12 relative z-10 p-8 border-t border-white/5 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl border border-white/10">👤</div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase">Pasajero</p>
                <h2 className="text-xl font-black">{viajeActual.pasajero}</h2>
                <p className="text-xs text-yellow-500 font-bold">★ 4.9 • <span className="text-slate-400">Efectivo</span></p>
              </div>
            </div>
            <div className="flex gap-2">
               <button className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-cyan-400 border border-white/5"><Icons.Phone /></button>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div className="flex gap-4">
              <div className="flex flex-col items-center py-1">
                <div className={`w-3 h-3 rounded-full ${tripStep === 'yendo_al_origen' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-700'}`}></div>
                <div className="w-0.5 flex-1 bg-slate-800 my-1"></div>
                <div className={`w-3 h-3 rounded-full ${tripStep === 'en_ruta' ? 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : 'bg-slate-700'}`}></div>
              </div>
              <div className="flex-1 space-y-4 text-sm">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase">Recoger en:</p>
                  <p className={`${tripStep === 'yendo_al_origen' ? 'text-white font-bold' : 'text-slate-500'}`}>{viajeActual.origen}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase">Llevar a:</p>
                  <p className={`${tripStep === 'en_ruta' ? 'text-white font-bold' : 'text-slate-500'}`}>{viajeActual.destino}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {tripStep === 'yendo_al_origen' && (
              <button onClick={() => setTripStep('esperando_cliente')} className="w-full py-5 rounded-3xl bg-emerald-500 font-black text-lg shadow-xl active:scale-95 transition-all">YA LLEGUÉ AL ORIGEN</button>
            )}
            {tripStep === 'esperando_cliente' && (
              <button onClick={() => setTripStep('en_ruta')} className="w-full py-5 rounded-3xl bg-cyan-500 font-black text-lg shadow-xl animate-pulse">INICIAR VIAJE</button>
            )}
            {tripStep === 'en_ruta' && (
              <button onClick={() => { setViewState('buscando'); setViajeActual(null); }} className="w-full py-5 rounded-3xl bg-red-600 font-black text-lg shadow-xl">FINALIZAR VIAJE • ${viajeActual.tarifa}</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA: MODAL DE OFERTA ---
  if (viewState === 'oferta') {
    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <div className="w-full max-w-md bg-slate-900 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
          <div className={`p-8 bg-gradient-to-r ${currentRole.color} relative`}>
            <div className="absolute top-8 right-8 w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
              <span className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-500 animate-bounce' : 'text-white'}`}>{timeLeft}</span>
            </div>
            <p className="text-[10px] font-black uppercase text-white/70 tracking-widest">Viaje Cercano</p>
            <h2 className="text-4xl font-black text-white mt-1">$ {viajeActual.tarifa.toLocaleString()}</h2>
            <p className="mt-2 text-xs font-bold text-white/80 flex items-center gap-2"><Icons.MapPin /> A {viajeActual.distancia} de ti</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase">Punto de Recogida</p>
                <p className="font-bold text-sm">{viajeActual.origen}</p>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase">Destino final</p>
                <p className="font-bold text-sm">{viajeActual.destino}</p>
              </div>
            </div>
            <button onClick={handleAceptarViaje} className={`w-full py-5 rounded-3xl bg-gradient-to-r ${currentRole.color} font-black text-xl shadow-xl text-white`}>ACEPTAR VIAJE</button>
            <button onClick={() => { setViewState('buscando'); setViajeActual(null); }} className="w-full text-slate-600 font-black text-xs uppercase tracking-widest text-center">Ignorar solicitud</button>
          </div>
          <div className="h-1.5 bg-slate-800 w-full">
            <div className={`h-full transition-all duration-1000 ${timeLeft < 6 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${(timeLeft/15)*100}%` }}></div>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA: PRINCIPAL (BUSCANDO) ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-24 overflow-x-hidden">
      <header className={`bg-gradient-to-r ${currentRole.color} p-8 rounded-b-[3rem] shadow-2xl relative`}>
        <div className="flex justify-between items-start text-white">
          <div className="max-w-[70%]">
            <h1 className="text-3xl font-black flex items-center gap-3 tracking-tighter">
              <span className="bg-white/20 p-2 rounded-xl text-2xl">{currentRole.icon}</span>
              {userData?.nombre || 'Cargando...'}
            </h1>
            <p className="text-xs mt-2 font-bold uppercase tracking-widest opacity-80">{currentRole.label} • {userData?.vehiculo}</p>
          </div>
          <button onClick={toggleEstado} className={`px-5 py-3 rounded-2xl font-black text-[10px] border shadow-lg transition-all ${isOnline ? 'bg-emerald-500 border-emerald-400 animate-pulse' : 'bg-slate-900/60 border-white/20'}`}>
             {isOnline ? 'EN LÍNEA' : 'OFFLINE'}
          </button>
        </div>
        <div className="mt-8 bg-slate-900/40 backdrop-blur-xl rounded-[2rem] p-6 flex justify-between items-center border border-white/10 shadow-inner">
          <div>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/60 mb-1">Mi Balance</p>
            <p className="text-3xl font-black text-white">$ {userData?.saldoWallet?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-white text-slate-900 p-4 rounded-2xl shadow-xl"><Icons.Wallet /></div>
        </div>
      </header>

      <main className="p-6">
        <div className="py-20 flex flex-col items-center justify-center text-center">
          {isOnline ? (
            <>
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                <div className="absolute inset-4 bg-emerald-500/30 rounded-full animate-pulse"></div>
                <div className="relative w-32 h-32 bg-emerald-500/10 rounded-full border-2 border-emerald-500/50 flex items-center justify-center">
                   <div className="w-6 h-6 bg-emerald-500 rounded-full shadow-[0_0_20px_#10b981]"></div>
                </div>
              </div>
              <h3 className="text-xl font-black text-white mb-2">Buscando solicitudes...</h3>
              <p className="text-slate-500 text-sm max-w-[200px]">Mantente cerca de zonas concurridas para recibir más viajes.</p>
            </>
          ) : (
            <div className="opacity-40 flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-white/5">
                <Icons.Power className="text-4xl text-slate-600" />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.2em]">Estás desconectado</p>
              <p className="text-xs text-slate-600 mt-2">Activa el interruptor para empezar a ganar.</p>
            </div>
          )}
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5">
             <p className="text-[10px] font-black text-slate-500 uppercase">Hoy</p>
             <p className="text-xl font-black text-white">0 Viajes</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5">
             <p className="text-[10px] font-black text-slate-500 uppercase">Calificación</p>
             <p className="text-xl font-black text-white">★ {userData?.calificacion || '5.0'}</p>
          </div>
        </div>
      </main>

      {/* Navegación Inferior */}
      <nav className="fixed bottom-6 left-6 right-6 bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-4 rounded-[2.5rem] flex justify-around items-center shadow-2xl z-50">
        <button className="flex flex-col items-center gap-1 text-emerald-400">
          <span className="text-xl"><Icons.Motorcycle /></span>
          <span className="text-[8px] font-black uppercase tracking-tighter">Panel</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <span className="text-xl opacity-50">💼</span>
          <span className="text-[8px] font-black uppercase tracking-tighter">Historial</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <span className="text-xl opacity-50"><Icons.Wallet /></span>
          <span className="text-[8px] font-black uppercase tracking-tighter">Billetera</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <span className="text-xl opacity-50">👤</span>
          <span className="text-[8px] font-black uppercase tracking-tighter">Perfil</span>
        </button>
      </nav>
    </div>
  );
};

export default ConductorMasterPanel;