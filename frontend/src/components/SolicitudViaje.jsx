// Versión Arquitectura: V3.5 - UI Neobrutalista con Selector de Servicio Híbrido
/**
 * frontend/src/components/SolicitudViaje.jsx
 */
import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { MapPin, Send, Loader2, Bike, Package, Users, Bus } from 'lucide-react';
import { notificarExito, notificarError } from '../utils/notificaciones';
import viajeService from '../services/viajeService';

const appId = 'taxiacimco-app';

const SolicitudViaje = ({ userLocation, onViajeAceptado }) => {
  const [loading, setLoading] = useState(false);
  const [paso, setPaso] = useState('inicio'); 
  const [tipoServicio, setTipoServicio] = useState('mototaxi');
  const [detalles, setDetalles] = useState({
    destino: '',
    referencia: '',
    valor: ''
  });
  const [viajeId, setViajeId] = useState(null);

  const servicios = [
    { id: 'mototaxi', nombre: 'Mototaxi', icon: <Bike size={24}/> },
    { id: 'motoparrillero', nombre: 'Parrillero', icon: <Users size={24}/> },
    { id: 'motocarga', nombre: 'Motocarga', icon: <Package size={24}/> },
    { id: 'intermunicipal', nombre: 'Inter-M', icon: <Bus size={24}/> },
  ];

  useEffect(() => {
    if (!viajeId) return;
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'rides', viajeId), (docSnap) => {
      if (docSnap.exists() && docSnap.data().status === 'accepted') {
        setPaso('aceptado');
        notificarExito("¡Conductor en camino!");
        if (onViajeAceptado) onViajeAceptado(docSnap.data());
      }
    });
    return () => unsub();
  }, [viajeId, onViajeAceptado]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userLocation) return notificarError("Esperando señal GPS...");

    setLoading(true);
    try {
      const result = await viajeService.solicitarViajeFirestore({
        ...detalles,
        tipoVehiculo: tipoServicio,
        ubicacionRecogida: userLocation
      });
      if (result.success) {
        setViajeId(result.id);
        setPaso('buscando');
      }
    } catch (error) {
      notificarError("Error en la solicitud");
    } finally {
      setLoading(false);
    }
  };

  if (paso === 'buscando') {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-cyan-500/30 text-center">
        <Loader2 className="mx-auto text-cyan-400 animate-spin mb-4" size={48} />
        <h3 className="text-xl font-black text-white italic uppercase">Buscando {tipoServicio}...</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5">
      {/* Selector de Servicio */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {servicios.map((s) => (
          <button 
            key={s.id}
            onClick={() => setTipoServicio(s.id)}
            className={`flex-shrink-0 p-4 rounded-2xl flex flex-col items-center min-w-[85px] transition-all ${
              tipoServicio === s.id ? 'bg-cyan-500 text-slate-950 scale-105 shadow-lg shadow-cyan-500/20' : 'bg-slate-950 text-slate-500 border border-white/5'
            }`}
          >
            {s.icon}
            <span className="text-[10px] font-black mt-2 uppercase tracking-tighter">{s.nombre}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-white/5">
          <MapPin className="text-cyan-500" size={20} />
          <input 
            type="text" required placeholder="¿A dónde vas?"
            className="bg-transparent w-full text-sm text-white outline-none"
            value={detalles.destino}
            onChange={(e) => setDetalles({...detalles, destino: e.target.value})}
          />
        </div>

        <button 
          type="submit" disabled={loading}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase italic"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Solicitar Viaje"}
        </button>
      </form>
    </div>
  );
};

export default SolicitudViaje;