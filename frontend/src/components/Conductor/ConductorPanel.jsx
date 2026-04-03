import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously,
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { CheckCircle, MapPin, Navigation, Phone, User, Bell, Settings, Wallet, Clock, AlertTriangle } from 'lucide-react';

// ✅ IMPORTACIÓN DEL NUEVO COMPONENTE QUIRÚRGICO
import TarjetaViajeConductor from './TarjetaViajeConductor';

// --- CONFIGURACIÓN E INICIALIZACIÓN ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

// --- CONTEXTO DE AUTENTICACIÓN INTEGRADO ---
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      if (u) {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', u.uid);
        onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUser({ ...u, ...snap.data() });
          } else {
            setUser({ ...u, role: 'mototaxi', displayName: 'Conductor Prueba' }); 
          }
          setLoading(false);
        });
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// --- COMPONENTE PRINCIPAL DEL PANEL ---
const ConductorPanelContent = () => {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [viajeActual, setViajeActual] = useState(null);
  const [estaDisponible, setEstaDisponible] = useState(false);

  // 1. Escuchar solicitudes disponibles basadas en el rol del conductor
  useEffect(() => {
    if (!user || viajeActual || !estaDisponible) {
      setSolicitudes([]);
      return;
    }

    // 🛠️ ACTUALIZACIÓN DE COLECCIÓN (viajes -> rides)
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'rides'),
      where('status', '==', 'searching'), // Adaptado al trigger backend
      where('tipoVehiculo', '==', user.role || 'mototaxi')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSolicitudes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Error Firestore:", err));

    return () => unsubscribe();
  }, [user, viajeActual, estaDisponible]);

  // 2. Lógica post-aceptación (Manejada por la Tarjeta)
  const handleViajeAceptado = async (viajeAceptado) => {
    try {
      // Solo actualizamos el estado local (la tarjeta ya hizo el updateDoc vía backend)
      const conductorRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid);
      await updateDoc(conductorRef, {
        estadoFisico: "en_viaje", // Cambio semántico
        viajeActualId: viajeAceptado.id
      });

      setViajeActual(viajeAceptado);
      setSolicitudes([]);
      
    } catch (error) {
      console.error("Error al setear estado local de viaje:", error);
    }
  };

  const renderCabecera = () => (
    <div className="bg-slate-900 border-b border-white/5 p-4 sticky top-0 z-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center border border-white/10 shadow-lg">
            <User className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm leading-tight">{user?.displayName || 'Conductor CIMCO'}</h2>
            <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">{user?.role || 'Cargando...'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-3 bg-white/5 rounded-xl text-slate-400"><Bell size={20} /></button>
          <button className="p-3 bg-white/5 rounded-xl text-slate-400"><Settings size={20} /></button>
        </div>
      </div>

      <button 
        onClick={() => setEstaDisponible(!estaDisponible)}
        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[11px] tracking-[0.2em] uppercase ${
          estaDisponible 
          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' 
          : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${estaDisponible ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
        {estaDisponible ? 'En línea / Activo' : 'Desconectado'}
      </button>
    </div>
  );

  if (viajeActual) {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-6">
        <div className="bg-slate-900 rounded-[2.5rem] border border-cyan-500/30 p-6 shadow-2xl space-y-6">
          <div className="flex justify-between items-center">
            <span className="bg-emerald-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Viaje en Curso</span>
            <button className="p-3 bg-white/5 rounded-full text-emerald-500"><Phone size={20} /></button>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <div className="w-0.5 h-12 bg-slate-800 my-1"></div>
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              </div>
              <div className="flex flex-col justify-between py-1">
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase">Punto de Recogida</p>
                  <p className="text-sm font-bold">{viajeActual.puntoRecogidaManual || viajeActual.puntoA}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase">Destino Final</p>
                  <p className="text-sm font-bold">{viajeActual.puntoDestinoManual || viajeActual.puntoB || 'Pendiente'}</p>
                </div>
              </div>
            </div>
          </div>

          <button className="w-full bg-emerald-600 py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20">
            <Navigation size={18} /> Iniciar GPS
          </button>
          
          <button 
            onClick={() => setViajeActual(null)}
            className="w-full bg-white/5 py-4 rounded-2xl font-bold uppercase text-[10px] text-slate-400 active:scale-95 transition-transform"
          >
            Finalizar Servicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 pb-24 font-sans">
      {renderCabecera()}
      
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-white/5 border border-white/5 p-4 rounded-[2rem] flex flex-col items-center">
          <Wallet className="text-cyan-500 mb-1" size={20} />
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Billetera</span>
          <span className="text-xl font-black text-white">${user?.saldo?.toLocaleString() || '0'}</span>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-[2rem] flex flex-col items-center">
          <Clock className="text-amber-500 mb-1" size={20} />
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Viajes Hoy</span>
          <span className="text-xl font-black text-white">{user?.serviciosLiquidados || 0}</span>
        </div>
      </div>

      <main className="p-4 space-y-4">
        {!user?.isVerified && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl flex items-start gap-3">
            <AlertTriangle className="text-amber-500 shrink-0" size={20} />
            <div>
              <p className="text-xs font-bold text-amber-200 uppercase">Documentos Pendientes</p>
              <p className="text-[10px] text-amber-500/80 leading-tight mt-1">Sube tu documentación legal para activar el radar de viajes.</p>
            </div>
          </div>
        )}

        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Radar de Solicitudes</h3>
        
        {solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 opacity-20">
            <Navigation className="animate-pulse mb-4 text-cyan-500" size={48} />
            <p className="text-[10px] uppercase font-black tracking-[0.3em]">{estaDisponible ? 'Buscando pasajeros...' : 'Radar Apagado'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 🛡️ INYECCIÓN DE TARJETAS QUIRÚRGICAS */}
            {solicitudes.map(viaje => (
              <TarjetaViajeConductor 
                key={viaje.id} 
                viaje={viaje} 
                conductorId={user.uid} 
                onAceptado={handleViajeAceptado} 
              />
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 px-8 py-4 flex justify-between items-center z-30">
        <Navigation size={22} className="text-cyan-500" />
        <Clock size={22} className="text-slate-600" />
        <Wallet size={22} className="text-slate-600" />
        <User size={22} className="text-slate-600" />
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ConductorPanelContent />
    </AuthProvider>
  );
}