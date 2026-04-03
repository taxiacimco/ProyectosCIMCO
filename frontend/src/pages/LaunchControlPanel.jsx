import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import AdminVerificacionDocs from './AdminVerificacionDocs'; // Importamos tu panel de auditoría
import { 
  ShieldCheck, MapPin, Users, Wallet, Zap, 
  CheckCircle2, AlertCircle, BarChart3, Search, 
  Settings, Bell, ArrowUpRight, Database, Globe, Loader2
} from 'lucide-react';

const appId = 'taxiacimco-app';

const LaunchControlPanel = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [realStats, setRealStats] = useState({
    usuarios: 0,
    pendientes: 0,
    viajesHoy: 0,
    ingresos: 0
  });
  const [loading, setLoading] = useState(true);

  // 🕒 Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 📊 Sincronización de estadísticas reales desde Firestore
  useEffect(() => {
    const usersQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'usuarios'));
    
    const unsub = onSnapshot(usersQuery, (snap) => {
      const docs = snap.docs.map(d => d.data());
      
      setRealStats({
        usuarios: docs.length,
        pendientes: docs.filter(u => u.documentacion?.estado === 'PENDIENTE').length,
        viajesHoy: 0, // Esto se conectará cuando hagamos el service de viajes
        ingresos: 0   // Esto vendrá de tu BilleteraPanel
      });
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Renderizado Condicional de Contenido
  const renderContent = () => {
    switch (activeTab) {
      case 'roles':
        return <AdminVerificacionDocs />;
      case 'overview':
        return <OverviewContent stats={realStats} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Zap size={48} className="mb-4 opacity-20" />
            <p className="font-black uppercase tracking-widest text-xs">Módulo en Desarrollo</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
      {/* Barra de Navegación Superior */}
      <header className="bg-[#0f172a] text-white p-4 flex justify-between items-center shadow-2xl sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-cyan-500 p-1.5 rounded-lg rotate-3 shadow-lg shadow-cyan-500/20">
            <BarChart3 className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-tighter">
            TAXIA CIMCO <span className="ml-2 text-cyan-400 text-[10px] border border-cyan-500/20 px-2 py-0.5 rounded-full">CORE v2.0</span>
          </h1>
        </div>

        <div className="flex items-center space-x-6">
          <div className="hidden lg:flex flex-col items-end mr-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Master Time</span>
            <span className="text-sm font-mono text-cyan-400">{currentTime.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-3 pl-4 border-l border-slate-700">
            <div className="text-right">
              <p className="text-xs font-bold">C. Fuentes</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-tighter">CEO CIMCO</p>
            </div>
            <div className="w-9 h-9 bg-cyan-600 rounded-xl flex items-center justify-center font-black text-sm">CF</div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-72 bg-white border-r border-slate-200 p-6 space-y-2 hidden md:block">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-3">Navegación Táctica</p>
          
          <NavButton id="overview" label="Resumen General" icon={ShieldCheck} activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavButton id="map" label="Monitor de Flota" icon={MapPin} activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavButton id="roles" label="Auditoría Docs" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} count={realStats.pendientes} />
          <NavButton id="wallet" label="Finanzas" icon={Wallet} activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="pt-8 mt-8 border-t border-slate-100">
             <button className="w-full flex items-center space-x-3 p-3.5 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all">
                <AlertCircle size={20} />
                <span className="text-sm font-bold uppercase tracking-tighter">Cerrar Sesión</span>
             </button>
          </div>
        </nav>

        {/* Contenido Principal */}
        <main className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex h-full items-center justify-center">
               <Loader2 className="animate-spin text-cyan-500" size={40} />
            </div>
          ) : renderContent()}
        </main>
      </div>
    </div>
  );
};

// --- SUBCOMPONENTES ---

const NavButton = ({ id, label, icon: Icon, activeTab, setActiveTab, count }) => (
  <button 
    onClick={() => setActiveTab(id)}
    className={`w-full flex items-center space-x-3 p-3.5 rounded-xl transition-all ${
      activeTab === id 
      ? 'bg-cyan-50 text-cyan-700 shadow-sm border border-cyan-100 font-bold' 
      : 'text-slate-500 hover:bg-slate-50'
    }`}
  >
    <Icon size={20} />
    <span className="text-sm flex-1 text-left">{label}</span>
    {count > 0 && (
      <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-bounce">
        {count}
      </span>
    )}
  </button>
);

const OverviewContent = ({ stats }) => (
  <div className="animate-in fade-in duration-500">
    <div className="mb-8 bg-gradient-to-r from-blue-700 to-cyan-600 rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden">
      <Globe className="absolute top-0 right-0 p-8 opacity-10 w-64 h-64" />
      <div className="relative z-10">
        <h2 className="text-3xl font-black mb-2 italic">CENTRAL DE MANDO CIMCO</h2>
        <p className="text-blue-100 text-sm mb-6">Infraestructura conectada a: <span className="font-mono">pelagic-chalice-467818-e1.web.app</span></p>
        <div className="flex space-x-4">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-widest">
            STATUS: SISTEMA OPERATIVO
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <StatCard label="Usuarios Registrados" value={stats.usuarios} icon={Users} color="text-blue-600" bg="bg-blue-50" />
      <StatCard label="Doc. Pendientes" value={stats.pendientes} icon={ShieldCheck} color="text-rose-600" bg="bg-rose-50" />
      <StatCard label="Viajes Realizados" value={stats.viajesHoy} icon={MapPin} color="text-emerald-600" bg="bg-emerald-50" />
      <StatCard label="Ingresos" value={`$${stats.ingresos}`} icon={Wallet} color="text-orange-600" bg="bg-orange-50" />
    </div>
  </div>
);

const StatCard = ({ label, value, icon: Icon, color, bg }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all">
    <div className={`${bg} ${color} w-12 h-12 flex items-center justify-center rounded-2xl mb-4`}>
      <Icon size={24} />
    </div>
    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</p>
    <p className="text-3xl font-black text-slate-800">{value}</p>
  </div>
);

export default LaunchControlPanel;