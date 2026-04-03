import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebaseConfig';
import { 
  collection, query, where, onSnapshot, doc, 
  increment, runTransaction, serverTimestamp, updateDoc, orderBy 
} from 'firebase/firestore';
import { 
  CheckCircle, XCircle, Clock, User, 
  ShieldCheck, AlertTriangle, ExternalLink, TrendingUp, Search, Wallet
} from 'lucide-react';
import { notificarExito, notificarError } from '../utils/notificaciones';

const appId = 'taxiacimco-app'; 

const AdminRecargas = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState({});
  const [stats, setStats] = useState({ totalPendiente: 0, conductoresEsperando: 0 });
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    // Escuchamos solicitudes PENDIENTES ordenadas por las más antiguas primero
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes_recarga'), 
      where("estado", "==", "pendiente"),
      orderBy("fechaSolicitud", "asc")
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSolicitudes(data);
      
      const total = data.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
      setStats({
        totalPendiente: total,
        conductoresEsperando: data.length
      });
    }, (error) => {
      console.error("Error en snapshot:", error);
    });

    return () => unsub();
  }, []);

  const procesarPago = async (solicitud, nuevoEstado) => {
    const confirmMsg = nuevoEstado === 'aprobado' 
      ? `¿CARGAR $${Number(solicitud.monto).toLocaleString()} a ${solicitud.nombre}?`
      : `¿RECHAZAR la solicitud de ${solicitud.nombre}?`;
    
    if (!window.confirm(confirmMsg)) return;

    setLoading(prev => ({ ...prev, [solicitud.id]: true }));
    
    try {
      if (nuevoEstado === 'aprobado') {
        // --- TRANSACCIÓN ATÓMICA CIMCO ---
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', solicitud.uid);
          const solicitudRef = doc(db, 'artifacts', appId, 'public', 'data', 'solicitudes_recarga', solicitud.id);

          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) throw new Error("El conductor no existe.");

          // 1. Aumentar saldo Wallet
          transaction.update(userRef, {
            saldoWallet: increment(Number(solicitud.monto)),
            ultimaRecarga: serverTimestamp(),
            estadoCuenta: 'Activo' // Lo reactivamos si estaba bloqueado
          });

          // 2. Marcar solicitud como aprobada
          transaction.update(solicitudRef, {
            estado: 'aprobado',
            fechaProcesado: serverTimestamp(),
            procesadoPor: 'ADMIN_CEO'
          });

          // 3. Registro Histórico de Auditoría
          const logRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'historial_caja_global'));
          transaction.set(logRef, {
            tipo: 'ingreso_recarga',
            uid: solicitud.uid,
            nombre: solicitud.nombre,
            monto: Number(solicitud.monto),
            fecha: serverTimestamp(),
            referencia: solicitud.id
          });
        });
        notificarExito("Carga exitosa. Saldo actualizado.");
      } else {
        // Rechazo
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'solicitudes_recarga', solicitud.id), {
          estado: 'rechazado',
          fechaProcesado: serverTimestamp(),
          motivoRechazo: "Comprobante no válido o datos inconsistentes"
        });
        notificarError("Solicitud rechazada.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("⚠️ Error Crítico: " + error.message);
    } finally {
      setLoading(prev => ({ ...prev, [solicitud.id]: false }));
    }
  };

  const solicitudesFiltradas = solicitudes.filter(s => 
    s.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-10">
      
      {/* CENTRO DE MANDO CEO */}
      <header className="max-w-7xl mx-auto mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-cyan-500/20 rounded-[2rem] border border-cyan-500/30">
              <ShieldCheck className="text-cyan-400" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Caja Central</h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Cimco Technologies Admin</p>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
             <div className="flex-1 md:flex-none bg-slate-900/80 border border-white/5 p-5 rounded-[2rem] min-w-[200px]">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Total por Validar</p>
                <p className="text-3xl font-black text-emerald-400 tracking-tighter">
                  ${stats.totalPendiente.toLocaleString()}
                </p>
             </div>
             <div className="bg-slate-900/80 border border-white/5 p-5 rounded-[2rem]">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Pendientes</p>
                <p className="text-3xl font-black text-white">{stats.conductoresEsperando}</p>
             </div>
          </div>
        </div>

        {/* BUSCADOR */}
        <div className="mt-10 relative max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar conductor..."
            className="w-full bg-slate-900 border border-white/10 py-4 pl-14 pr-6 rounded-2xl text-sm font-bold focus:border-cyan-500 outline-none transition-all"
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </header>

      {/* LISTADO DE SOLICITUDES */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 gap-4">
        {solicitudesFiltradas.length === 0 ? (
          <div className="text-center py-24 bg-slate-900/20 border-2 border-dashed border-white/5 rounded-[4rem]">
             <Clock className="mx-auto text-slate-800 mb-4" size={60} />
             <p className="text-slate-600 font-black uppercase text-xs tracking-widest">Sin solicitudes nuevas</p>
          </div>
        ) : (
          solicitudesFiltradas.map(s => (
            <div key={s.id} className="bg-slate-900/40 border border-white/5 p-2 rounded-[3rem] flex flex-col lg:flex-row items-center gap-6 hover:border-cyan-500/30 transition-all">
              
              {/* COMPROBANTE - Miniatura con Zoom */}
              <div className="relative group w-full lg:w-64 h-72 rounded-[2.5rem] overflow-hidden m-2 shadow-2xl">
                <img 
                  src={s.comprobanteUrl || 'https://via.placeholder.com/400x600?text=No+Image'} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  alt="Recarga"
                />
                <a href={s.comprobanteUrl} target="_blank" rel="noreferrer" 
                   className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="text-white" size={30} />
                </a>
              </div>

              {/* DATOS DEL CONDUCTOR */}
              <div className="flex-1 p-4 w-full">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-500">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic uppercase">{s.nombre}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">UID: {s.uid?.slice(0, 15)}...</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Monto Reportado</p>
                    <p className="text-2xl font-black text-white">${Number(s.monto).toLocaleString()}</p>
                  </div>
                  <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Método Pago</p>
                    <p className="text-xs font-black text-emerald-500 uppercase">{s.metodo || 'NEQUI'}</p>
                  </div>
                  <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Saldo Actual</p>
                    <div className="flex items-center gap-2">
                      <Wallet size={12} className="text-slate-500" />
                      <p className="text-xs font-bold text-slate-300">${s.saldoPrevio?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                  <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Solicitado Hace</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {s.fechaSolicitud?.toDate().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* ACCIONES */}
              <div className="p-6 flex flex-col gap-3 w-full lg:w-64">
                <button 
                  onClick={() => procesarPago(s, 'aprobado')}
                  disabled={loading[s.id]}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                >
                  {loading[s.id] ? "PROCESANDO..." : <><CheckCircle size={18} /> CARGAR SALDO</>}
                </button>
                <button 
                  onClick={() => procesarPago(s, 'rechazado')}
                  disabled={loading[s.id]}
                  className="w-full bg-transparent border border-white/10 hover:border-red-500/50 text-slate-500 hover:text-red-500 py-4 rounded-[2rem] font-black uppercase text-[9px] tracking-widest transition-all"
                >
                  RECHAZAR PAGO
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default AdminRecargas;