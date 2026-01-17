import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Landmark, ArrowUpRight, AlertTriangle, History } from 'lucide-react';
import { notificarExito, notificarError } from '../utils/notificaciones';

const PanelRetiros = () => {
  const [balance, setBalance] = useState(0);
  const [montoRetiro, setMontoRetiro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    return () => unsub();
  }, []);

  const solicitarRetiro = async (e) => {
    e.preventDefault();
    const valor = Number(montoRetiro);

    if (valor < 10000) return notificarError("Monto mínimo", "El retiro mínimo es de $10,000 pesos.");
    if (valor > balance) return notificarError("Saldo insuficiente", "No tienes suficiente saldo disponible.");

    setLoading(true);
    try {
      const user = auth.currentUser;

      // USAMOS TRANSACCIÓN: Restamos el saldo y creamos la solicitud al mismo tiempo
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", user.uid);
        
        // 1. Restar el saldo inmediatamente (bloquearlo)
        transaction.update(userRef, {
          balance: balance - valor
        });

        // 2. Crear la solicitud de retiro para el Admin
        const solicitudRef = collection(db, "solicitudes_retiro");
        transaction.set(doc(solicitudRef), {
          uid: user.uid,
          email: user.email,
          monto: valor,
          estado: 'pendiente',
          fecha: serverTimestamp(),
          tipo: 'Retiro Saldo'
        });
      });

      notificarExito("Solicitud enviada. Recibirás tu dinero en máximo 24h.");
      setMontoRetiro('');
    } catch (error) {
      notificarError("Error", "No se pudo procesar el retiro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="max-w-md mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-black text-cyan-400">RETIRAR GANANCIAS</h1>
          <p className="text-xs text-slate-500">Convierte tu saldo CIMCO en dinero real</p>
        </header>

        {/* TARJETA DE SALDO */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] text-center shadow-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Disponible para retiro</p>
          <h2 className="text-4xl font-black text-white mt-2">${balance.toLocaleString()}</h2>
        </div>

        {/* FORMULARIO DE RETIRO */}
        <form onSubmit={solicitarRetiro} className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
            <label className="text-xs font-bold text-slate-400 mb-2 block">¿Cuánto deseas retirar?</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-500">$</span>
                <input 
                    type="number" required placeholder="0.00"
                    value={montoRetiro} onChange={(e) => setMontoRetiro(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-4 pl-10 rounded-2xl outline-none focus:border-cyan-500 text-xl font-black"
                />
            </div>
            <p className="text-[9px] text-slate-600 mt-3 flex items-center gap-1">
                <AlertTriangle size={10} /> Se enviará a tu cuenta Nequi registrada.
            </p>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 active:scale-95 transition-all"
          >
            {loading ? "PROCESANDO..." : <><Landmark size={18}/> SOLICITAR TRANSFERENCIA</>}
          </button>
        </form>

        <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-dashed border-slate-800">
            <h3 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-4">
                <History size={14} /> Historial de Retiros
            </h3>
            <p className="text-[10px] text-slate-600 italic text-center">Tus solicitudes aparecerán aquí una vez generadas.</p>
        </div>
      </div>
    </div>
  );
};

export default PanelRetiros;