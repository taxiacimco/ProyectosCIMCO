import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig'; 
import { collection, query, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { 
  Eye, CheckCircle, User, FileSearch, ShieldCheck, 
  XCircle, Clock, ExternalLink, Smartphone, AlertCircle, MapPin
} from 'lucide-react';

const appId = 'taxiacimco-app';

const AdminVerificacionDocs = () => {
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔍 Filtramos usuarios con roles operativos
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'usuarios'),
      where("role", "in", ["mototaxi", "motocarga", "conductorinter", "motoparrillero"])
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Ordenamiento: Pendientes arriba para atención inmediata
      const prioridad = { PENDIENTE: 1, rechazado: 2, aprobado: 3 };
      lista.sort((a, b) => {
        const estadoA = a.documentacion?.estado || 'S/D';
        const estadoB = b.documentacion?.estado || 'S/D';
        return (prioridad[estadoA] || 9) - (prioridad[estadoB] || 9);
      });
      
      setConductores(lista);
      setLoading(false);
    }, (error) => {
      console.error("Error en Auditoría:", error);
      setLoading(false);
    });
    
    return () => unsub();
  }, []);

  const actualizarEstado = async (userId, nuevoEstado) => {
    const msg = nuevoEstado === 'aprobado' 
      ? "¿AUTORIZAR CONDUCTOR? Esto le permitirá recibir viajes y aparecer en el mapa."
      : "¿RECHAZAR DOCUMENTOS? El conductor deberá subirlos nuevamente.";
    
    if (!window.confirm(msg)) return;

    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', userId);
      
      await updateDoc(userRef, {
        "documentacion.estado": nuevoEstado,
        "documentacion.fechaAuditoria": new Date().toISOString(),
        "documentacion.verificado": nuevoEstado === 'aprobado',
        // Campos de activación operativa
        accountStatus: nuevoEstado === 'aprobado' ? 'active' : 'suspended',
        habilitado: nuevoEstado === 'aprobado',
        verificado: nuevoEstado === 'aprobado'
      });
      
      alert(nuevoEstado === 'aprobado' ? "✅ Conductor activado con éxito" : "❌ Documentación rechazada");
    } catch (error) {
      console.error("Error al auditar:", error);
      alert("Error de permisos: Verifica que seas Admin en Firebase.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans pb-24">
      
      {/* HEADER DE CONTROL */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 p-10 rounded-[3.5rem] border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-2xl shadow-xl shadow-yellow-500/20">
              <ShieldCheck className="text-slate-950" size={32} />
            </div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
              CONTROL <span className="text-yellow-400 text-5xl">CIMCO</span>
            </h1>
          </div>
          <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.4em] ml-1">
            Auditoría de Documentación Legal y Flota
          </p>
        </div>
        
        <div className="flex gap-6 relative z-10">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 px-10 py-5 rounded-3xl flex flex-col items-center min-w-[140px]">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Por Revisar</span>
            <span className="text-4xl font-black text-yellow-400">
              {conductores.filter(c => c.documentacion?.estado === 'PENDIENTE').length}
            </span>
          </div>
        </div>
      </header>

      {/* MONITOR DE CONDUCTORES */}
      <div className="max-w-7xl mx-auto grid gap-6">
        {loading ? (
          <div className="flex flex-col items-center py-32 gap-6">
            <div className="w-16 h-16 border-t-4 border-yellow-400 border-solid rounded-full animate-spin"></div>
            <p className="text-slate-500 font-black uppercase text-xs tracking-[0.5em]">Cargando Expedientes...</p>
          </div>
        ) : conductores.length === 0 ? (
          <div className="bg-slate-900/20 p-24 rounded-[4rem] text-center border-2 border-dashed border-white/5">
            <FileSearch className="mx-auto text-slate-800 mb-8" size={80} />
            <p className="text-slate-600 font-black uppercase text-base tracking-[0.3em]">No hay conductores registrados</p>
          </div>
        ) : (
          conductores.map(c => (
            <div key={c.id} className={`group bg-slate-900/40 border p-8 rounded-[3rem] flex flex-col lg:flex-row justify-between items-center transition-all duration-500 hover:bg-slate-900/70 ${c.documentacion?.verificado ? 'border-emerald-500/20 opacity-70' : 'border-white/10 shadow-2xl shadow-yellow-400/5'}`}>
              
              {/* IDENTIDAD */}
              <div className="flex items-center gap-8 w-full lg:w-1/3">
                <div className={`p-6 rounded-[2rem] shadow-inner ${c.documentacion?.verificado ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                  <User size={36} />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${c.accountStatus === 'active' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">UID: {c.id.slice(0,6)}...</span>
                  </div>
                  <h3 className="font-black text-2xl uppercase tracking-tighter text-white leading-none mb-2">
                    {c.nombre || 'Sin Nombre'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-yellow-400 font-black bg-yellow-400/10 px-2 py-1 rounded-lg border border-yellow-400/20 uppercase italic">
                      {c.role}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Smartphone size={12} /> {c.telefono}
                    </span>
                  </div>
                </div>
              </div>

              {/* VISUALIZADOR DE DOCUMENTOS (URLs del paso anterior) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-8 lg:my-0">
                <DocumentButton label="Cédula" url={c.documentacion?.urls?.fotoCedula} />
                <DocumentButton label="Licencia" url={c.documentacion?.urls?.fotoLicencia} />
                <DocumentButton label="SOAT" url={c.documentacion?.urls?.fotoSOAT} />
              </div>

              {/* ACCIONES DEL CEO */}
              <div className="flex items-center gap-4 w-full lg:w-auto justify-end border-t lg:border-t-0 border-white/5 pt-8 lg:pt-0">
                <StatusBadge status={c.documentacion?.estado} />

                <div className="flex gap-3">
                  <button 
                    onClick={() => actualizarEstado(c.id, 'aprobado')}
                    disabled={c.documentacion?.estado === 'aprobado'}
                    className={`p-5 rounded-3xl transition-all active:scale-90 ${c.documentacion?.estado === 'aprobado' ? 'bg-emerald-500/10 text-emerald-900 opacity-20 cursor-not-allowed' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'}`}
                  >
                    <CheckCircle size={24} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={() => actualizarEstado(c.id, 'rechazado')}
                    className="p-5 bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-3xl transition-all active:scale-90"
                  >
                    <XCircle size={24} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Componente para botones de documentos
const DocumentButton = ({ label, url }) => (
  <a 
    href={url || '#'} 
    target="_blank" 
    rel="noreferrer" 
    onClick={(e) => !url && e.preventDefault()}
    className={`relative px-4 py-4 rounded-3xl text-[10px] font-black uppercase flex flex-col items-center justify-center gap-2 transition-all border ${
      url 
      ? 'bg-slate-950 border-white/10 text-white hover:border-yellow-400/50 hover:bg-slate-800' 
      : 'bg-black/20 border-white/5 text-slate-700 cursor-not-allowed'
    }`}
  >
    <Eye size={18} className={url ? "text-yellow-400" : "text-slate-800"} /> 
    <span>{label}</span>
    {url && <ExternalLink size={10} className="absolute top-2 right-2 opacity-30 text-yellow-400" />}
  </a>
);

// Componente para el badge de estado
const StatusBadge = ({ status }) => {
  const s = status?.toUpperCase();
  const styles = {
    APROBADO: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
    RECHAZADO: 'bg-rose-500/10 border-rose-500/20 text-rose-500',
    PENDIENTE: 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse',
    DEFAULT: 'bg-slate-800 border-white/5 text-slate-500'
  };
  const current = styles[s] || styles.DEFAULT;

  return (
    <div className={`px-4 py-2 rounded-2xl border font-black text-[10px] flex items-center gap-2 ${current}`}>
      {s === 'APROBADO' ? <ShieldCheck size={12} /> : <Clock size={12} />}
      {s || 'SIN DATOS'}
    </div>
  );
};

export default AdminVerificacionDocs;