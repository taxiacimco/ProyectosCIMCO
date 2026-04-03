import React from 'react';
import { ShieldAlert, RefreshCw, SignalHighOff } from 'lucide-react';

const ModalGpsInactivo = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/80 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-[2.5rem] p-8 text-center shadow-2xl shadow-rose-500/20">
        
        {/* Icono de Alerta Animado */}
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping"></div>
          <div className="relative flex items-center justify-center w-full h-full bg-rose-500 rounded-full text-white shadow-lg shadow-rose-500/40">
            <SignalHighOff size={32} strokeWidth={2.5} />
          </div>
        </div>

        <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">
          ¡GPS Desconectado!
        </h2>
        
        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
          El sistema ha perdido tu rastro. <br /> 
          <span className="text-rose-400 font-bold">No recibirás nuevos servicios</span> hasta que reactives tu ubicación.
        </p>

        <div className="space-y-3">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-rose-500/20 uppercase text-xs tracking-widest"
          >
            <RefreshCw size={18} /> Reintentar Conexión
          </button>
          
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Mantén la app abierta para mejor señal
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModalGpsInactivo;