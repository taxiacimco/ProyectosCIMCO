import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, query, onSnapshot, where, 
  doc, updateDoc, setDoc, getDoc, orderBy, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken 
} from 'firebase/auth';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- ICONOS SVG ---
const ChartIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const ExcelIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const AlertIcon = () => <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const SettingsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const WalletIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const ChatIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;

// --- COMPONENTE: GRÁFICAS DE TENDENCIA ---
const GraficaMensual = ({ viajes }) => {
  const dataMensual = useMemo(() => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const consolidado = meses.map(m => ({ mes: m, total: 0 }));
    viajes.forEach(v => {
      if (v.fecha) {
        const d = new Date(v.fecha);
        const mesIdx = d.getMonth();
        if (consolidado[mesIdx]) consolidado[mesIdx].total += (v.tarifa || v.monto || 0) * 0.10;
      }
    });
    return consolidado;
  }, [viajes]);

  const maxVal = Math.max(...dataMensual.map(d => d.total), 1);

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-[3rem] p-8 mb-12">
      <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-8 italic">Tendencia de Ingresos CIMCO (Mensual)</h3>
      <div className="flex items-end justify-between h-48 gap-2">
        {dataMensual.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center group">
            <div 
              className="w-full bg-cyan-500/20 group-hover:bg-cyan-400 transition-all rounded-t-lg relative"
              style={{ height: `${(d.total / maxVal) * 100}%`, minHeight: '4px' }}
            >
              {d.total > 0 && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  ${Math.round(d.total)}
                </span>
              )}
            </div>
            <span className="text-[9px] text-slate-500 mt-3 font-bold uppercase">{d.mes}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [conductores, setConductores] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [alertasSOS, setAlertasSOS] = useState([]);
  const [config, setConfig] = useState({ comision: 10, limiteDeuda: -50000 });
  const [showConfig, setShowConfig] = useState(false);
  const [alertaActiva, setAlertaActiva] = useState(null);
  const [modalRecarga, setModalRecarga] = useState(null);
  
  // Chat State
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef(null);

  // 1. AUTENTICACIÓN
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // 2. ESCUCHA DE DATOS
  useEffect(() => {
    if (!user) return;

    // Configuración
    const confRef = doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', 'general');
    onSnapshot(confRef, (docSnap) => {
      if (docSnap.exists()) setConfig(docSnap.data());
    });

    // Conductores
    const qUsers = collection(db, 'artifacts', appId, 'public', 'data', 'usuarios');
    onSnapshot(qUsers, (snap) => {
      const list = [];
      snap.forEach(async (d) => {
        const data = { id: d.id, ...d.data() };
        list.push(data);
        // Suspensión automática
        if (data.rol === 'conductor' && (data.saldoWallet || 0) < config.limiteDeuda && data.estado !== 'Suspendido') {
           await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', d.id), { estado: 'Suspendido' });
        } else if (data.rol === 'conductor' && (data.saldoWallet || 0) >= config.limiteDeuda && data.estado === 'Suspendido') {
           await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', d.id), { estado: 'Activo' });
        }
      });
      setConductores(list);
    });

    // Viajes
    const qViajes = collection(db, 'artifacts', appId, 'public', 'data', 'viajes');
    onSnapshot(qViajes, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setViajes(list);
    });

    // SOS
    const qSOS = query(collection(db, 'artifacts', appId, 'public', 'data', 'alertas_sos'), where('estado', '==', 'Pendiente'));
    onSnapshot(qSOS, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setAlertasSOS(list);
      if (list.length > 0) setAlertaActiva(list[0]);
    });
  }, [user, config.limiteDeuda]);

  // 3. LOGICA CHAT
  useEffect(() => {
    if (!user || !activeChat) return;
    const qChat = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'chats'),
      where('conversationId', '==', activeChat.id),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(qChat, (snap) => {
      const msgs = [];
      snap.forEach(d => msgs.push(d.data()));
      setMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [user, activeChat]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chats'), {
        conversationId: activeChat.id,
        senderId: 'admin',
        senderName: 'Soporte CIMCO',
        text: newMessage,
        timestamp: serverTimestamp()
      });
      setNewMessage("");
    } catch (err) { console.error(err); }
  };

  // Estadísticas
  const stats = useMemo(() => {
    const total = viajes.reduce((acc, curr) => acc + (curr.tarifa || curr.monto || 0), 0);
    return {
      bruto: total,
      cimco: total * (config.comision / 100),
      count: viajes.length
    };
  }, [viajes, config.comision]);

  const saveConfig = async () => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', 'general'), config);
      setShowConfig(false);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white font-sans selection:bg-cyan-500/30 pb-32">
      
      {/* 🚨 MODAL SOS */}
      {alertaActiva && (
        <div className="fixed inset-0 z-[200] bg-red-950/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white text-slate-900 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl text-center border-8 border-red-500/20">
            <div className="bg-red-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-white animate-pulse"><AlertIcon /></div>
            <h2 className="text-4xl font-black italic tracking-tighter text-red-600 mb-4">EMERGENCIA ACTIVA</h2>
            <div className="bg-slate-100 p-6 rounded-2xl mb-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conductor en Riesgo</p>
                <p className="text-2xl font-black">{alertaActiva.nombre}</p>
                <p className="text-xs font-bold text-red-500 mt-2">Ubicación: {alertaActiva.ubicacion || 'Calculando...'}</p>
            </div>
            <button 
                onClick={async () => {
                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'alertas_sos', alertaActiva.id), { estado: 'Resuelto' });
                    setAlertaActiva(null);
                }}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black"
            >Marcar como Resuelto</button>
          </div>
        </div>
      )}

      {/* ⚙️ MODAL CONFIGURACIÓN */}
      {showConfig && (
        <div className="fixed inset-0 z-[160] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[3rem] p-12 shadow-2xl">
            <h2 className="text-3xl font-black italic tracking-tighter mb-8 flex items-center gap-4"><SettingsIcon /> Configuración</h2>
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Comisión (%)</label>
                <input type="number" className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-cyan-400 font-bold focus:border-cyan-500 outline-none" value={config.comision} onChange={(e) => setConfig({...config, comision: parseFloat(e.target.value)})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Límite Suspensión</label>
                <input type="number" className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-red-400 font-bold focus:border-red-500 outline-none" value={config.limiteDeuda} onChange={(e) => setConfig({...config, limiteDeuda: parseFloat(e.target.value)})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowConfig(false)} className="flex-1 py-4 bg-slate-800 rounded-xl font-black uppercase text-[10px]">Cerrar</button>
                <button onClick={saveConfig} className="flex-1 py-4 bg-cyan-500 text-slate-950 rounded-xl font-black uppercase text-[10px]">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 bg-slate-900/40 p-10 rounded-[4rem] border border-white/5">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter text-white">CIMCO <span className="text-cyan-400">COMMAND</span></h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Executive Administration Suite v2.1</p>
        </div>
        <div className="flex gap-4 mt-6 md:mt-0">
            <button onClick={() => setShowConfig(true)} className="p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5"><SettingsIcon /></button>
            <button className="bg-emerald-500 text-slate-950 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3">
                <ExcelIcon /> Corte de Caja
            </button>
        </div>
      </header>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="bg-slate-900 p-10 rounded-[3rem] border border-white/5 group">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">Total Recaudado</p>
            <h2 className="text-4xl font-black text-white italic tracking-tighter">${stats.bruto.toLocaleString()}</h2>
        </div>
        <div className="bg-slate-900 p-10 rounded-[3rem] border border-white/5 border-l-cyan-500/50">
            <p className="text-cyan-500 text-[10px] font-black uppercase tracking-widest mb-4">Utilidad CIMCO ({config.comision}%)</p>
            <h2 className="text-4xl font-black text-cyan-400 italic tracking-tighter">${stats.cimco.toLocaleString()}</h2>
        </div>
        <div className="bg-slate-900 p-10 rounded-[3rem] border border-white/5">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">Viajes Realizados</p>
            <h2 className="text-4xl font-black text-white italic tracking-tighter">{stats.count}</h2>
        </div>
      </div>

      <GraficaMensual viajes={viajes} />

      {/* MAIN MONITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* CONDUCTORES & CHAT SELECTOR */}
        <div className="lg:col-span-1 bg-slate-900 rounded-[3rem] border border-white/5 overflow-hidden flex flex-col h-[700px]">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest italic text-slate-400">Flota & Soporte</h3>
                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[8px] font-black rounded-full">En Línea: {conductores.filter(c => c.rol === 'conductor').length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {conductores.filter(c => c.rol === 'conductor').map(c => (
                    <div key={c.id} className={`p-6 rounded-[2rem] border transition-all ${activeChat?.id === c.id ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-950 border-white/5'}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${c.estado === 'Suspendido' ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                              <div>
                                <h4 className="font-black text-sm text-white">{c.nombre}</h4>
                                <p className="text-[8px] font-black uppercase text-slate-500">{c.modeloAuto || 'Vehículo Cimco'}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setActiveChat(c)} className={`p-2 rounded-lg transition-all ${activeChat?.id === c.id ? 'bg-cyan-500 text-slate-950' : 'bg-white/5 text-slate-400 hover:text-white'}`}><ChatIcon /></button>
                              <button onClick={() => setModalRecarga(c)} className="p-2 bg-white/5 rounded-lg hover:bg-emerald-500 text-slate-400 hover:text-slate-950 transition-all"><WalletIcon /></button>
                            </div>
                        </div>
                        <div className="mt-4 bg-black/30 p-3 rounded-xl flex justify-between items-center">
                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Saldo</span>
                            <span className={`text-[10px] font-black ${c.saldoWallet < 0 ? 'text-red-400' : 'text-emerald-400'}`}>${c.saldoWallet?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* DINAMIC CENTER (Viajes o Chat) */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] border border-white/5 overflow-hidden flex flex-col h-[700px] relative">
            {!activeChat ? (
              <>
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                    <h3 className="text-xs font-black uppercase tracking-widest italic text-slate-400">Monitor de Servicios en Tiempo Real</h3>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-900 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                            <tr>
                                <th className="p-6">Conductor</th>
                                <th className="p-6">Monto</th>
                                <th className="p-6">Comisión</th>
                                <th className="p-6">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {viajes.slice(-20).reverse().map((v, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-all">
                                    <td className="p-6 font-bold text-slate-200">{v.nombreConductor || '---'}</td>
                                    <td className="p-6 font-black text-white italic">${(v.tarifa || 0).toLocaleString()}</td>
                                    <td className="p-6 font-black text-cyan-400 italic">${((v.tarifa || 0) * (config.comision/100)).toLocaleString()}</td>
                                    <td className="p-6">
                                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase rounded">Completado</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </>
            ) : (
              /* CHAT INTERFACE */
              <div className="flex flex-col h-full bg-slate-950/50 backdrop-blur-xl">
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-slate-900">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-black italic">
                      {activeChat.nombre[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">{activeChat.nombre}</h3>
                      <p className="text-[9px] text-cyan-400 uppercase font-black tracking-widest">Canal de Soporte Directo</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveChat(null)} className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Cerrar Chat</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-5 rounded-[2rem] ${m.senderId === 'admin' ? 'bg-cyan-500 text-slate-950 font-bold rounded-tr-none' : 'bg-white/5 text-white border border-white/10 rounded-tl-none'}`}>
                        <p className="text-xs leading-relaxed">{m.text}</p>
                        <p className={`text-[8px] mt-2 opacity-60 font-black uppercase ${m.senderId === 'admin' ? 'text-slate-900' : 'text-slate-400'}`}>
                          {m.timestamp?.toDate ? m.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={sendMessage} className="p-8 bg-slate-900 border-t border-white/10 flex gap-4">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje al conductor..."
                    className="flex-1 bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs focus:border-cyan-500 outline-none transition-all"
                  />
                  <button type="submit" className="px-8 bg-cyan-500 text-slate-950 font-black text-xs uppercase rounded-2xl hover:scale-105 transition-all">Enviar</button>
                </form>
              </div>
            )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 p-4 px-10 flex justify-between items-center text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] z-[100]">
        <div className="flex gap-6">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Network Stable</span>
            <span className="flex items-center gap-2 text-cyan-500"><ChatIcon /> Support Sync Active</span>
        </div>
        <div>CIMCO LOGISTICS © 2026</div>
      </footer>

      {/* RECARGA MODAL */}
      {modalRecarga && (
          <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-900 w-full max-w-sm rounded-[3rem] p-10 border border-white/10 shadow-2xl">
                  <h3 className="text-2xl font-black italic mb-2 tracking-tighter">Recarga Saldo</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase mb-8">{modalRecarga.nombre}</p>
                  <input 
                    type="number" 
                    autoFocus
                    placeholder="Monto $"
                    className="w-full bg-slate-950 border border-white/5 p-5 rounded-2xl text-xl font-black text-emerald-400 mb-6 outline-none focus:border-emerald-500"
                    onKeyDown={(e) => {
                      if(e.key === 'Enter') {
                         const val = e.target.value;
                         if(!val) return;
                         const newSaldo = (modalRecarga.saldoWallet || 0) + parseFloat(val);
                         updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', modalRecarga.id), { saldoWallet: newSaldo });
                         setModalRecarga(null);
                      }
                    }}
                    id="montoInput"
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setModalRecarga(null)} className="flex-1 py-4 bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                      <button 
                        onClick={async () => {
                            const val = document.getElementById('montoInput').value;
                            if(!val) return;
                            const newSaldo = (modalRecarga.saldoWallet || 0) + parseFloat(val);
                            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', modalRecarga.id), { saldoWallet: newSaldo });
                            setModalRecarga(null);
                        }}
                        className="flex-1 py-4 bg-emerald-500 text-slate-950 rounded-xl text-[10px] font-black uppercase"
                      >Confirmar</button>
                  </div>
              </div>
          </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.2); }
      `}} />
    </div>
  );
};

export default AdminDashboard;