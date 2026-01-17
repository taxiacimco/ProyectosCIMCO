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
import { 
  getAuth, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  Truck, 
  LogOut, 
  Play, 
  CheckCircle, 
  Package, 
  Wallet,
  MapPin,
  Flag,
  AlertTriangle,
  Loader2
} from 'lucide-react';

// Configuración de Firebase - Se asume que las variables globales están disponibles en el entorno
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const MotocargaPanel = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [viajeActivo, setViajeActivo] = useState(null);
  const [solicitudesCarga, setSolicitudesCarga] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

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

  // 2. Carga de Datos de Usuario y Radar
  useEffect(() => {
    if (!user) return;

    // Datos del perfil (Ruta estricta según Regla 1)
    const unsubUser = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile'), (snap) => {
      if (snap.exists()) {
        setUserData(snap.data());
      } else {
        // Inicializar si no existe
        setUserData({ balance: 0, displayName: "Operador de Carga" });
      }
      setLoading(false);
    }, (err) => console.error("Error perfil:", err));

    // Radar de Cargas (Servicio: Motocarga)
    const qRadar = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
      where("estado", "==", "pendiente")
    );

    const unsubRadar = onSnapshot(qRadar, (snap) => {
      const docs = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.servicioSolicitado === "Motocarga") {
          docs.push({ id: d.id, ...data });
        }
      });
      
      if (docs.length > solicitudesCarga.length && solicitudesCarga.length > 0) {
        ejecutarAlertaCarga();
      }
      setSolicitudesCarga(docs);
    }, (err) => console.error("Error radar:", err));

    // Viaje Activo
    const qActivo = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
      where("conductorId", "==", user.uid)
    );

    const unsubActivo = onSnapshot(qActivo, (snap) => {
      let activo = null;
      snap.forEach(d => {
        const data = d.data();
        if (["aceptado", "en_ruta"].includes(data.estado)) {
          activo = { id: d.id, ...data };
        }
      });
      setViajeActivo(activo);
    }, (err) => console.error("Error activo:", err));

    return () => {
      unsubUser();
      unsubRadar();
      unsubActivo();
    };
  }, [user]);

  // 3. Inicialización Manual de Leaflet (para evitar errores de importación)
  useEffect(() => {
    if (loading || !mapContainer.current || mapInstance.current) return;

    const loadLeaflet = () => {
        if (window.L) {
            const L = window.L;
            mapInstance.current = L.map(mapContainer.current, { 
                zoomControl: false,
                attributionControl: false 
            }).setView([9.566, -73.334], 14);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
            
            L.circleMarker([9.566, -73.334], {
                radius: 8,
                fillColor: "#22c55e",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(mapInstance.current);
        } else {
            // Reintentar si aún no carga el script global
            setTimeout(loadLeaflet, 500);
        }
    };

    if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = loadLeaflet;
        document.head.appendChild(script);
    } else {
        loadLeaflet();
    }

    return () => {
        if (mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
        }
    };
  }, [loading]);

  const ejecutarAlertaCarga = () => {
    if ("vibrate" in navigator) navigator.vibrate([300, 100, 300]);
    audioRef.current.play().catch(() => {});
  };

  const aceptarFlete = async (viaje) => {
    if (!user) return;
    const COBRO_FIJO = 500;
    const saldoActual = userData?.balance || 0;

    if (saldoActual < COBRO_FIJO) {
      alert(`⚠️ Saldo insuficiente. Necesitas $${COBRO_FIJO} en tu billetera.`);
      return;
    }

    try {
      const viajeRef = doc(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados', viaje.id);
      await updateDoc(viajeRef, {
        conductorId: user.uid,
        conductorNombre: userData.displayName || "Operador CIMCO",
        estado: 'aceptado',
        comisionCobrada: COBRO_FIJO,
        fechaAceptado: serverTimestamp()
      });

      const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile');
      await updateDoc(userRef, {
        balance: increment(-COBRO_FIJO)
      });
    } catch (error) {
      console.error("Error aceptando:", error);
    }
  };

  const actualizarEstado = async (nuevoEstado) => {
    if (!viajeActivo) return;
    try {
        const viajeRef = doc(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados', viajeActivo.id);
        await updateDoc(viajeRef, { 
            estado: nuevoEstado,
            [`fecha_${nuevoEstado}`]: serverTimestamp() 
        });
        if(nuevoEstado === 'finalizado') alert("🚚 ¡Flete entregado!");
    } catch (e) {
        console.error("Error actualización:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-green-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-black italic tracking-widest">SISTEMA LOGÍSTICO CIMCO...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans overflow-x-hidden">
      {/* HEADER LOGÍSTICO */}
      <header className="p-4 bg-slate-900 border-b border-green-900/30 flex justify-between items-center sticky top-0 z-[1001] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-green-600 p-2 rounded-lg">
            <Truck size={24} className="text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-black text-green-500 italic tracking-tighter leading-none">CIMCO CARGA</h1>
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Panel Operativo</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-green-900/20 text-right">
             <p className="text-[7px] text-slate-500 font-black uppercase">Saldo</p>
             <p className="text-sm font-black text-green-400">
               ${(userData?.balance || 0).toLocaleString()}
             </p>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-900/10 text-red-500 rounded-xl border border-red-900/20">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* MAPA */}
        <div className="relative">
            <div ref={mapContainer} className="h-[22vh] w-full rounded-[2.5rem] border-2 border-green-900/20 z-0 overflow-hidden"></div>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400]">
                <div className="px-4 py-1.5 rounded-full bg-slate-900/90 border border-green-500/30 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                    <span className="text-[8px] font-black text-green-500 uppercase italic">GPS Online</span>
                </div>
            </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {!viajeActivo ? (
          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Radar de Fletes</h2>
            
            {solicitudesCarga.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 rounded-[3rem] border-2 border-dashed border-slate-800 flex flex-col items-center">
                <AlertTriangle size={32} className="text-slate-800 mb-3" />
                <p className="text-slate-600 text-sm italic font-bold">Esperando nuevas cargas...</p>
              </div>
            ) : (
              solicitudesCarga.map(flete => (
                <div key={flete.id} className="bg-slate-900 border border-green-900/20 p-6 rounded-[2.5rem] shadow-xl">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <p className="text-[10px] font-black text-green-600 uppercase">Oferta</p>
                      <h3 className="text-4xl font-black text-white italic">${flete.valorOfertado}</h3>
                    </div>
                    <Truck className="text-green-500/20" size={40} />
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                       <MapPin size={16} className="text-green-500" />
                       <p className="text-xs font-bold text-slate-300 italic truncate">{flete.puntoRecogidaManual}</p>
                    </div>
                    <div className="flex gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                       <Flag size={16} className="text-red-500" />
                       <p className="text-xs font-bold text-slate-300 italic truncate">{flete.puntoDestinoManual}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => aceptarFlete(flete)}
                    className="w-full bg-green-500 text-slate-950 font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
                  >
                    ACEPTAR CARGA (-$500)
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          /* VIAJE ACTIVO */
          <div className="bg-slate-900 border-2 border-green-500 p-6 rounded-[3rem] shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
               <span className="text-[10px] font-black text-green-500 uppercase tracking-widest italic">Carga en Curso</span>
               <p className="text-[9px] font-mono text-slate-600 italic">LOG: {viajeActivo.id.slice(-6).toUpperCase()}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Cobro Cliente</p>
                  <p className="text-xl font-black text-green-400">${viajeActivo.valorOfertado}</p>
               </div>
               <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[8px] font-bold text-slate-500 uppercase">CIMCO Fee</p>
                  <p className="text-xl font-black text-slate-400">$500</p>
               </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <p className="text-[10px] text-green-500 font-bold">📍 ORIGEN: {viajeActivo.puntoRecogidaManual}</p>
                <p className="text-[10px] text-red-500 font-bold">🎯 DESTINO: {viajeActivo.puntoDestinoManual}</p>
            </div>

            <div className="flex flex-col gap-3">
              {viajeActivo.estado === 'aceptado' && (
                <button 
                  onClick={() => actualizarEstado('en_ruta')}
                  className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  <Play size={18} fill="currentColor"/> INICIAR RUTA
                </button>
              )}
              {viajeActivo.estado === 'en_ruta' && (
                <button 
                  onClick={() => actualizarEstado('finalizado')}
                  className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} fill="currentColor"/> FINALIZAR ENTREGA
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* NAV */}
      <nav className="fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 p-4 flex justify-around items-center z-[1001]">
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <Wallet size={20} />
          <span className="text-[8px] font-black uppercase">Billetera</span>
        </button>
        <div className="bg-green-600 p-3 rounded-full -mt-10 border-4 border-slate-950 shadow-lg">
          <Truck size={24} className="text-slate-950" />
        </div>
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <Package size={20} />
          <span className="text-[8px] font-black uppercase">Historial</span>
        </button>
      </nav>
    </div>
  );
};

export default MotocargaPanel;