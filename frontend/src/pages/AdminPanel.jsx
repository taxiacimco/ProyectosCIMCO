import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  limit,
  where
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  LayoutDashboard, 
  Activity, 
  Users, 
  Car, 
  Settings, 
  Bell, 
  LogOut,
  Copy,
  CheckCircle2,
  Terminal,
  Search,
  Menu,
  Clock,
  MapPin,
  CreditCard,
  ShieldAlert,
  AlertTriangle,
  Filter,
  Eye
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Componente para el Monitor de Webhook (Conserva tu URL de ngrok)
const WebhookHeader = ({ ngrokUrl }) => {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${ngrokUrl}/api/viajes/webhook-taxia`;

  const copyUrl = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-700 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Terminal size={20} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">Endpoint de Recepción Taxia</h3>
        </div>
        <span className="flex items-center gap-2 text-xs font-bold text-green-400 bg-green-400/10 px-3 py-1 rounded-full uppercase tracking-widest">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Sistema en línea
        </span>
      </div>
      
      <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-slate-700">
        <code className="text-blue-300 font-mono text-sm flex-1 truncate">{fullUrl}</code>
        <button onClick={copyUrl} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400">
          {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
        </button>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('monitor');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, alertasCount: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  
  const NGROK_BASE = "https://c8c360f762ae.ngrok-free.app";

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Error de auth:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. Escuchar Viajes (Tu estructura original)
    const tripsRef = collection(db, 'artifacts', appId, 'public', 'data', 'viajes');
    const qViajes = query(tripsRef, limit(50));
    const unsubViajes = onSnapshot(qViajes, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setTrips(sorted);
      setStats(prev => ({
        ...prev,
        total: sorted.length,
        completed: sorted.filter(t => t.estado === 'Finalizado').length,
        pending: sorted.filter(t => t.estado === 'Asignado').length
      }));
    }, (err) => console.error("Error viajes:", err));

    // 2. Escuchar Conductores (Nueva funcionalidad de gestión)
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users_profile');
    const unsubUsers = onSnapshot(usersRef, (snap) => {
      setConductores(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.rol === 'conductor'));
    });

    // 3. Escuchar Alertas de Pánico
    const alertsRef = collection(db, 'artifacts', appId, 'public', 'data', 'alertas_panico');
    const unsubAlerts = onSnapshot(alertsRef, (snap) => {
      const a = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAlertas(a);
      setStats(prev => ({ ...prev, alertasCount: a.length }));
    });

    return () => { unsubViajes(); unsubUsers(); unsubAlerts(); };
  }, [user]);

  const toggleEstadoConductor = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'activo' ? 'bloqueado' : 'activo';
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users_profile', id), {
        estadoCuenta: nuevoEstado
      });
    } catch (err) { console.error("Error al actualizar estado:", err); }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'finalizado': return 'text-green-600 bg-green-50 border-green-100';
      case 'asignado': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'cancelado': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const renderConductores = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar conductor por nombre o email..." 
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {conductores.filter(c => c.email?.toLowerCase().includes(searchTerm)).map(c => (
          <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl">🚐</div>
              <div className="flex-1 overflow-hidden">
                <h4 className="font-bold text-slate-800 truncate">{c.email}</h4>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">ID: {c.id.substring(0,8)}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${c.estadoCuenta === 'activo' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6 text-center">
              <div className="bg-slate-50 p-2 rounded-xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Calificación</p>
                <p className="font-black text-slate-800">⭐ {c.rating || '5.0'}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Saldo</p>
                <p className="font-black text-emerald-600">${c.billetera || 0}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => toggleEstadoConductor(c.id, c.estadoCuenta)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                  c.estadoCuenta === 'activo' 
                  ? 'bg-red-50 hover:bg-red-500 hover:text-white text-red-500' 
                  : 'bg-green-50 hover:bg-green-500 hover:text-white text-green-500'
                }`}
              >
                {c.estadoCuenta === 'activo' ? 'Bloquear' : 'Activar'}
              </button>
              <button className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl text-slate-600 transition-colors">
                <Eye size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar - Mejorado */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#0F172A] transition-all duration-300 flex flex-col z-20 shadow-2xl`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="min-w-[32px] h-8 bg-blue-500 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20">C</div>
          {isSidebarOpen && <span className="text-white font-bold text-xl tracking-tight uppercase">Cimco<span className="text-blue-400">Panel</span></span>}
        </div>

        <nav className="flex-1 mt-8 px-3 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'monitor', label: 'Viajes en Vivo', icon: Activity },
            { id: 'usuarios', label: 'Conductores', icon: Users },
            { id: 'alertas', label: 'SOS Pánico', icon: ShieldAlert, count: stats.alertasCount },
            { id: 'config', label: 'Ajustes', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                {isSidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">{item.label}</span>}
              </div>
              {isSidebarOpen && item.count > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <button className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-bold text-xs uppercase">Salir</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Navbar - Igual a tu diseño pero con más info */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
              <Menu size={22} />
            </button>
            <h1 className="text-xl font-black text-slate-800 hidden md:block uppercase tracking-tight italic">
              {activeTab === 'monitor' ? 'Monitor Realtime' : activeTab.toUpperCase()}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 uppercase">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Sistema: {appId.slice(0,6)}
            </div>
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} />
              {stats.alertasCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
            </button>
            <div className="w-9 h-9 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center text-white font-bold text-xs">AD</div>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {/* Stats Cards - Mejorado */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            {[
              { label: 'Viajes Totales', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Conductores', value: conductores.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Recaudado Hoy', value: `$${(stats.completed * 2500).toLocaleString()}`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Alertas SOS', value: stats.alertasCount, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
            ].map((card, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                  <p className="text-2xl font-black text-slate-800">{card.value}</p>
                </div>
                <div className={`${card.bg} ${card.color} p-4 rounded-2xl`}>
                  <card.icon size={22} />
                </div>
              </div>
            ))}
          </div>

          {activeTab === 'monitor' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <WebhookHeader ngrokUrl={NGROK_BASE} />
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">Historial Sincronizado</h3>
                  <div className="flex gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Live Updates</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                        <th className="px-6 py-4">ID / Referencia</th>
                        <th className="px-6 py-4">Pasajero</th>
                        <th className="px-6 py-4">Ubicación</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trips.map((trip) => (
                        <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">#{trip.tripId || trip.id.slice(0,6)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700">{trip.pasajero || 'Cliente Nuevo'}</span>
                              <span className="text-[10px] text-slate-400">{trip.celular || 'S/N'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-500 text-xs">
                              <MapPin size={12} className="text-red-400" />
                              <span className="truncate max-w-[150px]">{trip.origen || 'No registrada'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusColor(trip.estado)}`}>
                              {trip.estado || 'Recibido'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-800 text-sm">
                            ${(trip.valor || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && renderConductores()}

          {activeTab === 'alertas' && (
             <div className="space-y-4 animate-in fade-in duration-500">
                {alertas.length > 0 ? alertas.map(alerta => (
                  <div key={alerta.id} className="bg-red-50 border-2 border-red-200 p-6 rounded-[2rem] flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="bg-red-500 p-4 rounded-2xl text-white animate-pulse"><ShieldAlert size={32}/></div>
                      <div>
                        <h4 className="text-red-900 font-black text-xl uppercase italic">Pánico Activado</h4>
                        <p className="text-red-700 font-bold text-sm">Conductor/Pasajero: {alerta.userEmail || 'Desconocido'}</p>
                      </div>
                    </div>
                    <button className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs hover:bg-red-700 transition-all">Atender Emergencia</button>
                  </div>
                )) : (
                  <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300">
                    <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                    <p className="font-bold text-slate-400">No hay alertas de pánico activas</p>
                  </div>
                )}
             </div>
          )}

          {(activeTab === 'config' || activeTab === 'dashboard') && (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <Settings size={48} className="text-slate-200 mb-4 animate-spin-slow" />
              <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest italic">Módulo {activeTab}</h3>
              <p className="text-slate-300 text-sm mt-2 font-bold">Configurando enlaces de datos...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;