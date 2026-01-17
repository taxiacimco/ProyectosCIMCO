import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  ChevronLeft, 
  Calendar, 
  CreditCard, 
  MapPin, 
  Clock, 
  TrendingUp,
  History,
  Star,
  CheckCircle2,
  Loader2
} from 'lucide-react';

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

const PasajeroHistorial = ({ onBack }) => {
  const [user, setUser] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMes, setTotalMes] = useState(0);

  // Autenticación (Regla 3)
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Obtención de datos (Regla 1 y 2)
  useEffect(() => {
    if (!user) return;

    const obtenerHistorial = async () => {
      try {
        // Consultamos la colección siguiendo el path estricto (Regla 1)
        const q = query(
          collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados'),
          where("clienteUid", "==", user.uid)
        );

        // Obtenemos los documentos
        const querySnapshot = await getDocs(q);
        
        // Procesamos y filtramos en memoria (Regla 2: No filtros complejos en Firestore)
        const viajes = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(v => v.estado === 'finalizado')
          .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        // Calcular total
        const acumulado = viajes.reduce((acc, current) => {
          return acc + (Number(current.valorOfertado) || 0);
        }, 0);

        setHistorial(viajes);
        setTotalMes(acumulado);
      } catch (error) {
        console.error("Error al obtener historial:", error);
      } finally {
        setLoading(false);
      }
    };

    obtenerHistorial();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-cyan-400">
        <Loader2 className="animate-spin" size={40} />
        <span className="font-black italic text-xs tracking-widest uppercase">Consultando Archivos...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans max-w-md mx-auto shadow-2xl">
      {/* HEADER */}
      <header className="p-6 bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 flex items-center gap-4 sticky top-0 z-50">
        <button 
          onClick={onBack} 
          className="p-2 bg-slate-800 rounded-xl text-cyan-400 active:scale-90 transition-transform"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">Mis Viajes</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Registro de Actividad</p>
        </div>
      </header>

      <main className="flex-1 p-5 space-y-6 overflow-y-auto">
        
        {/* RESUMEN DE GASTOS ESTILO CARD BANCARIA */}
        <div className="relative overflow-hidden bg-gradient-to-br from-cyan-600 to-blue-800 p-7 rounded-[2.5rem] shadow-2xl shadow-cyan-900/20 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <TrendingUp size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={14} className="text-cyan-200" />
              <p className="text-cyan-100 text-[10px] font-black uppercase tracking-[0.2em]">Inversión Total</p>
            </div>
            <h2 className="text-5xl font-black italic tracking-tighter text-white">
              ${totalMes.toLocaleString()}
            </h2>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                <History size={14} className="text-cyan-300" />
                <span className="text-xs font-bold text-white">{historial.length} Servicios</span>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-cyan-200 font-black uppercase">Estado Cuenta</p>
                <p className="text-xs font-bold text-white">Al día</p>
              </div>
            </div>
          </div>
        </div>

        {/* LISTADO DE VIAJES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Historial Reciente</h3>
            <div className="h-px bg-slate-800 flex-1 ml-4"></div>
          </div>

          {historial.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-800">
              <History size={48} className="mx-auto text-slate-800 mb-4" />
              <p className="text-slate-500 font-bold text-sm">Aún no has finalizado viajes.</p>
              <button 
                onClick={onBack}
                className="mt-4 text-cyan-500 text-[10px] font-black uppercase underline tracking-widest"
              >
                Solicitar mi primer viaje
              </button>
            </div>
          ) : (
            <div className="space-y-3 pb-10">
              {historial.map((viaje) => (
                <div key={viaje.id} className="bg-slate-900 border border-slate-800/50 p-5 rounded-[2rem] hover:border-cyan-500/30 transition-all active:scale-[0.98]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-800 p-2.5 rounded-2xl">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-black text-white text-sm uppercase italic tracking-tighter">
                          {viaje.servicioSolicitado}
                        </p>
                        <div className="flex items-center gap-2 text-slate-500 text-[9px] font-bold mt-0.5">
                          <Calendar size={10} />
                          {viaje.createdAt?.toDate().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-cyan-400 text-lg leading-none">${viaje.valorOfertado}</p>
                      <p className="text-[8px] text-emerald-500 font-black uppercase mt-1 tracking-tighter">Completado</p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-800/50 pt-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-slate-600" />
                      <p className="text-[10px] text-slate-400 truncate"><span className="text-slate-200">De:</span> {viaje.puntoRecogidaManual}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-slate-600" />
                        <p className="text-[10px] text-slate-400"><span className="text-slate-200">Placa:</span> {viaje.conductorPlaca || 'Verificado'}</p>
                      </div>
                      <div className="flex gap-0.5 text-amber-500">
                         {[...Array(5)].map((_, i) => <Star key={i} size={8} fill="currentColor" />)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <style>{`
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default PasajeroHistorial;