import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, XCircle, User } from 'lucide-react';

const db = getFirestore();

const AdminRetiros = () => {
  const [solicitudes, setSolicitudes] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "solicitudes_retiro"), where("estado", "==", "pendiente"));
    return onSnapshot(q, (snap) => setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const procesarRetiro = async (solicitud, nuevoEstado) => {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "usuarios", solicitud.uid);
        const solRef = doc(db, "solicitudes_retiro", solicitud.id);
        
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw "Usuario inexistente";

        if (nuevoEstado === 'rechazado') {
          const saldoActual = userDoc.data().balance || 0;
          transaction.update(userRef, { balance: saldoActual + solicitud.monto });
        }

        transaction.update(solRef, { 
          estado: nuevoEstado, 
          fechaProcesado: serverTimestamp() 
        });
      });
      alert("Operación completada con éxito.");
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-8">
      <h2 className="text-xl font-semibold mb-6">Solicitudes de Retiro</h2>
      <div className="grid gap-4">
        {solicitudes.map(s => (
          <div key={s.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-800 rounded-xl"><User size={20} /></div>
              <div>
                <p className="text-sm font-medium">{s.email}</p>
                <p className="text-lg font-bold text-blue-400">${s.monto.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => procesarRetiro(s, 'pagado')} className="p-2 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors"><CheckCircle /></button>
              <button onClick={() => procesarRetiro(s, 'rechazado')} className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"><XCircle /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRetiros;