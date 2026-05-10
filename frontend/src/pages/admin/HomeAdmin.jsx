// Versión Arquitectura: V1.0 - Dashboard CEO/Admin Ciber-Neo-Brutalista
import React from 'react';
import { Users, BarChart3, ShieldAlert, Settings } from 'lucide-react';

const HomeAdmin = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono p-6">
      {/* Header Brutalista */}
      <header className="border-b-8 border-yellow-400 pb-4 mb-8 flex justify-between items-center">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">
          CEO <span className="text-yellow-400">CONTROL</span>
        </h1>
        <div className="bg-yellow-400 text-black px-4 py-1 font-black shadow-[4px_4px_0px_0px_#fff]">
          V 2.0.26
        </div>
      </header>

      {/* Grid de Monitoreo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Conductores Online', val: '42', icon: <Users />, color: 'border-blue-500' },
          { label: 'Viajes Activos', val: '12', icon: <BarChart3 />, color: 'border-green-500' },
          { label: 'Alertas SOS', val: '0', icon: <ShieldAlert />, color: 'border-red-500' },
          { label: 'Balance Sistema', val: '$2.4M', icon: <Settings />, color: 'border-yellow-400' }
        ].map((item, i) => (
          <div key={i} className={`bg-zinc-900 border-4 ${item.color} p-6 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]`}>
            <div className="flex items-center gap-4 mb-4 text-zinc-400">
              {item.icon}
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{item.label}</span>
            </div>
            <div className="text-4xl font-black uppercase">{item.val}</div>
          </div>
        ))}
      </div>

      {/* Botonera de Acción Rápida */}
      <div className="mt-12 flex gap-4 overflow-x-auto pb-4">
        {['mototaxi', 'motocarga', 'despachador', 'intermunicipal'].map(role => (
          <button key={role} className="flex-none bg-white text-black px-6 py-4 border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0px_0px_#facc15] hover:-translate-y-1 transition-transform">
            Ver {role}s
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeAdmin;