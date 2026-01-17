import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebaseConfig';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, getDoc 
} from 'firebase/firestore';
import { Landmark, CheckCircle, XCircle, User, Phone, DollarSign, ExternalLink } from 'lucide-react';
import { notificarExito, notificarError } from '../utils/notificaciones';

const AdminRetiros = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    // Escuchar solicitudes de retiro pendientes
    const q = query(collection(db, "solicitudes_retiro"), where("estado", "==", "pendiente"));
    const unsub = onSnapshot(q, (snap) => {
      setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const finalizarRetiro = async (solicitud, status) => {
    setLoading(prev => ({ ...prev, [solicitud.id]: true }));
    try {
      const solicitudRef = doc(db, "solicitudes_retiro", solicitud.id);

      if (status === 'pagado') {
        // Marcamos como pagado. El saldo ya fue restado del balance del conductor al solicitar.
        await updateDoc(solicitudRef, {
          estado: 'pagado',
          fechaPago: new Date(),
          adminId: "CIMCO_CEO"
        });
        notificarExito("Retiro marcado como PAGADO correctamente.");
      } else {
        // Si rechazas, debemos DEVOLVER el saldo al conductor
        const userRef = doc(db, "users", solicitud.uid);
        const userSnap = await getDoc(userRef);
        const saldoActual = userSnap.data().balance || 0;

        await updateDoc(userRef, { balance: saldoActual + solicitud.monto });
        await updateDoc(solicitudRef, { estado: 'rechazado', fechaProcesado: new Date() });
        
        notificarError("Retiro Rechazado", "El saldo ha sido devuelto al conductor.");
      }
    } catch (error) {
      notificarError("Error", "No se pudo procesar la acción.");
    } finally {
      setLoading(prev => ({ ...prev, [solicitud.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
          CONTROL DE PAGOS A CONDUCTORES
        </h1>
        <p className="text-slate-400 text-sm">Gestiona las salidas de dinero de la plataforma.</p>
      </header>

      <div className="grid gap-6">
        {solicitudes.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-800">
            <Landmark className="mx-auto text-slate-800 mb-4" size={50} />
            <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">No hay retiros pendientes por pagar</p>
          </div>
        ) : (
          solicitudes.map(s => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col lg:flex-row justify-between items-center shadow-2xl transition-all hover:border-orange-500/30">
              
              {/* INFO CONDUCTOR */}
              <div className="flex flex-col gap-2 w-full lg:w-1/3">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 p-3 rounded-2xl">
                    <User className="text-orange-500" size={24} />
                  </div>
                  <div>
                    <h3 className="font-black uppercase text-sm tracking-tight">{s.email.split('@')[0]}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">{s.uid}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-slate-400">
                  <Phone size={14} />
                  <span className="text-xs font-bold">Consultar Nequi en base de datos</span>
                </div>
              </div>

              {/* MONTO A PAGAR */}
              <div className="my-6 lg:my-0 text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Monto a Transferir</p>
                <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800 inline-block">
                  <span className="text-4xl font-black text-white">
                    <span className="text-orange-500 text-xl mr-1">$</span>
                    {s.monto.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* ACCIONES DE PAGO */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <button 
                  onClick={() => finalizarRetiro(s, 'pagado')}
                  disabled={loading[s.id]}
                  className="bg-white text-black hover:bg-orange-500 hover:text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95"
                >
                  <CheckCircle size={18} /> {loading[s.id] ? "Procesando..." : "Ya le pagué"}
                </button>
                
                <button 
                  onClick={() => finalizarRetiro(s, 'rechazado')}
                  disabled={loading[s.id]}
                  className="bg-slate-800 text-slate-500 hover:bg-red-600 hover:text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  <XCircle size={18} /> Rechazar
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      <footer className="mt-12 p-6 bg-orange-500/5 rounded-3xl border border-orange-500/10">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="text-orange-500 font-bold">💡 RECOMENDACIÓN CEO:</span> Antes de hacer clic en <b>"Ya le pagué"</b>, verifica en tu App de Nequi o Bancolombia que la transferencia fue exitosa. Este botón es irreversible para el conductor.
        </p>
      </footer>
    </div>
  );
};

export default AdminRetiros;