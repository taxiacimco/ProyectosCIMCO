import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { MapPin, Navigation, Clock, DollarSign, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { notificarExito, notificarError } from '../utils/notificaciones';
import viajeService from '../services/viajeService';

const appId = 'taxiacimco-app';

const SolicitudViaje = ({ userLocation, onViajeAceptado }) => {
  const [loading, setLoading] = useState(false);
  const [paso, setPaso] = useState('inicio'); 
  const [detalles, setDetalles] = useState({
    destino: '',
    referencia: '',
    valor: '',
    tipoVehiculo: 'mototaxi'
  });
  const [viajeId, setViajeId] = useState(null);

  // Listener para cuando el backend asigne un conductor
  useEffect(() => {
    if (!viajeId) return;

    const unsub = onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', 'rides', viajeId), 
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().status === 'accepted') {
          setPaso('aceptado');
          notificarExito("¡Conductor en camino!");
          if (onViajeAceptado) onViajeAceptado(docSnap.data());
        }
      }
    );

    return () => unsub();
  }, [viajeId, onViajeAceptado]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userLocation) {
      notificarError("Esperando señal GPS...");
      return;
    }

    setLoading(true);
    try {
      const result = await viajeService.solicitarViajeFirestore({
        ...detalles,
        ubicacionRecogida: userLocation // { lat, lng }
      });

      if (result.success) {
        setViajeId(result.id);
        setPaso('buscando');
        notificarExito("Buscando conductores cerca...");
      }
    } catch (error) {
      notificarError("No se pudo solicitar el viaje");
    } finally {
      setLoading(false);
    }
  };

  if (paso === 'buscando') {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-cyan-500/30 text-center">
        <Loader2 className="mx-auto text-cyan-400 animate-spin mb-4" size={48} />
        <h3 className="text-xl font-black text-white italic">ESCANEO DE RADAR...</h3>
        <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest">Localizando conductores en La Jagua</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5">
      <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-white/5">
        <MapPin className="text-cyan-500" size={20} />
        <input 
          type="text"
          required
          placeholder="¿A dónde vas?"
          className="bg-transparent w-full text-sm text-white outline-none"
          value={detalles.destino}
          onChange={(e) => setDetalles({...detalles, destino: e.target.value})}
        />
      </div>

      <input 
        type="text"
        placeholder="Referencia (Ej: Casa de rejas blancas)"
        className="w-full bg-slate-950 border border-white/10 p-4 rounded-2xl text-xs text-slate-400 focus:border-cyan-500 outline-none"
        value={detalles.referencia}
        onChange={(e) => setDetalles({...detalles, referencia: e.target.value})}
      />

      <div className="relative">
        <DollarSign className="absolute left-4 top-4 text-emerald-500" size={18} />
        <input 
          type="number"
          required
          placeholder="Valor ofrecido"
          className="w-full bg-slate-950 border border-white/10 p-4 pl-12 rounded-2xl text-lg font-black text-emerald-400 focus:border-emerald-500 outline-none"
          value={detalles.valor}
          onChange={(e) => setDetalles({...detalles, valor: e.target.value})}
        />
      </div>

      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase italic tracking-tighter"
      >
        {loading ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Solicitar Ahora</>}
      </button>
    </form>
  );
};

export default SolicitudViaje;