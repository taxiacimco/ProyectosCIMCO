/**
 * PROYECTO: TAXIA CIMCO - Conductor Intermunicipal Panel
 * Misión: Interfaz de recepción de despachos y rastreo GPS.
 */
import React, { useEffect, useState, memo } from 'react';
import { 
  getFirestore, doc, onSnapshot, collection, query, where, limit 
} from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { 
  ShieldAlert, User, MapPin, Phone, LogOut, 
  Radio, MessageSquare, Send, X, Map as MapIcon, Clock
} from 'lucide-react';
import Swal from 'sweetalert2';

// Importaciones de servicios
import useDriverTracking from '../hooks/useDriverTracking';
import { viajeService } from '../services/viajeService';

const db = getFirestore();
const auth = getAuth();
const appId = 'taxiacimco-app';

const RadarFlota = memo(({ cooperativa }) => {
  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden h-40 relative flex items-center justify-center">
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-sm z-10">
        <Radio className="text-cyan-500 animate-ping mb-2" size={24} />
        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
          Escaneando Flota {cooperativa || 'CIMCO'}...
        </p>
      </div>
    </div>
  );
});

const ConductorInterPanel = () => {
  const [viajeActivo, setViajeActivo] = useState(null);
  const [userData, setUserData] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState("");

  // RASTREO GPS REACTIVO
  const { errorGps } = useDriverTracking({
    userId: auth.currentUser?.uid,
    rol: 'conductor_inter',
    isOnline: !!viajeActivo, 
    viajeId: viajeActivo?.id
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    // 1. Escucha de Perfil de Usuario (Ruta Sagrada)
    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', auth.currentUser.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });

    // 2. Escucha de Viaje Asignado (Unificado en 'rides' bajo la Ruta Sagrada)
    const qViaje = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'rides'),
      where('conductorId', '==', auth.currentUser.uid),
      where('estado', 'in', ['asignado', 'en_ruta', 'despachado']),
      limit(1)
    );

    const unsubViaje = onSnapshot(qViaje, (snap) => {
      if (!snap.empty) {
        setViajeActivo({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setViajeActivo(null);
      }
    });

    return () => {
      unsubUser();
      unsubViaje();
    };
  }, []);

  const finalizarRecorrido = async () => {
    if (!viajeActivo) return;
    try {
      // Llamada al servicio integrado (Backend Node/Java)
      const res = await viajeService.finalizarViaje(viajeActivo.id, 'conductor_inter');
      if (res && res.success) {
        Swal.fire({
          title: 'Viaje Completado',
          text: 'Comisión procesada correctamente.',
          icon: 'success',
          background: '#020617',
          color: '#10b981'
        });
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo finalizar el viaje', 'error');
      console.error("Error al finalizar viaje:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans">
      <header className="p-6 bg-slate-900 flex justify-between items-center border-b border-white/5 sticky top-0 z-30">
        <div>
          <h1 className="text-sm font-black uppercase tracking-widest italic text-cyan-500">Logística Intermunicipal</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
            Unidad: {userData?.placa || 'CIMCO-PRO'}
          </p>
        </div>
        <button onClick={() => signOut(auth)} className="p-2 bg-white/5 rounded-xl text-slate-400">
           <LogOut size={20} />
        </button>
      </header>

      <main className="p-6 space-y-6">
        {errorGps && (
          <div className="bg-rose-500/20 border border-rose-500/40 p-4 rounded-2xl text-[10px] font-black text-rose-500 uppercase flex items-center gap-3">
            <ShieldAlert size={16} />
            ⚠️ GPS: {errorGps}
          </div>
        )}

        {viajeActivo ? (
          <div className="mt-10 animate-in fade-in zoom-in duration-500">
            <div className="bg-cyan-500 text-slate-950 p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(6,182,212,0.3)]">
              <Radio className="animate-pulse mb-4" />
              <h2 className="text-2xl font-black italic leading-none mb-2">¡TIENES UN DESPACHO!</h2>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Ruta Intermunicipal</p>
              
              <div className="mt-8 space-y-4 border-t border-slate-950/10 pt-6">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-60">Destino</p>
                  <p className="text-lg font-bold">{viajeActivo.puntoDestinoManual || viajeActivo.puntoDestino}</p>
                </div>
                <button 
                  onClick={finalizarRecorrido}
                  className="w-full bg-slate-950 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
                >
                  Finalizar y Reportar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-20 flex flex-col items-center bg-slate-900/30 rounded-[3rem] border border-dashed border-white/5 mt-10">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-white/5">
              <Clock className="text-slate-700 animate-spin-slow" size={32} />
            </div>
            <p className="text-[11px] text-slate-600 font-black uppercase italic tracking-[0.2em]">
              Esperando despacho...
            </p>
          </div>
        )}

        <div className="pt-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Radar de Flota</h3>
          <RadarFlota cooperativa={userData?.cooperativa} />
        </div>
      </main>
    </div>
  );
};

export default ConductorInterPanel;