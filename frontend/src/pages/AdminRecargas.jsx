import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebaseConfig';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, increment, runTransaction 
} from 'firebase/firestore';
import { CheckCircle, XCircle, Eye, DollarSign, Clock, User } from 'lucide-react';

const AdminRecargas = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    // Escuchar solo las solicitudes que están en estado "pendiente"
    const q = query(collection(db, "solicitudes_recarga"), where("estado", "==", "pendiente"));
    const unsub = onSnapshot(q, (snap) => {
      setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const procesarPago = async (solicitud, nuevoEstado) => {
    setLoading(prev => ({ ...prev, [solicitud.id]: true }));
    try {
      if (nuevoEstado === 'aprobado') {
        // USAMOS UNA TRANSACCIÓN PARA EVITAR ERRORES DE DINERO
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "users", solicitud.uid);
          const solicitudRef = doc(db, "solicitudes_recarga", solicitud.id);

          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) throw "El usuario no existe";

          // 1. Sumar el saldo al conductor
          transaction.update(userRef, {
            balance: increment(solicitud.monto)
          });

          // 2. Marcar solicitud como aprobada
          transaction.update(solicitudRef, {
            estado: 'aprobado',
            fechaProcesado: new Date()
          });
        });
        alert("✅ Saldo cargado exitosamente al conductor.");
      } else {
        // Solo rechazar
        await updateDoc(doc(db, "solicitudes_recarga", solicitud.id), {
          estado: 'rechazado',
          fechaProcesado: new Date()
        });
        alert("❌ Pago rechazado.");
      }
    } catch (error) {
      console.error(error);
      alert("Error al procesar: " + error);
    } finally {
      setLoading(prev => ({ ...prev, [solicitud.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500">
          APROBACIÓN DE PAGOS CEO
        </h1>
        <p className="text-slate-400 text-sm italic">Valida los comprobantes de Nequi y Bancolombia aquí.</p>
      </header>

      <div className="grid gap-6">
        {solicitudes.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-800">
            <Clock className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hay pagos pendientes por revisar</p>
          </div>
        ) : (
          solicitudes.map(s => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] flex flex-col lg:flex-row gap-6 items-center shadow-xl">
              
              {/* VISTA PREVIA COMPROBANTE */}
              <div className="w-full lg:w-48 h-64 bg-black rounded-3xl overflow-hidden relative group">
                <img 
                  src={s.comprobanteUrl} 
                  alt="Comprobante" 
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                />
                <a 
                  href={s.comprobanteUrl} target="_blank" rel="noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all text-xs font-bold"
                >
                  <Eye size={18} className="mr-2" /> VER GRANDE
                </a>
              </div>

              {/* DATOS DEL CONDUCTOR */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400">
                  <User size={16} />
                  <span className="text-sm font-black uppercase tracking-tighter">{s.nombre}</span>
                </div>
                <p className="text-xs text-slate-500 font-mono">{s.email}</p>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 inline-block mt-4">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Monto a cargar</p>
                  <p className="text-3xl font-black text-green-500 flex items-center gap-1">
                    <span className="text-sm opacity-50">$</span>{s.monto}
                  </p>
                </div>
              </div>

              {/* ACCIONES CEO */}
              <div className="flex flex-col gap-3 w-full lg:w-auto">
                <button 
                  onClick={() => procesarPago(s, 'aprobado')}
                  disabled={loading[s.id]}
                  className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all active:scale-95"
                >
                  <CheckCircle size={18} /> {loading[s.id] ? "Procesando..." : "Aprobar Recarga"}
                </button>
                <button 
                  onClick={() => procesarPago(s, 'rechazado')}
                  disabled={loading[s.id]}
                  className="bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-500 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                >
                  <XCircle size={18} /> Rechazar
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminRecargas;