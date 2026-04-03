import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase/firebaseConfig';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  User, Camera, Star, Award, Share2, 
  ShieldAlert, CheckCircle, Clock, ChevronRight, FileText 
} from 'lucide-react';
import { notificarExito, notificarError } from '../utils/notificaciones';
import RegistroDocumentos from '../components/RegistroDocumentos';

const appId = 'taxiacimco-app';

const Perfil = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Sincronización con la ruta maestra de usuarios
    const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', auth.currentUser.uid);

    const unsub = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        setUser(snap.data());
      }
    }, (error) => {
      console.error("Error al obtener perfil:", error);
    });

    return () => unsub();
  }, []);

  const subirFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notificarError("Archivo no válido. Usa una imagen.");
      return;
    }

    setLoading(true);
    try {
      const storageRef = ref(storage, `perfiles/${auth.currentUser.uid}/avatar_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', auth.currentUser.uid);
      await updateDoc(userDocRef, { photoURL: url });

      notificarExito("Foto de perfil actualizada");
    } catch (error) {
      notificarError("Error al subir la foto.");
    } finally {
      setLoading(false);
    }
  };

  // Lógica para determinar el estado de la documentación
  const docStatus = user?.documentacion?.estado || 'PENDIENTE_SUBIDA';

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-24 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* FOTO DE PERFIL DINÁMICA */}
        <div className="relative flex flex-col items-center mb-6">
          <div className="w-32 h-32 rounded-[2.5rem] border-4 border-yellow-400/20 overflow-hidden bg-slate-900 shadow-2xl relative">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-700">
                <User size={60} />
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          <label className="absolute bottom-0 right-[30%] bg-yellow-400 p-2.5 rounded-2xl cursor-pointer hover:scale-110 transition-all shadow-xl shadow-yellow-400/20">
            <Camera size={18} className="text-slate-950" />
            <input type="file" className="hidden" onChange={subirFoto} disabled={loading} accept="image/*" />
          </label>
        </div>

        {/* INFO USUARIO */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black uppercase italic italic">{user?.nombre || "CIMCO USER"}</h2>
          <div className="flex justify-center gap-2 mt-2">
            <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase text-slate-400 tracking-widest">
              {user?.role || "Pasajero"}
            </span>
          </div>
        </div>

        {/* SECCIÓN CRÍTICA: ESTADO DE DOCUMENTOS */}
        <div className="mb-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-2">Estado de Cuenta</p>
          
          <div 
            onClick={() => docStatus !== 'aprobado' && setShowDocsModal(true)}
            className={`p-5 rounded-[2rem] border transition-all active:scale-95 cursor-pointer ${
              docStatus === 'aprobado' 
              ? 'bg-emerald-500/10 border-emerald-500/20' 
              : docStatus === 'PENDIENTE' 
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-rose-500/10 border-rose-500/20 animate-pulse'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${docStatus === 'aprobado' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-white'}`}>
                  {docStatus === 'aprobado' ? <CheckCircle size={20} /> : <ShieldAlert size={20} />}
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-tight">Verificación de Seguridad</h4>
                  <p className="text-[10px] font-bold opacity-60 uppercase">
                    {docStatus === 'aprobado' ? 'Operador Autorizado' : 'Acción Requerida'}
                  </p>
                </div>
              </div>
              {docStatus !== 'aprobado' && <ChevronRight size={20} className="text-slate-500" />}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-900/50 p-5 rounded-[2rem] border border-white/5 text-center">
            <Star className="mx-auto text-yellow-400 mb-2" size={20} />
            <p className="text-xl font-black italic">{user?.rating || "5.0"}</p>
            <p className="text-[9px] text-slate-500 uppercase font-black">Rating</p>
          </div>
          <div className="bg-slate-900/50 p-5 rounded-[2rem] border border-white/5 text-center">
            <Award className="mx-auto text-cyan-400 mb-2" size={20} />
            <p className="text-xl font-black italic">{user?.viajesCompletados || "0"}</p>
            <p className="text-[9px] text-slate-500 uppercase font-black">Servicios</p>
          </div>
        </div>

        {/* REFERIDOS */}
        <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-4 flex items-center gap-2">
              <Share2 size={14} className="text-cyan-400"/> Sistema de Referidos
            </h3>
            <div className="bg-slate-950 p-4 rounded-2xl flex justify-between items-center border border-dashed border-cyan-500/30">
              <span className="text-lg font-mono font-black text-cyan-400 uppercase">
                {user?.referralCode || "CIMCO-PRO"}
              </span>
              <button 
                className="bg-cyan-500 text-slate-950 p-2 rounded-xl active:scale-90 transition-all"
                onClick={() => {
                  navigator.clipboard.writeText(user?.referralCode || "CIMCO-PRO");
                  notificarExito("Código copiado");
                }}
              >
                <FileText size={18} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE DOCUMENTOS (OPCIÓN A) */}
      {showDocsModal && (
        <RegistroDocumentos onComplete={() => setShowDocsModal(false)} />
      )}
    </div>
  );
};

export default Perfil;