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
  LayoutDashboard 
} from 'lucide-react';

const DashboardBienvenida = () => {
  const { user, isAdmin, isDriver, isDespachador, logout } = useAuth();
  const navigate = useNavigate();

  // Configuración de UI según el rol
  const getRoleConfig = () => {
    switch (user?.role) {
      case 'admin':
        return { label: 'CEO / Admin', color: 'bg-red-600', icon: <LayoutDashboard size={20}/>, path: '/admin/dashboard' };
      case 'mototaxi':
        return { label: 'Conductor Mototaxi', color: 'bg-yellow-500', icon: <Navigation size={20}/>, path: '/mototaxi/panel' };
      case 'motocarga':
        return { label: 'Conductor Motocarga', color: 'bg-orange-500', icon: <Truck size={20}/>, path: '/motocarga/panel' };
      case 'cond_inter':
        return { label: 'Conductor Intermunicipal', color: 'bg-purple-600', icon: <Navigation size={20}/>, path: '/conductor-inter/panel' };
      case 'despachador':
      case 'despachadorinter':
        return { label: 'Despachador Oficial', color: 'bg-blue-600', icon: <User size={20}/>, path: '/despachador/panel' };
      default:
        return { label: 'Pasajero TaxiA', color: 'bg-cyan-600', icon: <User size={20}/>, path: '/pasajero/panel' };
    }
  };

  const roleConfig = getRoleConfig();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-slate-100">
        
        {/* Cabecera con Color Dinámico */}
        <div className={`${roleConfig.color} p-8 text-white relative`}>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img 
                src={user?.photoURL || 'https://via.placeholder.com/150'} 
                alt="Avatar" 
                className="w-20 h-20 rounded-2xl border-4 border-white/30 object-cover shadow-lg" 
              />
              <div className="absolute -bottom-2 -right-2 bg-white text-slate-900 p-1.5 rounded-lg shadow-md">
                {roleConfig.icon}
              </div>
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">Bienvenido de nuevo,</p>
              <h2 className="text-2xl font-black tracking-tight leading-none">{user?.displayName?.split(' ')[0]}</h2>
              <span className="mt-2 inline-block bg-black/20 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                {roleConfig.label}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Tarjetas de Estado */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="text-blue-600" size={18} />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Saldo</span>
              </div>
              <p className="text-2xl font-black text-slate-800">${user?.balance || 0}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                {user?.isApproved ? <ShieldCheck className="text-emerald-500" size={18} /> : <Clock className="text-amber-500" size={18} />}
                <span className="text-[10px] font-bold text-slate-400 uppercase">Estado</span>
              </div>
              <p className={`text-sm font-black uppercase ${user?.isApproved ? 'text-emerald-600' : 'text-amber-600'}`}>
                {user?.isApproved ? 'Verificado' : 'En Revisión'}
              </p>
            </div>
          </div>

          {/* Alerta de Saldo para Conductores */}
          {isDriver && (user?.balance < 200 || !user?.balance) && (
            <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl mb-8 flex items-start space-x-3">
              <div className="bg-red-500 text-white p-1 rounded-lg">
                <Wallet size={16} />
              </div>
              <p className="text-red-700 text-xs font-bold leading-tight">
                SALDO BAJO: Recarga pronto para que el sistema te asigne nuevos viajes.
              </p>
            </div>
          )}

          {/* Botón de Acción Principal (Redirección Automática) */}
          <button 
            onClick={() => navigate(roleConfig.path)}
            className={`w-full ${roleConfig.color} text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center space-x-2 hover:scale-[1.02] active:scale-95 transition-all mb-4`}
          >
            <span>ENTRAR AL PANEL DE CONTROL</span>
            <ChevronRight size={20} />
          </button>

          {/* Botón Cerrar Sesión */}
          <button 
            onClick={logout}
            className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        <div className="bg-slate-50 p-4 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">TaxiA-CIMCO v2.0 • Seguridad y Confianza</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardBienvenida;