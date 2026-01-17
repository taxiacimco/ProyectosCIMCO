import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where,
  increment,
  addDoc
} from 'firebase/firestore';
import { getAuth, signOut, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

// Iconos lucide-react
import { 
  MapPin, 
  Navigation, 
  DollarSign, 
  LogOut, 
  Bell, 
  Play, 
  Flag, 
  ShieldCheck, 
  Wallet,
  Loader2,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  User
} from 'lucide-react';

// Configuración de Firebase integrada para evitar errores de ruta
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const MotoparrilleroPanel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [viajeActivo, setViajeActivo] = useState(null);
  const [solicitudesRadar, setSolicitudesRadar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enviandoSOS, setEnviandoSOS] = useState(false);
  const audioRef = useRef(new Audio('/sounds/notify.mp3'));

  // 1. Manejo de Autenticación CIMCO
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Error de autenticación:", err);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // En un entorno real redirigiría, aquí manejamos el estado
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Lógica de Datos y Suscripciones (Identidad Púrpura)
  useEffect(() => {
    if (!user) return;

    // Suscripción al Perfil del Usuario
    const unsubUser = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), (snap) => {
      if (snap.exists()) {
        setUserData(snap.data());
      } else {
        // Datos por defecto si no existe el documento
        setUserData({ balance: 0, displayName: "Parrillero CIMCO" });
      }
      setLoading(false);
    }, (err) => {
      console.error("Error cargando perfil:", err);
      setLoading(false);
    });

    // RADAR: Buscar viajes de tipo "Motoparrillero"
    const qRadar = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
      where("estado", "==", "pendiente"),
      where("servicioSolicitado", "==", "Motoparrillero")
    );

    const unsubRadar = onSnapshot(qRadar, (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      
      if (docs.length > solicitudesRadar.length) {
        ejecutarAlertaParrillero();
      }
      setSolicitudesRadar(docs);
    });

    // Monitorear Viaje Activo
    const qActivo = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
      where("conductorId", "==", user.uid),
      where("estado", "in", ["aceptado", "en_ruta"])
    );

    const unsubActivo = onSnapshot(qActivo, (snap) => {
      if (!snap.empty) {
        setViajeActivo({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setViajeActivo(null);
      }
    });

    return () => {
      unsubUser();
      unsubRadar();
      unsubActivo();
    };
  }, [user, solicitudesRadar.length]);

  const ejecutarAlertaParrillero = () => {
    if ("vibrate" in navigator) navigator.vibrate([300, 100, 300]);
    audioRef.current.play().catch(() => {});
  };

  const manejarSOS = async () => {
    if (!user) return;
    if (window.confirm("🚨 ¿ENVIAR ALERTA SOS? Esto notificará a la central de inmediato.")) {
      setEnviandoSOS(true);
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'alertas_sos'), {
          usuarioId: user.uid,
          nombre: userData?.displayName || "Conductor Parrillero",
          tipoServicio: 'Motoparrillero',
          fecha: serverTimestamp(),
          estado: 'ACTIVO',
          ubicacion: "La Jagua de Ibirico" // En producción se usa Geolocation API
        });
        alert("¡SOS ENVIADO! La central ha sido notificada.");
      } catch (err) {
        alert("Error al enviar SOS: " + err.message);
      } finally {
        setEnviandoSOS(false);
      }
    }
  };

  const aceptarViaje = async (viaje) => {
    if (!user || !userData) return;
    const comision = parseFloat(viaje.valorOfertado) * 0.10;
    const saldoActual = userData.balance || 0;

    if (saldoActual < comision) {
      alert(`⚠️ Saldo insuficiente. Necesitas $${comision.toLocaleString()} para aceptar este viaje.`);
      return;
    }

    try {
      const viajeRef = doc(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados', viaje.id);
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      
      await updateDoc(viajeRef, {
        conductorId: user.uid,
        conductorNombre: userData.displayName || "Motoparrillero",
        estado: 'aceptado',
        comisionCobrada: comision,
        fechaAceptado: serverTimestamp()
      });

      await updateDoc(userRef, {
        balance: increment(-comision)
      });
    } catch (error) {
      alert("Error al procesar el servicio. Inténtalo de nuevo.");
    }
  };

  const actualizarEstado = async (nuevoEstado) => {
    if (!viajeActivo) return;
    try {
      const viajeRef = doc(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados', viajeActivo.id);
      await updateDoc(viajeRef, { 
        estado: nuevoEstado,
        [`hora_${nuevoEstado}`]: serverTimestamp() 
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-purple-500">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-black italic animate-pulse">CARGANDO PANEL PARRILLERO...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans relative">
      {/* HEADER IDENTIDAD PÚRPURA */}
      <header className="p-4 bg-slate-900 border-b border-purple-900/50 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 p-2 rounded-xl shadow-lg shadow-purple-900/20">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black italic text-purple-400 leading-none tracking-tighter uppercase">Parrillero</h1>
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">CIMCO Security</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Billetera</p>
            <p className="text-sm font-black text-purple-400">
              ${(userData?.balance || 0).toLocaleString()}
            </p>
          </div>
          <button 
            onClick={() => signOut(auth).then(() => navigate('/login'))} 
            className="text-red-500 p-2 bg-red-900/10 rounded-xl border border-red-900/20 active:scale-90"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* PERFIL Y SOS */}
        <div className="bg-slate-900/50 p-4 rounded-3xl border border-purple-500/10 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-900/30 rounded-full flex items-center justify-center border border-purple-500/20 text-purple-400">
                    <User size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Bienvenido</p>
                    <p className="text-xs font-black text-slate-200 italic">{userData?.displayName || 'Cargando...'}</p>
                </div>
            </div>
            <button 
              onClick={manejarSOS}
              className={`flex flex-col items-center px-4 py-1.5 rounded-2xl border transition-all active:scale-95 ${enviandoSOS ? 'bg-red-900 border-red-500' : 'bg-red-600/10 border-red-600/30 animate-pulse'}`}
            >
              <ShieldAlert size={16} className="text-red-500 mb-0.5" />
              <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">S.O.S</span>
            </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {!viajeActivo ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-purple-400 animate-bounce" />
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Servicios en Radar</h2>
              </div>
              <span className="bg-purple-500/10 text-purple-400 text-[8px] px-2 py-0.5 rounded-full font-bold border border-purple-500/20">
                {solicitudesRadar.length} DISPONIBLES
              </span>
            </div>

            {solicitudesRadar.length === 0 ? (
              <div className="p-16 text-center bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-800 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 text-slate-800">
                    <AlertCircle size={32} />
                </div>
                <p className="text-slate-600 font-bold italic text-sm">Buscando pasajeros...</p>
                <p className="text-slate-700 text-[10px] mt-2 font-medium">Radar activo en La Jagua</p>
              </div>
            ) : (
              solicitudesRadar.map(viaje => (
                <div key={viaje.id} className="bg-slate-900 border border-purple-500/20 p-6 rounded-[2.5rem] shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest leading-none block mb-1">Oferta Recibida</span>
                      <h3 className="text-4xl font-black text-white italic tracking-tighter">${viaje.valorOfertado}</h3>
                    </div>
                    <div className="bg-purple-500/10 p-3 rounded-2xl border border-purple-500/20 text-purple-400">
                      <Wallet size={24} />
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50">
                      <MapPin size={16} className="text-purple-500" />
                      <div>
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Recogida</p>
                        <p className="text-xs font-bold text-slate-200 italic">{viaje.puntoRecogidaManual}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50">
                      <Flag size={16} className="text-cyan-500" />
                      <div>
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Destino</p>
                        <p className="text-xs font-bold text-slate-200 italic">{viaje.puntoDestinoManual}</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => aceptarViaje(viaje)}
                    className="w-full bg-purple-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-purple-900/40 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase"
                  >
                    TOMAR SERVICIO <CheckCircle size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border-2 border-purple-500 p-6 rounded-[3rem] shadow-[0_0_50px_rgba(168,85,247,0.15)] space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-purple-400 uppercase italic">
                    Viaje {viajeActivo.estado === 'aceptado' ? 'Aceptado' : 'En Ruta'}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-600">#{viajeActivo.id.slice(-6).toUpperCase()}</p>
            </div>

            <div className="bg-slate-950 p-5 rounded-[2rem] border border-slate-800 space-y-5">
              <div className="flex gap-4 items-start">
                <div className="flex flex-col items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <div className="w-0.5 h-8 bg-slate-800"></div>
                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                </div>
                <div className="flex flex-col gap-4">
                    <div>
                        <p className="text-[8px] font-bold text-slate-600 uppercase">Recoger en:</p>
                        <p className="text-sm font-bold italic text-slate-200">{viajeActivo.puntoRecogidaManual}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-bold text-slate-600 uppercase">Destino:</p>
                        <p className="text-sm font-bold italic text-slate-200">{viajeActivo.puntoDestinoManual}</p>
                    </div>
                </div>
              </div>
            </div>

            <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-2xl flex justify-between items-center">
                <p className="text-xs font-bold italic text-purple-300">Valor del Servicio:</p>
                <p className="text-xl font-black text-white">${viajeActivo.valorOfertado}</p>
            </div>

            <div className="flex flex-col gap-3">
              {viajeActivo.estado === 'aceptado' && (
                <button 
                  onClick={() => actualizarEstado('en_ruta')}
                  className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl active:scale-95 uppercase"
                >
                  <Play size={22} fill="currentColor"/> INICIAR RECORRIDO
                </button>
              )}
              {viajeActivo.estado === 'en_ruta' && (
                <button 
                  onClick={() => actualizarEstado('finalizado')}
                  className="w-full bg-green-500 text-slate-950 font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl active:scale-95 uppercase"
                >
                  <Flag size={22} fill="currentColor"/> FINALIZAR VIAJE
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER NAVBAR */}
      <nav className="fixed bottom-0 w-full bg-slate-900/80 backdrop-blur-md border-t border-slate-800 p-4 flex justify-around items-center z-50">
        <button onClick={() => navigate('/billetera')} className="flex flex-col items-center text-slate-500">
          <Wallet size={20} />
          <span className="text-[8px] font-bold uppercase mt-1">Cartera</span>
        </button>
        <button className="bg-purple-600 p-3 rounded-full -mt-10 shadow-lg shadow-purple-500/30 border-4 border-slate-950">
          <Bell size={24} className="text-white" />
        </button>
        <button onClick={() => navigate('/historial')} className="flex flex-col items-center text-slate-500">
          <Navigation size={20} />
          <span className="text-[8px] font-bold uppercase mt-1">Historial</span>
        </button>
      </nav>
    </div>
  );
};

export default MotoparrilleroPanel;