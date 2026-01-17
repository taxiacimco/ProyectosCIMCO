import React, { useState } from 'react';
import { db, auth, storage } from '../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ShieldCheck, FileText, Upload, AlertCircle } from 'lucide-react';
import { notificarExito, notificarError } from '../utils/notificaciones';

const SeguridadDocumentos = () => {
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState({ soat: null, licencia: null });

  const subirDocumento = async (e, tipo) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      // Subir a Firebase Storage
      const storageRef = ref(storage, `documentos/${user.uid}/${tipo}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Actualizar Firestore con la URL y estado pendiente
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        [`docs.${tipo}`]: {
          url: url,
          estado: 'pendiente',
          fechaSubida: new Date()
        },
        documentosVerificados: false
      });

      notificarExito(`${tipo.toUpperCase()} subido correctamente. Esperando validación.`);
    } catch (error) {
      notificarError("Error", "No se pudo subir el archivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto">
        <header className="mb-8 flex items-center gap-3">
          <div className="bg-cyan-500/20 p-3 rounded-2xl">
            <ShieldCheck className="text-cyan-500" size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase">Validación Oficial</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Seguridad Vial CIMCO</p>
          </div>
        </header>

        <div className="space-y-4">
          {/* TARJETA SOAT */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm flex items-center gap-2">
                <FileText size={16} className="text-cyan-500" /> SOAT VIGENTE
              </h3>
              <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full font-bold">REQUERIDO</span>
            </div>
            <input type="file" id="soat" className="hidden" onChange={(e) => subirDocumento(e, 'soat')} />
            <label htmlFor="soat" className="w-full bg-slate-950 border-2 border-dashed border-slate-800 p-8 rounded-2xl flex flex-col items-center cursor-pointer hover:border-cyan-500 transition-all">
              <Upload className="text-slate-600 mb-2" />
              <span className="text-xs text-slate-400">Subir foto del SOAT</span>
            </label>
          </div>

          {/* TARJETA LICENCIA */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm flex items-center gap-2">
                <FileText size={16} className="text-cyan-500" /> LICENCIA DE CONDUCCIÓN
              </h3>
              <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full font-bold">REQUERIDO</span>
            </div>
            <input type="file" id="licencia" className="hidden" onChange={(e) => subirDocumento(e, 'licencia')} />
            <label htmlFor="licencia" className="w-full bg-slate-950 border-2 border-dashed border-slate-800 p-8 rounded-2xl flex flex-col items-center cursor-pointer hover:border-cyan-500 transition-all">
              <Upload className="text-slate-600 mb-2" />
              <span className="text-xs text-slate-400">Subir foto de la Licencia</span>
            </label>
          </div>
        </div>

        <div className="mt-8 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex gap-3 italic">
          <AlertCircle className="text-blue-400 shrink-0" size={18} />
          <p className="text-[10px] text-blue-200">
            Una vez subas ambos documentos, el equipo legal de CIMCO revisará la autenticidad en un plazo de 12 horas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SeguridadDocumentos;