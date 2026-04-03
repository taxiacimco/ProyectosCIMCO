import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, query, onSnapshot, where, 
  doc, updateDoc, setDoc, orderBy, serverTimestamp, increment, limit 
} from 'firebase/firestore';
import { 
  BarChart3, AlertTriangle, Settings, Wallet, 
  MessageSquare, Users, TrendingUp, ShieldCheck, 
  Eye, CheckCircle, XCircle, Send, MapPin, Search,
  Car, FileText, ShieldAlert
} from 'lucide-react';

// Configuración de Firebase integrada para el entorno
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

// Mock de notificaciones
const notificarExito = (msg) => console.log("ÉXITO:", msg);
const notificarError = (msg) => console.log("ERROR:", msg);

// --- COMPONENTE: GRÁFICAS DE TENDENCIA ---
const GraficaMensual = ({ ingresos }) => {
  const dataMensual = useMemo(() => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const consolidado = meses.map(m => ({ mes: m, total: 0 }));
    
    ingresos.forEach(i => {
      if (i.fecha) {
        const d = i.fecha.toDate ? i.fecha.toDate() : new Date(i.fecha);
        const mesIdx = d.getMonth();
        if (consolidado[mesIdx]) {
          consolidado[mesIdx].total += parseFloat(i.montoComision || i.monto || 0);
        }
      }
    });
    return consolidado;
  }, [ingresos]);

  const maxVal = Math.max(...dataMensual.map(d => d.total), 1);

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-[3rem] p-10 mb-12 shadow-2xl">
      <div className="flex justify-between items-center mb-10">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] italic flex items-center gap-3">
          <TrendingUp size={20} className="text-cyan-400"/> RENDIMIENTO FINANCIERO CIMCO
        </h3>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full">Reporte Anual 2026</span>
      </div>
      <div className="flex items-end justify-between h-56 gap-3">
        {dataMensual.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center group">
            <div className="relative w-full flex flex-col items-center justify-end h-full">
                <div 
                  className="w-full bg-gradient-to-t from-cyan-600/40 to-cyan-400 rounded-t-xl relative transition-all duration-500 group-hover:brightness-125"
                  style={{ height: `${(d.total / maxVal) * 100}%`, minHeight: '4px' }}
                >
                  {d.total > 0 && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-cyan-400 text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-cyan-500/30 z-10">
                      ${Math.round(d.total).toLocaleString()}
                    </div>
                  )}
                </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-5 font-black uppercase tracking-tighter">{d.mes}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const App = () => {
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'vehiculos'
  const [conductores, setConductores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [ingresosCimco, setIngresosCimco] = useState([]);
  const [alertasSOS, setAlertasSOS] = useState([]);
  const [config, setConfig] = useState({ comision: 10, limiteDeuda: -5000 });
  const [showConfig, setShowConfig] = useState(false);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    // 1. Configuración
    const unsubConfig = onSnapshot(doc(db, 'artifacts', appId, 'public', 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });

    // 2. Conductores
    const qUsers = query(collection(db, 'artifacts', appId, 'public', 'data', 'usuarios'), where("rol", "==", "conductor"));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setConductores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Vehículos
    const qVehs = query(collection(db, 'artifacts', appId, 'public', 'data', 'vehiculos'));
    const unsubVehs = onSnapshot(qVehs, (snap) => {
      setVehiculos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 4. Pagos Pendientes
    const qSols = query(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes_recarga'), where("estado", "==", "pendiente"));
    const unsubSols = onSnapshot(qSols, (snap) => {
      setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 5. Ingresos
    const qIngresos = query(collection(db, 'artifacts', appId, 'public', 'data', 'ingresos_cimco'), limit(100));
    const unsubIngresos = onSnapshot(qIngresos, (snap) => {
      setIngresosCimco(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 6. SOS
    const qSOS = query(collection(db, 'artifacts', appId, 'public', 'data', 'alertas_sos'), where('estado', '==', 'ACTIVO'));
    const unsubSOS = onSnapshot(qSOS, (snap) => {
      setAlertasSOS(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubConfig(); unsubUsers(); unsubVehs(); unsubSols(); unsubIngresos(); unsubSOS();
    };
  }, []);

  const totalCimco = useMemo(() => {
    return ingresosCimco.reduce((acc, curr) => acc + (parseFloat(curr.monto || 0)), 0);
  }, [ingresosCimco]);

  const resolverSOS = async (id) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'alertas_sos', id), { estado: 'Resuelto', fechaFin: serverTimestamp() });
  };

  const validarVehiculo = async (id, estado) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vehiculos', id), { 
        estadoValidacion: estado,
        fechaValidacion: serverTimestamp()
      });
      notificarExito(`Vehículo ${estado}`);
    } catch (e) {
      notificarError("Error en validación");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-cyan-500/30">
      
      {/* ALERTA SOS */}
      {alertasSOS.length > 0 && (
        <div className="fixed inset-0 z-[2000] bg-red-950/90 backdrop-blur-3xl flex items-center justify-center p-6">
          <div className="bg-white text-slate-950 w-full max-w-xl rounded-[4rem] p-12 text-center shadow-2xl border-[12px] border-red-500/30 animate-pulse">
            <ShieldAlert size={80} className="mx-auto mb-6 text-red-600" />
            <h2 className="text-5xl font-black uppercase mb-4 tracking-tighter">EMERGENCIA</h2>
            <p className="text-2xl font-bold mb-10 text-slate-600 italic">CONDUCTOR: {alertasSOS[0].nombreUsuario}</p>
            <div className="flex gap-4">
              <button onClick={() => window.open(`https://maps.google.com/?q=${alertasSOS[0].lat},${alertasSOS[0].lng}`)} className="flex-1 py-6 bg-slate-950 text-white rounded-3xl font-black uppercase">Mapa GPS</button>
              <button onClick={() => resolverSOS(alertasSOS[0].id)} className="flex-1 py-6 bg-red-600 text-white rounded-3xl font-black uppercase">Cerrar Alerta</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR MINI */}
      <nav className="fixed left-0 top-0 bottom-0 w-24 bg-slate-950 border-r border-white/5 flex flex-col items-center py-10 gap-10 z-[100]">
        <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center text-black">
          <ShieldCheck size={28} />
        </div>
        <div className="flex flex-col gap-6">
          <button onClick={() => setView('dashboard')} className={`p-4 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:bg-white/5'}`}>
            <BarChart3 size={24} />
          </button>
          <button onClick={() => setView('vehiculos')} className={`p-4 rounded-2xl transition-all ${view === 'vehiculos' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:bg-white/5'}`}>
            <Car size={24} />
          </button>
        </div>
        <button onClick={() => setShowConfig(true)} className="mt-auto p-4 text-slate-500 hover:text-white transition-colors">
          <Settings size={24} />
        </button>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="pl-24 p-8 md:p-12">
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-16 bg-slate-900/30 p-10 rounded-[4rem] border border-white/5">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter">
              CIMCO <span className="text-cyan-400">{view === 'dashboard' ? 'ANALYTICS' : 'FLEET'}</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] mt-3">Panel de Control Estratégico CEO</p>
          </div>
          <div className="flex gap-6">
            <div className="bg-black/40 px-8 py-5 rounded-3xl border border-white/5">
               <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Caja CIMCO</p>
               <p className="text-3xl font-black text-emerald-400">${totalCimco.toLocaleString()}</p>
            </div>
          </div>
        </header>

        {view === 'dashboard' ? (
          <>
            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-slate-900/60 p-10 rounded-[3.5rem] border border-white/5">
                <p className="text-slate-500 text-[10px] font-black uppercase mb-3">Pilotos Activos</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-6xl font-black italic">{conductores.length}</h2>
                  <Users size={40} className="text-slate-800" />
                </div>
              </div>
              <div className="bg-slate-900/60 p-10 rounded-[3.5rem] border border-cyan-500/20 shadow-xl shadow-cyan-500/5">
                <p className="text-cyan-400 text-[10px] font-black uppercase mb-3">Validaciones Pendientes</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-6xl font-black italic text-cyan-400">{solicitudes.length}</h2>
                  <Wallet size={40} className="text-cyan-900" />
                </div>
              </div>
              <div className="bg-slate-900/60 p-10 rounded-[3.5rem] border border-white/5">
                <p className="text-slate-500 text-[10px] font-black uppercase mb-3">Comisión Red</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-6xl font-black italic">{config.comision}%</h2>
                  <TrendingUp size={40} className="text-slate-800" />
                </div>
              </div>
            </div>

            <GraficaMensual ingresos={ingresosCimco} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* LISTA DE PILOTOS */}
              <div className="lg:col-span-1 bg-slate-900/40 rounded-[3rem] border border-white/5 flex flex-col h-[600px] overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-slate-950/50 flex flex-col gap-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Users size={16} className="text-cyan-500"/> Monitor de Red
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14}/>
                    <input type="text" placeholder="Buscar..." className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-[11px] outline-none" onChange={e => setFiltro(e.target.value)} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {conductores.filter(c => c.nombre?.toLowerCase().includes(filtro.toLowerCase())).map(c => (
                    <div key={c.id} className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-cyan-500/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${c.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                        <div>
                          <p className="text-[11px] font-black uppercase leading-none">{c.nombre}</p>
                          <p className={`text-[9px] font-bold mt-1 ${c.saldoWallet < 0 ? 'text-rose-500' : 'text-slate-500'}`}>${(c.saldoWallet || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PAGOS ENTRANTE */}
              <div className="lg:col-span-3 bg-slate-900/40 rounded-[3rem] border border-white/5 flex flex-col h-[600px] overflow-hidden">
                 <div className="p-8 border-b border-white/5 bg-slate-950/50 flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 italic">
                      <Wallet size={16} className="text-emerald-500"/> Transacciones de Recarga
                    </h3>
                 </div>
                 <div className="flex-1 overflow-y-auto p-10">
                    {solicitudes.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-20">
                         <CheckCircle size={100} />
                         <p className="font-black uppercase text-sm mt-6">Sistema Despejado</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {solicitudes.map(sol => (
                          <div key={sol.id} className="p-8 bg-slate-950 rounded-[2.5rem] border border-cyan-500/10 flex flex-col gap-6 hover:border-cyan-500/30 transition-all">
                             <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-[10px] font-black text-cyan-500 uppercase">{sol.metodo || 'RECARGA'}</p>
                                  <h4 className="text-2xl font-black uppercase italic mt-1">{sol.nombre}</h4>
                                </div>
                                <span className="text-3xl font-black text-emerald-400">+${sol.monto?.toLocaleString()}</span>
                             </div>
                             <div className="flex gap-3">
                                <button onClick={() => window.open(sol.comprobanteUrl)} className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-white/10 transition-all"><Eye size={16}/> Ticket</button>
                                <button className="flex-1 py-4 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-400 transition-all">Validar</button>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </>
        ) : (
          /* GESTIÓN DE VEHÍCULOS */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {vehiculos.length === 0 ? (
                  <div className="col-span-full py-20 text-center opacity-30">
                     <Car size={80} className="mx-auto mb-6" />
                     <p className="text-xl font-black uppercase italic">Sin vehículos registrados</p>
                  </div>
                ) : (
                  vehiculos.map(v => (
                    <div key={v.id} className="bg-slate-900/60 rounded-[3rem] border border-white/5 overflow-hidden flex flex-col shadow-xl">
                       <div className="p-8 border-b border-white/5 bg-slate-950/40">
                          <div className="flex justify-between items-center mb-4">
                             <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${v.estadoValidacion === 'aprobado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                               {v.estadoValidacion || 'pendiente'}
                             </span>
                             <span className="text-[10px] font-black text-slate-500 uppercase">{v.tipo || 'Coche'}</span>
                          </div>
                          <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{v.placa}</h3>
                          <p className="text-slate-500 text-[11px] font-bold mt-2 uppercase">{v.marca} {v.modelo} • {v.color}</p>
                       </div>
                       <div className="p-8 flex-1 bg-slate-950/20">
                          <div className="space-y-4 mb-8">
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><FileText size={14}/> SOAT</span>
                                <button className="text-[10px] font-black text-cyan-400 uppercase">Ver PDF</button>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><FileText size={14}/> Tarjeta Propiedad</span>
                                <button className="text-[10px] font-black text-cyan-400 uppercase">Ver PDF</button>
                             </div>
                          </div>
                          <div className="flex gap-3">
                             <button onClick={() => validarVehiculo(v.id, 'aprobado')} className="flex-1 py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black text-[10px] uppercase hover:scale-105 transition-transform">Aprobar</button>
                             <button onClick={() => validarVehiculo(v.id, 'rechazado')} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase hover:scale-105 transition-transform">Rechazar</button>
                          </div>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}
      </main>

      {/* MODAL AJUSTES */}
      {showConfig && (
        <div className="fixed inset-0 z-[500] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[4rem] p-12 relative">
              <button onClick={() => setShowConfig(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><XCircle /></button>
              <h2 className="text-3xl font-black uppercase italic mb-10 tracking-tighter">AJUSTES <span className="text-cyan-500">CEO</span></h2>
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-3">Comisión Global (%)</label>
                  <input type="number" value={config.comision} onChange={e=>setConfig({...config, comision: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 p-5 rounded-3xl text-2xl font-black text-cyan-400 outline-none focus:border-cyan-500 transition-all" />
                </div>
                <button onClick={async() => {
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'config', 'general'), config); 
                  setShowConfig(false);
                  notificarExito("Sistema Actualizado");
                }} className="w-full py-6 bg-cyan-500 text-slate-950 font-black rounded-3xl uppercase tracking-widest shadow-xl shadow-cyan-500/20 active:scale-95 transition-all">Sincronizar Red</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;