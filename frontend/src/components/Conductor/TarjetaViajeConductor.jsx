import React, { useState } from 'react';
import { Navigation, DollarSign, User, AlertCircle, Wallet } from 'lucide-react';
import viajeService from '../../services/viajeService';
import { notificarError, notificarExito } from '../../utils/notificaciones';

const TarjetaViajeConductor = ({ viaje, conductorId, onAceptado }) => {
  const [loading, setLoading] = useState(false);
  const [errorBancario, setErrorBancario] = useState(false);

  const handleAceptar = async () => {
    setLoading(true);
    setErrorBancario(false);

    try {
      const res = await viajeService.aceptarViaje(viaje.id, conductorId);

      if (res.success) {
        notificarExito("Viaje asignado. ¡En marcha!");
        if (onAceptado) onAceptado(viaje);
      } else {
        // Si el servicio nos devuelve el mensaje de saldo
        if (res.message.includes("saldo") || res.message.includes("recargar")) {
          setErrorBancario(true);
          // Opcional: Sonido de error o vibración Haptic
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
        }
        notificarError(res.message);
      }
    } catch (err) {
      notificarError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative overflow-hidden transition-all duration-300 bg-slate-900 border-2 
      ${errorBancario ? 'border-red-600 animate-shake shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'border-white/5 shadow-xl'} 
      p-5 rounded-[2rem] group`}
    >
      {/* Indicador de Error de Saldo (Overlay) */}
      {errorBancario && (
        <div className="absolute inset-0 bg-red-600/10 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center z-10 animate-in fade-in">
          <AlertCircle className="text-red-500 mb-2" size={32} />
          <p className="text-[10px] font-black text-white uppercase leading-tight">Acceso Denegado</p>
          <p className="text-[8px] text-red-200 uppercase font-bold mt-1">Saldo menor a -$5,000</p>
          <button 
            onClick={() => window.location.href = '/billetera'} 
            className="mt-3 bg-white text-red-600 text-[9px] font-black px-4 py-2 rounded-full flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Wallet size={12} /> RECARGAR AHORA
          </button>
          <button 
            onClick={() => setErrorBancario(false)}
            className="mt-2 text-[8px] text-white/50 uppercase font-bold hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Contenido de la Tarjeta */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
          <Navigation size={12} className="text-cyan-400" />
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-tighter">A 1.2 KM de ti</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tarifa</p>
          <p className="text-xl font-black text-emerald-400 italic">${viaje.tarifa}</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div>
          <p className="text-[9px] text-slate-500 uppercase font-black mb-1 flex items-center gap-1">
            <User size={10} /> Pasajero
          </p>
          <p className="text-sm text-white font-bold">{viaje.clienteNombre}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-500 uppercase font-black mb-1 flex items-center gap-1">
            <Navigation size={10} /> Destino
          </p>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">{viaje.puntoRecogidaManual}</p>
        </div>
      </div>

      <button
        onClick={handleAceptar}
        disabled={loading || errorBancario}
        className={`w-full py-4 rounded-2xl font-black uppercase tracking-tighter italic flex items-center justify-center gap-2 transition-all
          ${loading ? 'bg-slate-800 text-slate-500' : 'bg-white text-black hover:bg-cyan-400 active:scale-95 shadow-lg shadow-white/5'}
        `}
      >
        {loading ? <span className="animate-spin text-lg">🌀</span> : "TOMAR SERVICIO"}
      </button>

      {/* Animación Shake en CSS (Tailwind Config) */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default TarjetaViajeConductor;