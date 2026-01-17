import React, { useState } from 'react';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ModalGastos = ({ isOpen, onClose }) => {
  const [tipo, setTipo] = useState('Gasolina');
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');

  if (!isOpen) return null;

  const guardarGasto = async (e) => {
    e.preventDefault();
    if (!monto) return;

    try {
      await addDoc(collection(db, "users", auth.currentUser.uid, "gastos"), {
        tipo,
        monto: Number(monto),
        nota,
        fecha: serverTimestamp()
      });
      setMonto('');
      setNota('');
      onClose();
      alert("✅ Gasto registrado");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[3000] flex items-end sm:items-center justify-center">
      <div className="bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom">
        <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
          💸 Registrar Gasto
        </h2>
        
        <form onSubmit={guardarGasto} className="space-y-4">
          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase">Categoría</label>
            <select 
              value={tipo} 
              onChange={(e) => setTipo(e.target.value)}
              className="w-full bg-slate-800 border-none rounded-xl p-3 text-white outline-none ring-1 ring-slate-700"
            >
              <option>Gasolina</option>
              <option>Peajes</option>
              <option>Comida</option>
              <option>Mantenimiento</option>
              <option>Otros</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase">Monto ($)</label>
            <input 
              type="number" 
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full bg-slate-800 border-none rounded-xl p-3 text-white outline-none ring-1 ring-slate-700"
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase">Nota (Opcional)</label>
            <input 
              type="text" 
              placeholder="Ej: Gasolinera La 22"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full bg-slate-800 border-none rounded-xl p-3 text-white outline-none ring-1 ring-slate-700"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-400 font-bold">CANCELAR</button>
            <button type="submit" className="flex-[2] bg-cyan-500 text-slate-900 py-3 rounded-xl font-black">GUARDAR GASTO</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalGastos;