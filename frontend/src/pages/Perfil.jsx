import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase/firebaseConfig';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Camera, Star, MapPin, Award, Share2 } from 'lucide-react';
import { notificarExito, notificarError } from '../utils/notificaciones';

const Perfil = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (snap) => {
      setUser(snap.data());
    });
    return () => unsub();
  }, []);

  const subirFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const storageRef = ref(storage, `perfiles/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: url });
      notificarExito("Foto de perfil actualizada");
    } catch (error) {
      notificarError("Error al subir", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="relative flex flex-col items-center mb-8">
          <div className="w-32 h-32 rounded-full border-4 border-cyan-500 overflow-hidden bg-slate-800 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <User size={64} className="m-auto mt-6 text-slate-600" />
            )}
          </div>
          <label className="absolute bottom-0 right-1/3 bg-cyan-600 p-2 rounded-full cursor-pointer hover:bg-cyan-500 transition-all">
            <Camera size={20} />
            <input type="file" className="hidden" onChange={subirFoto} disabled={loading} />
          </label>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-2xl font-black uppercase italic">{user?.displayName || "Usuario CIMCO"}</h2>
          <p className="text-cyan-500 text-xs font-bold tracking-widest uppercase">{user?.rol || "Cliente"}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 text-center">
            <Star className="mx-auto text-yellow-500 mb-2" size={20} />
            <p className="text-xl font-black">{user?.rating || "5.0"}</p>
            <p className="text-[10px] text-slate-500 uppercase">Calificación</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 text-center">
            <Award className="mx-auto text-purple-500 mb-2" size={20} />
            <p className="text-xl font-black">{user?.viajesCompletados || "0"}</p>
            <p className="text-[10px] text-slate-500 uppercase">Viajes</p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-6 border border-slate-800">
          <h3 className="text-xs font-black text-slate-500 uppercase mb-4">Tu Código de Referido</h3>
          <div className="bg-slate-950 p-4 rounded-2xl flex justify-between items-center border border-dashed border-cyan-500/30">
            <span className="text-xl font-mono font-black text-cyan-400">{user?.referralCode || "CIMCO-PRO"}</span>
            <button className="text-cyan-500 hover:text-cyan-300">
              <Share2 size={20} />
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-4 text-center">Comparte tu código y gana $500 por cada nuevo usuario.</p>
        </div>
      </div>
    </div>
  );
};

export default Perfil;