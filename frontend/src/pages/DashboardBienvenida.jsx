import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Wallet, 
  ShieldCheck, 
  Clock, 
  LogOut, 
  ChevronRight, 
  Navigation, 
  Truck, 
  LayoutDashboard,
  ShieldAlert,
  Bike
} from 'lucide-react';

const DashboardBienvenida = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /**
   * 🛠️ CONFIGURACIÓN DE RUTAS UNIFICADA
   * Sincronizada con el nuevo ConductorPanel.jsx
   */
  const getRoleConfig = () => {
    const role = user?.role?.toLowerCase();
    
    // Agrupamos conductores urbanos para el nuevo panel unificado
    if (['mototaxi', 'motocarga', 'motoparrillero'].includes(role)) {
      return { 
        label: `Unidad ${role.charAt(0).toUpperCase() + role.slice(1)}`, 
        color: role === 'mototaxi' ? 'bg-yellow-500' : role === 'motocarga' ? 'bg-orange-500' : 'bg-indigo-500', 
        icon: role === 'motocarga' ? <Truck size={20}/> : <Bike size={20}/>, 
        path: '/driver/panel' // <-- RUTA UNIFICADA
      };
    }

    switch (role) {
      case 'admin':
      case 'ceo':
        return { label: 'Administración Central', color: 'bg-red-600', icon: <LayoutDashboard size={20}/>, path: '/admin/dashboard' };
      case 'conductorinter':
        return { label: 'Línea Intermunicipal', color: 'bg-purple-600', icon: <Navigation size={20}/>, path: '/inter/conductor' };
      case 'despachadorinter':
        return { label: 'Despacho Intermunicipal', color: 'bg-blue-600', icon: <User size={20}/>, path: '/inter/despachador' };
      default:
        return { label: 'Pasajero TaxiA', color: 'bg-cyan-600', icon: <User size={20}/>, path: '/pasajero/panel' };
    }
  };

  const roleConfig = getRoleConfig();
  // El saldo y la verificación vienen del context o del objeto user
  const saldo = user?.saldoWallet || 0;
  const verificado = user?.documentacion?.estado === 'APROBADO' || user?.verificado;

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[3rem] overflow-hidden border border-white/5 relative">
        
        {/* Glow de fondo dinámico basado en el rol */}
        <div className={`absolute top-0 left-0 w-full h-40 ${roleConfig.color} opacity-10 blur-[100px] -z-10`}></div>

        {/* Cabecera de Identidad */}
        <div className="p-10 pb-6 text-white relative">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className={`absolute inset-0 ${roleConfig.color} blur-xl opacity-30 rounded-full`}></div>
              <img 
                src={user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user?.uid} 
                alt="Avatar" 
                className="relative w-24 h-24 rounded-[2rem] border-2 border-white/10 object-cover shadow-2xl transition-transform hover:scale-105" 
              />
              <div className={`absolute -bottom-2 -right-2 ${roleConfig.color} text-slate-950 p-2.5 rounded-2xl shadow-xl border-4 border-slate-900`}>
                {roleConfig.icon}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mb-1">CIMCO OPERATOR</p>
              <h2 className="text-3xl font-black tracking-tighter leading-none italic uppercase">
                {user?.displayName?.split(' ')[0] || 'Usuario'}
              </h2>
              <div className="flex items-center gap-2 mt-3">
                <span className={`inline-block ${roleConfig.color} text-slate-950 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wider`}>
                  {roleConfig.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-10 pb-10 space-y-6">
          {/* Tarjeta de Estado Operativo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950/40 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2 opacity-50">
                <Wallet size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">Saldo</span>
              </div>
              <p className={`text-2xl font-black ${saldo < 0 ? 'text-red-500' : 'text-white'}`}>
                ${saldo.toLocaleString()}
              </p>
            </div>

            <div className="bg-slate-950/40 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2 opacity-50">
                {verificado ? <ShieldCheck size={12} /> : <Clock size={12} />}
                <span className="text-[10px] font-black uppercase tracking-widest">Cuenta</span>
              </div>
              <p className={`text-[11px] font-black uppercase tracking-tight ${verificado ? 'text-emerald-500' : 'text-amber-500'}`}>
                {verificado ? 'Verificado' : 'Pendiente'}
              </p>
            </div>
          </div>

          {/* Alerta de Saldo Negativo */}
          {saldo <= 0 && (
            <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-[2rem] flex items-center gap-4 animate-pulse">
              <ShieldAlert className="text-red-500 shrink-0" size={24} />
              <p className="text-red-200 text-[10px] font-bold leading-snug uppercase tracking-tight">
                Saldo insuficiente. Recarga en los puntos autorizados de La Jagua para seguir operando.
              </p>
            </div>
          )}

          {/* BOTÓN DE ACCIÓN PRINCIPAL */}
          <div className="pt-4">
            <button 
              onClick={() => navigate(roleConfig.path)}
              disabled={saldo <= 0 && user?.role !== 'pasajero' && user?.role !== 'admin'}
              className={`w-full ${roleConfig.color} text-slate-950 font-black py-7 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4 group disabled:opacity-50 disabled:grayscale`}
            >
              <span className="text-lg italic uppercase tracking-tighter">Entrar a mi Terminal</span>
              <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Botón Salir */}
          <button 
            onClick={logout}
            className="w-full bg-white/5 text-slate-500 font-black py-5 rounded-[2rem] flex items-center justify-center gap-2 hover:bg-rose-500/10 hover:text-rose-500 transition-all text-xs uppercase italic border border-white/5"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión Segura</span>
          </button>
        </div>

        {/* Branding Inferior */}
        <div className="pb-8 text-center">
          <p className="text-[8px] text-slate-700 font-black uppercase tracking-[0.8em]">CIMCO LOGISTICS • CEIBA SOFTWARE</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardBienvenida;