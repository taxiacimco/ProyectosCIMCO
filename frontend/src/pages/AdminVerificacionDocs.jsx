import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Eye, CheckCircle, User, FileSearch, ShieldCheck, XCircle } from 'lucide-react';

const AdminVerificacionDocs = () => {
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchamos a los usuarios que tengan documentos cargados
    // NOTA: Usamos "usuarios" para coincidir con tu estructura de Firebase
    const q = query(collection(db, "usuarios"));
    
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.docs || u.estadoDocumentos); // Filtramos quienes tengan actividad de docs
      
      setConductores(lista);
      setLoading(false);
    });
    
    return () => unsub();
  }, []);

  const actualizarEstado = async (userId, nuevoEstado) => {
    try {
      const userRef = doc(db, "usuarios", userId);
      await updateDoc(userRef, {
        estadoDocumentos: nuevoEstado, // 'aprobado', 'rechazado', 'pendiente'
        fechaRevision: new Date().toISOString()
      });
      // Opcional: Podrías enviar una notificación aquí
    } catch (error) {
      console.error("Error al auditar:", error);
      alert("Error al actualizar el estado");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-cyan-500" size={20} />
            <h1 className="text-3xl font-black text-cyan-500 uppercase italic tracking-tighter">Auditoría de Documentos</h1>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">CIMCO Seguridad & Vigilancia de Flota</p>
        </div>
        
        <div className="bg-slate-900/80 border border-slate-800 px-6 py-2 rounded-2xl">
          <span className="text-[10px] font-black text-slate-500 uppercase block">Pendientes</span>
          <span className="text-xl font-black text-cyan-500">
            {conductores.filter(c => c.estadoDocumentos === 'pendiente').length}
          </span>
        </div>
      </header>

      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-20 animate-pulse text-slate-500 font-black uppercase text-xs">Sincronizando con base de datos...</div>
        ) : conductores.length === 0 ? (
          <div className="bg-slate-900/30 p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-800">
            <FileSearch className="mx-auto text-slate-800 mb-6" size={64} />
            <p className="text-slate-600 font-black uppercase text-sm tracking-widest">No se detectan archivos en el servidor</p>
          </div>
        ) : (
          conductores.map(c => (
            <div key={c.id} className="bg-[#0f172a] border border-slate-800 p-6 rounded-[2.5rem] flex flex-col lg:flex-row justify-between items-center transition-all hover:border-cyan-500/30 shadow-2xl">
              
              {/* Info del Conductor */}
              <div className="flex items-center gap-5 w-full lg:w-1/3">
                <div className="bg-cyan-500/10 p-5 rounded-[1.5rem] text-cyan-500 shadow-inner">
                  <User size={28} />
                </div>
                <div className="truncate">
                  <h3 className="font-black text-base uppercase tracking-tight truncate">
                    {c.nombre || c.email?.split('@')[0] || 'Conductor Nuevo'}
                  </h3>
                  <p className="text-[9px] text-slate-500 font-mono italic bg-slate-950 px-2 py-1 rounded-md inline-block mt-1">
                    UID: {c.id}
                  </p>
                </div>
              </div>

              {/* Botones de Documentos (SOAT / Licencia) */}
              <div className="flex flex-wrap gap-3 my-6 lg:my-0">
                <a href={c.docs?.soat?.url || c.urlSoat} target="_blank" rel="noreferrer" 
                   className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all border border-slate-700">
                  <Eye size={14} className="text-cyan-500" /> Ver SOAT
                </a>
                <a href={c.docs?.licencia?.url || c.urlLicencia} target="_blank" rel="noreferrer" 
                   className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all border border-slate-700">
                  <Eye size={14} className="text-cyan-500" /> Ver Licencia
                </a>
              </div>

              {/* Acciones de Auditoría */}
              <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
                <div className={`px-4 py-2 rounded-xl border font-black text-[9px] uppercase tracking-tighter ${
                  c.estadoDocumentos === 'aprobado' ? 'bg-green-500/10 border-green-500/50 text-green-500' :
                  c.estadoDocumentos === 'rechazado' ? 'bg-red-500/10 border-red-500/50 text-red-500' :
                  'bg-yellow-500/10 border-yellow-500/50 text-yellow-500'
                }`}>
                  {c.estadoDocumentos || 'POR REVISAR'}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => actualizarEstado(c.id, 'aprobado')}
                    className="p-3 bg-green-600 hover:bg-green-500 rounded-2xl transition-transform active:scale-95 text-white"
                    title="Aprobar Conductor"
                  >
                    <CheckCircle size={20} />
                  </button>
                  <button 
                    onClick={() => actualizarEstado(c.id, 'rechazado')}
                    className="p-3 bg-red-600 hover:bg-red-500 rounded-2xl transition-transform active:scale-95 text-white"
                    title="Rechazar Conductor"
                  >
                    <XCircle size={20} />
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

export default AdminVerificacionDocs;