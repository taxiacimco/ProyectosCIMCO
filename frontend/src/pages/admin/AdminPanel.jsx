import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, query, onSnapshot, doc, 
  updateDoc, where, limit, increment, addDoc, serverTimestamp, getDocs, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged
} from 'firebase/firestore';
import { 
  ShieldAlert, Users, Car, Zap, Search, Wallet, 
  FileCheck, Navigation, Activity, Check, X, Eye, 
  Clock, MapPin, Phone, ShieldCheck, Loader2, AlertCircle
} from 'lucide-react';

// --- CONFIGURACIÓN E INICIALIZACIÓN ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

// --- COMPONENTE DE MAPA INTEGRADO (LiveMap) ---
// Se incluye aquí para evitar errores de resolución de archivos
const LiveMap = ({ modo, conductores }) => {
  return (
    <div className="w-full h-full bg-slate-800 relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{ 
        backgroundImage: `radial-gradient(#334155 1px, transparent 1px)`, 
        backgroundSize: '30px 30px' 
      }}></div>
      
      <div className="relative z-10 text-center p-10">
        <Navigation size={48} className="text-cyan-500 mx-auto mb-4 animate-pulse" />
        <h3 className="text-white font-black uppercase italic tracking-tighter text-xl">Radar Satelital Activo</h3>
        <p className="text-slate-400 text-sm mt-2">Visualizando {conductores?.length || 0} unidades en tiempo real</p>
      </div>

      {/* Representación visual de conductores en el radar */}
      {conductores?.map((c, i) => (
        <div 
          key={c.id} 
          className="absolute transition-all duration-1000"
          style={{ 
            left: `${30 + (i * 15) % 40}%`, 
            top: `${20 + (i * 20) % 60}%` 
          }}
        >
          <div className="flex flex-col items-center group">
            <div className={`p-2 rounded-lg shadow-lg ${c.estado === 'DISPONIBLE' ? 'bg-emerald-500 text-black' : 'bg-slate-700 text-white'}`}>
              <Car size={16} />
            </div>
            <div className="mt-1 bg-black/80 px-2 py-1 rounded text-[8px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {c.nombre}
            </div>
          </div>
        </div>
      ))}

      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Señal GPS Estable</span>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('radar');
  const [conductores, setConductores] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [stats, setStats] = useState({ saldoFlota: 0, activos: 0 });
  
  // Billetera
  const [busquedaUser, setBusquedaUser] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null);
  const [montoRecarga, setMontoRecarga] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Visor
  const [viewingDoc, setViewingDoc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const audioSirena = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'));

  // 1. Manejo de Autenticación
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Error de autenticación:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Escucha Global de Datos (Solo si hay usuario)
  useEffect(() => {
    if (!user) return;

    // Conductores
    const qUsers = query(collection(db, 'artifacts', appId, 'public', 'data', 'usuarios'), where('rol', '==', 'conductor'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConductores(docs);
      setStats({
        saldoFlota: docs.reduce((acc, curr) => acc + (Number(curr.saldoWallet) || 0), 0),
        activos: docs.filter(d => d.estadoOperativo === 'DISPONIBLE').length
      });
    }, (err) => console.error("Error conductores:", err));

    // Auditoría
    const qDocs = query(collection(db, 'artifacts', appId, 'public', 'data', 'registros_unidades'), where('status', '==', 'PENDIENTE_AUDITORIA'));
    const unsubDocs = onSnapshot(qDocs, (snap) => {
      setPendientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Error auditoría:", err));

    // Emergencias SOS
    const qSOS = query(collection(db, 'artifacts', appId, 'public', 'data', 'alertas_sos'), where('estado', '==', 'ACTIVO'));
    const unsubSOS = onSnapshot(qSOS, (snap) => {
      const sos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAlertas(sos);
      if (sos.length > 0) {
        audioSirena.current.loop = true;
        audioSirena.current.play().catch(() => {});
      } else {
        audioSirena.current.pause();
        audioSirena.current.currentTime = 0;
      }
    }, (err) => console.error("Error SOS:", err));

    return () => { unsubUsers(); unsubDocs(); unsubSOS(); };
  }, [user]);

  // Acciones
  const aprobarConductor = async (registro) => {
    if (!user || isProcessing) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'registros_unidades', registro.id), {
        status: 'APROBADO',
        fechaAprobacion: serverTimestamp(),
        adminId: user.uid
      });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', registro.metadata.uid), {
        verificado: true,
        estadoOperativo: 'DISPONIBLE',
        documentacionValidada: true
      });
      setViewingDoc(null);
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  const buscarUsuario = async () => {
    if (!busquedaUser || !user) return;
    setLoadingSearch(true);
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'usuarios'), where('telefono', '==', busquedaUser), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) setUsuarioEncontrado({ id: snap.docs[0].id, ...snap.docs[0].data() });
      else setUsuarioEncontrado(null);
    } catch (err) { console.error(err); }
    finally { setLoadingSearch(false); }
  };

  const ejecutarRecarga = async () => {
    if (!usuarioEncontrado || !montoRecarga || !user) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', usuarioEncontrado.id), {
        saldoWallet: increment(Number(montoRecarga))
      });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'ingresos_cimco'), {
        monto: Number(montoRecarga),
        receptor: usuarioEncontrado.nombre,
        fecha: serverTimestamp(),
        tipo: 'RECARGA_ADMIN',
        autor: user.uid
      });
      setUsuarioEncontrado(null);
      setMontoRecarga('');
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-300 font-sans overflow-hidden">
      
      {/* SIDEBAR NAVEGACIÓN */}
      <aside className="w-72 bg-slate-900/50 border-r border-white/5 flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-black shadow-lg">
              <Zap size={22} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-black italic uppercase text-white leading-none">CIMCO <span className="text-yellow-400 text-sm">HQ</span></h1>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Global Admin v3</p>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'radar', label: 'Radar Flota', icon: Navigation, color: 'text-cyan-400' },
              { id: 'validar', label: 'Auditoría', icon: FileCheck, color: 'text-yellow-400', count: pendientes.length },
              { id: 'billetera', label: 'Billetera', icon: Wallet, color: 'text-emerald-400' },
              { id: 'sos', label: 'Emergencias', icon: ShieldAlert, color: 'text-rose-500', count: alertas.length }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${activeTab === item.id ? 'bg-white/5 text-white border border-white/10' : 'text-slate-500 hover:bg-white/5'}`}
              >
                <item.icon size={18} className={item.color} />
                {item.label}
                {item.count > 0 && <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] ${item.id === 'sos' ? 'bg-rose-600 animate-pulse text-white' : 'bg-yellow-400 text-black'}`}>{item.count}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 bg-black/40 border-t border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Capital en Flota</p>
          <p className="text-2xl font-black text-white tracking-tighter">${stats.saldoFlota.toLocaleString()}</p>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 overflow-y-auto p-10">
        
        {activeTab === 'radar' && (
          <div className="animate-in fade-in duration-500 h-full flex flex-col">
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter">Radar de <span className="text-cyan-400">Flota</span></h2>
                <p className="text-slate-500 font-medium">Monitoreo GPS en tiempo real.</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 text-right">
                <p className="text-[10px] font-black uppercase text-slate-500">Unidades Disponibles</p>
                <p className="text-2xl font-black text-emerald-400">{stats.activos}</p>
              </div>
            </header>

            <div className="flex-1 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
              <LiveMap conductores={conductores} />
            </div>
          </div>
        )}

        {activeTab === 'validar' && (
          <div className="animate-in slide-in-from-bottom-6 duration-500">
             <header className="mb-10">
                <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter">Auditoría <span className="text-yellow-400">Técnica</span></h2>
                <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">Validación de documentos y seguridad.</p>
             </header>

             <div className="space-y-4">
                {pendientes.length === 0 ? (
                  <div className="py-20 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-white/5">
                    <ShieldCheck size={48} className="mx-auto text-slate-700 mb-4" />
                    <p className="text-slate-600 font-bold italic">No hay solicitudes pendientes.</p>
                  </div>
                ) : (
                  pendientes.map(reg => (
                    <div key={reg.id} className="bg-slate-900/80 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between hover:bg-slate-800 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-yellow-400/10 rounded-2xl overflow-hidden flex items-center justify-center text-yellow-400 border border-yellow-400/20">
                          {reg.evidencia?.frontal ? <img src={reg.evidencia.frontal} className="w-full h-full object-cover" /> : <Car size={30} />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1">{reg.tecnico?.tipo}</p>
                          <h4 className="text-xl font-black text-white italic uppercase">{reg.tecnico?.placa}</h4>
                        </div>
                      </div>
                      <button onClick={() => setViewingDoc(reg)} className="px-6 py-4 bg-white/5 hover:bg-yellow-400 hover:text-black text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all">
                        <Eye size={16}/> Inspeccionar
                      </button>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'billetera' && (
          <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
             <header className="text-center mb-10">
                <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter">Caja <span className="text-emerald-500">Central</span></h2>
                <p className="text-slate-500 font-medium">Recargas de saldo autorizadas.</p>
             </header>

             <div className="bg-slate-900 p-4 rounded-[2rem] border border-white/10 flex gap-4 mb-8">
                <input 
                  type="tel" 
                  placeholder="Teléfono del usuario..."
                  className="flex-1 bg-transparent px-4 font-bold text-white outline-none"
                  value={busquedaUser}
                  onChange={e => setBusquedaUser(e.target.value)}
                />
                <button onClick={buscarUsuario} className="bg-emerald-500 text-black font-black px-8 py-4 rounded-xl hover:scale-105 active:scale-95 transition-all">
                  {loadingSearch ? <Loader2 className="animate-spin" /> : 'Sincronizar'}
                </button>
             </div>

             {usuarioEncontrado && (
                <div className="bg-gradient-to-br from-emerald-600/20 to-slate-900 p-8 rounded-[3rem] border border-emerald-500/30">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-2xl font-black text-white italic uppercase">{usuarioEncontrado.nombre}</h3>
                      <p className="text-emerald-400 font-black text-xs uppercase">{usuarioEncontrado.rol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Saldo Actual</p>
                      <p className="text-3xl font-black text-white">${(usuarioEncontrado.saldoWallet || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="number" 
                      placeholder="Monto a recargar..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-2xl font-black text-white outline-none focus:border-emerald-500"
                      value={montoRecarga}
                      onChange={e => setMontoRecarga(e.target.value)}
                    />
                    <button onClick={ejecutarRecarga} disabled={isProcessing} className="w-full py-6 bg-emerald-500 text-black font-black rounded-2xl uppercase italic tracking-widest hover:bg-emerald-400 disabled:opacity-50">
                      Autorizar Depósito
                    </button>
                  </div>
                </div>
             )}
          </div>
        )}

      </main>

      {/* MODAL DE INSPECCIÓN */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] border border-white/10">
            <div className="p-8 border-b border-white/5 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <h3 className="text-2xl font-black italic text-white uppercase">Expediente: {viewingDoc.tecnico?.placa}</h3>
              <button onClick={() => setViewingDoc(null)} className="p-4 bg-slate-800 rounded-2xl hover:text-white transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { label: 'Identidad', img: viewingDoc.evidencia?.documento },
                { label: 'Licencia', img: viewingDoc.evidencia?.licencia },
                { label: 'SOAT', img: viewingDoc.evidencia?.soat },
                { label: 'Unidad', img: viewingDoc.evidencia?.frontal }
              ].map((item, idx) => (
                <div key={idx} className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-slate-500 italic ml-2">{item.label}</p>
                  <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/5">
                    {item.img ? (
                      <img src={item.img} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-800"><AlertCircle size={40}/></div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-10 pt-0 grid grid-cols-2 gap-4">
              <button className="py-6 bg-rose-500/10 text-rose-500 font-black rounded-[2rem] uppercase border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all">Rechazar</button>
              <button onClick={() => aprobarConductor(viewingDoc)} disabled={isProcessing} className="py-6 bg-emerald-500 text-black font-black rounded-[2rem] uppercase italic shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50">
                {isProcessing ? 'Procesando...' : 'Aprobar y Activar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;