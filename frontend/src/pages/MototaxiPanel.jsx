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
  increment 
} from 'firebase/firestore';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

// Iconos lucide-react (usando SVGs inline o lucide-react si está disponible)
import { 
  MapPin, 
  Navigation, 
  DollarSign, 
  LogOut, 
  Bell, 
  CheckCircle, 
  Play, 
  Flag,
  Loader2,
  AlertTriangle,
  User,
  ShieldAlert 
} from 'lucide-react';

// Configuración de Firebase (se asume que los valores vienen de las variables de entorno del sistema)
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const MototaxiPanel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [viajeActivo, setViajeActivo] = useState(null);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enviandoSOS, setEnviandoSOS] = useState(false);
  const [ubicacion, setUbicacion] = useState({ lat: 9.5614, lng: -73.3364 });

  const audioRef = useRef(new Audio('/sounds/notify.mp3'));

  // Manejo de autenticación
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

  // Lógica principal de datos
  useEffect(() => {
    if (!user) return;

    let unsubUser, unsubRadar, unsubActivo;

    const inicializarDatos = async () => {
      try {
        // 1. Suscripción a datos del usuario
        unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) {
            setUserData(snap.data());
          }
          setLoading(false);
        }, (err) => {
          console.error("Error en suscripción de usuario:", err);
          setLoading(false);
        });

        // 2. Radar de Viajes pendientes para Mototaxi
        const qRadar = query(
          collection(db, "viajes_solicitados"),
          where("estado", "==", "pendiente"),
          where("servicioSolicitado", "==", "Mototaxi")
        );

        unsubRadar = onSnapshot(qRadar, (snap) => {
          const docs = [];
          snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
          if (docs.length > solicitudesPendientes.length) {
            ejecutarAlerta();
          }
          setSolicitudesPendientes(docs);
        }, (err) => console.error("Error en radar:", err));

        // 3. Viaje Activo para el conductor
        const qActivo = query(
          collection(db, "viajes_solicitados"),
          where("conductorId", "==", user.uid),
          where("estado", "in", ["aceptado", "en_ruta"])
        );

        unsubActivo = onSnapshot(qActivo, (snap) => {
          if (!snap.empty) {
            setViajeActivo({ id: snap.docs[0].id, ...snap.docs[0].data() });
          } else {
            setViajeActivo(null);
          }
        }, (err) => console.error("Error en viaje activo:", err));

      } catch (err) {
        setError("Error al conectar con la base de datos.");
        setLoading(false);
      }
    };

    inicializarDatos();

    return () => {
      if (unsubUser) unsubUser();
      if (unsubRadar) unsubRadar();
      if (unsubActivo) unsubActivo();
    };
  }, [user, solicitudesPendientes.length]);

  const ejecutarAlerta = () => {
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    audioRef.current.play().catch(() => {});
  };

  // Función SOS integrada directamente
  const manejarSOS = async () => {
    if (!user) return;
    if (window.confirm("¿ESTÁ SEGURO? Se enviará una alerta de emergencia inmediata.")) {
      setEnviandoSOS(true);
      try {
        const sosRef = collection(db, 'alertas_sos');
        await updateDoc(doc(sosRef), {
          usuarioId: user.uid,
          nombreUsuario: userData?.displayName || user.email,
          tipoVehiculo: 'Mototaxi',
          ubicacion: ubicacion,
          fecha: serverTimestamp(),
          estado: 'ACTIVO'
        });
        alert("¡SOS ENVIADO! Mantén la calma.");
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
    const balanceActual = userData.balance || 0;

    if (balanceActual < comision) {
      alert(`Saldo insuficiente. Necesitas $${comision} para la comisión.`);
      return;
    }

    try {
      await updateDoc(doc(db, "viajes_solicitados", viaje.id), {
        conductorId: user.uid,
        conductorNombre: userData.displayName || "Conductor",
        estado: 'aceptado',
        comisionAplicada: comision,
        fechaAceptado: serverTimestamp()
      });

      await updateDoc(doc(db, "users", user.uid), {
        balance: increment(-comision)
      });
    } catch (err) {
      console.error("Error al aceptar viaje:", err);
    }
  };

  const cambiarEstadoViaje = async (nuevoEstado) => {
    if (!viajeActivo) return;
    try {
      await updateDoc(doc(db, "viajes_solicitados", viajeActivo.id), { 
        estado: nuevoEstado,
        [`timestamp_${nuevoEstado}`]: serverTimestamp() 
      });
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => signOut(auth).then(() => navigate('/login'));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-cyan-500">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-black italic">Sincronizando con CIMCO...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans pb-24 relative overflow-x-hidden">
      {/* HEADER */}
      <header className="p-4 bg-slate-950 border-b border-cyan-900/50 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
            <Navigation size={20} className="text-slate-950" />
          </div>
          <div>
            <h1 className="text-lg font-black italic text-cyan-400 leading-none">CIMCO DRIVE</h1>
            <span className="text-[7px] font-bold text-cyan-700 uppercase">MotoTaxi Pro</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={manejarSOS}
            className={`p-2 rounded-xl border border-red-500/50 ${enviandoSOS ? 'bg-red-900' : 'bg-red-600/20 text-red-500 animate-pulse'}`}
          >
            <ShieldAlert size={20} />
          </button>
          <div className="text-right">
            <p className="text-sm font-black text-green-400">
              ${(userData?.balance || 0).toLocaleString()}
            </p>
          </div>
          <button onClick={handleLogout} className="p-2 bg-slate-800 text-slate-400 rounded-xl">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* PERFIL Y SOS RÁPIDO */}
        <div className="bg-slate-950/80 p-4 rounded-3xl border border-cyan-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                    <User size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Bienvenido</p>
                    <p className="text-xs font-black italic truncate max-w-[120px]">
                      {userData?.displayName || 'Conductor'}
                    </p>
                </div>
            </div>
            <button 
              onClick={manejarSOS}
              className="flex flex-col items-center bg-red-600/10 border border-red-600/30 px-4 py-1 rounded-2xl active:scale-95"
            >
              <ShieldAlert size={16} className="text-red-500 mb-0.5" />
              <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">S.O.S</span>
            </button>
        </div>

        {/* CONTENIDO PRINCIPAL: RADAR O VIAJE ACTIVO */}
        {!viajeActivo ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-cyan-400 animate-pulse" />
                <h2 className="text-[10px] font-black uppercase text-slate-500">Radar de Pasajeros</h2>
              </div>
            </div>
            
            {solicitudesPendientes.length === 0 ? (
              <div className="bg-slate-950/40 border-2 border-dashed border-slate-800 p-12 rounded-[3rem] text-center">
                <Navigation size={24} className="text-slate-800 mx-auto mb-3 opacity-20" />
                <p className="text-slate-500 text-[10px] font-bold uppercase">Buscando señales...</p>
              </div>
            ) : (
              solicitudesPendientes.map(viaje => (
                <div key={viaje.id} className="bg-slate-950 border border-cyan-900/20 p-5 rounded-[2.5rem] shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[9px] font-black text-cyan-600 uppercase mb-1">Oferta Recibida</p>
                      <h3 className="text-4xl font-black italic">${viaje.valorOfertado}</h3>
                    </div>
                    <div className="bg-cyan-500 text-slate-950 p-2.5 rounded-2xl">
                      <DollarSign size={20} />
                    </div>
                  </div>
                  <div className="space-y-2 mb-6 text-slate-300">
                    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-2xl">
                      <MapPin size={12} className="text-cyan-500" />
                      <p className="text-[11px] font-bold truncate">{viaje.puntoRecogidaManual}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-2xl">
                      <Flag size={12} className="text-emerald-500" />
                      <p className="text-[11px] font-bold truncate">{viaje.puntoDestinoManual}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => aceptarViaje(viaje)}
                    className="w-full bg-cyan-500 text-slate-950 font-black py-4 rounded-[1.5rem] flex items-center justify-center gap-2 uppercase"
                  >
                    TOMAR SERVICIO <CheckCircle size={18} />
                  </button>
                </div>
              ))
            )}
          </section>
        ) : (
          <section className="bg-slate-950 border-2 border-cyan-500 p-6 rounded-[3rem] space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-[10px] bg-cyan-500 text-slate-950 px-3 py-1 rounded-full font-black">
                VIAJE EN CURSO
              </span>
            </div>
            <div className="bg-slate-900 p-5 rounded-[2.5rem] space-y-4">
                <div className="flex gap-3">
                    <div className="w-1 bg-cyan-500 rounded-full h-8"></div>
                    <div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase">Origen</p>
                        <p className="text-sm font-bold italic">{viajeActivo.puntoRecogidaManual}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="w-1 bg-emerald-500 rounded-full h-8"></div>
                    <div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase">Destino</p>
                        <p className="text-sm font-bold italic text-slate-400">{viajeActivo.puntoDestinoManual}</p>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-3">
              {viajeActivo.estado === 'aceptado' && (
                <button 
                  onClick={() => cambiarEstadoViaje('en_ruta')}
                  className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Play size={20} fill="currentColor"/> INICIAR RECORRIDO
                </button>
              )}
              {viajeActivo.estado === 'en_ruta' && (
                <button 
                  onClick={() => cambiarEstadoViaje('finalizado')}
                  className="w-full bg-green-500 text-slate-950 font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <Flag size={20} fill="currentColor"/> FINALIZAR VIAJE
                </button>
              )}
            </div>
          </section>
        )}
      </main>

      {/* NAVBAR INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 p-4 flex justify-around items-center">
          <button className="flex flex-col items-center text-cyan-500">
              <Navigation size={20} />
              <span className="text-[8px] font-bold mt-1 uppercase">Radar</span>
          </button>
          <button onClick={() => navigate('/ganancias')} className="flex flex-col items-center text-slate-600">
              <DollarSign size={20} />
              <span className="text-[8px] font-bold mt-1 uppercase">Cartera</span>
          </button>
      </nav>
    </div>
  );
};

export default MototaxiPanel;