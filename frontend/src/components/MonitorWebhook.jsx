import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, Clock, RefreshCw, Terminal } from 'lucide-react';

/**
 * MonitorWebhook - Interfaz de monitoreo de eventos de red y pagos
 * Ubicación: frontend/src/components/MonitorWebhook.jsx
 */
const MonitorWebhook = () => {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    exitos: 0,
    fallidos: 0,
    total: 0
  });

  // Simulación de recepción de datos (Luego conectaremos con tu backend Java)
  const simulateEvent = () => {
    const isSuccess = Math.random() > 0.2;
    const newEvent = {
      id: Date.now(),
      tipo: Math.random() > 0.5 ? 'PAGO_NEQUI' : 'VIAJE_ASIGNADO',
      status: isSuccess ? 'success' : 'error',
      timestamp: new Date().toLocaleTimeString(),
      payload: JSON.stringify({ reference: `CIMCO-${Math.floor(Math.random() * 1000)}`, amount: 15000 }),
    };

    setEventos(prev => [newEvent, ...prev].slice(0, 10)); // Solo últimos 10
    setStats(prev => ({
      total: prev.total + 1,
      exitos: prev.exitos + (isSuccess ? 1 : 0),
      fallidos: prev.fallidos + (isSuccess ? 0 : 1)
    }));
  };

  useEffect(() => {
    const interval = setInterval(simulateEvent, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER DE ESTADO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-lg">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm font-bold uppercase">Total Eventos</span>
            <Activity className="text-blue-500 w-5 h-5" />
          </div>
          <p className="text-2xl font-black mt-1">{stats.total}</p>
        </div>
        
        <div className="bg-slate-800 border-l-4 border-green-500 p-4 rounded-r-lg shadow-lg">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm font-bold uppercase">Éxitos</span>
            <CheckCircle className="text-green-500 w-5 h-5" />
          </div>
          <p className="text-2xl font-black mt-1 text-green-400">{stats.exitos}</p>
        </div>

        <div className="bg-slate-800 border-l-4 border-magenta-500 p-4 rounded-r-lg shadow-lg">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm font-bold uppercase">Errores</span>
            <XCircle className="text-magenta-500 w-5 h-5" />
          </div>
          <p className="text-2xl font-black mt-1 text-magenta-400">{stats.fallidos}</p>
        </div>
      </div>

      {/* TERMINAL DE LOGS */}
      <div className="bg-black rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-magenta-400" />
            <span className="text-xs font-mono text-slate-300 uppercase tracking-widest">Live Webhook Monitor</span>
          </div>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
          </div>
        </div>

        <div className="p-4 font-mono text-sm h-[400px] overflow-y-auto space-y-2">
          {eventos.length === 0 && (
            <div className="text-slate-600 animate-pulse italic">Esperando tráfico de red...</div>
          )}
          {eventos.map((ev) => (
            <div key={ev.id} className={`flex items-start gap-3 border-b border-white/5 pb-2 animate-in slide-in-from-left duration-300`}>
              <span className="text-slate-500 whitespace-nowrap">[{ev.timestamp}]</span>
              <span className={`font-bold ${ev.status === 'success' ? 'text-green-400' : 'text-magenta-400'}`}>
                {ev.tipo}
              </span>
              <span className="text-blue-300 truncate opacity-80">{ev.payload}</span>
              <span className={`ml-auto px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                ev.status === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 'bg-magenta-500/10 text-magenta-500 border border-magenta-500/30'
              }`}>
                {ev.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ACCIONES */}
      <div className="flex justify-end gap-4">
        <button 
          onClick={() => setEventos([])}
          className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3 h-3" /> LIMPIAR CONSOLA
        </button>
      </div>
    </div>
  );
};

export default MonitorWebhook;