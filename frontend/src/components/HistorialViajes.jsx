import React, { useEffect, useState } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Calendar, MapPin, DollarSign, Clock, ChevronRight } from 'lucide-react';

const HistorialViajes = ({ uid, rol }) => {
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchHistorial = async () => {
      const campoBusqueda = rol === 'conductor' ? 'conductorUid' : 'clienteUid';
      const q = query(
        collection(db, 'artifacts', 'taxiacimco-app', 'public', 'data', 'viajes_solicitados'),
        where(campoBusqueda, '==', uid),
        where('estado', '==', 'finalizado'),
        orderBy('createdAt', 'desc')
      );

      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setViajes(lista);
      
      const suma = lista.reduce((acc, v) => acc + (v.valorOfertado || 0), 0);
      setTotal(suma);
      setLoading(false);
    };

    if (uid) fetchHistorial();
  }, [uid, rol]);

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse font-black uppercase italic text-xs">Cargando Historial...</div>;

  return (
    <div className="space-y-4">
      {/* Resumen de Cuenta */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-[2rem] border border-white/5 shadow-xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
          {rol === 'conductor' ? 'Ganancias Totales' : 'Gasto Total'}
        </p>
        <h3 className="text-3xl font-black text-white italic">${total.toLocaleString()} <span className="text-xs text-slate-500">COP</span></h3>
      </div>

      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Viajes Recientes</h4>

      <div className="space-y-3">
        {viajes.length === 0 ? (
          <p className="p-10 text-center text-slate-600 italic text-sm">No hay viajes registrados aún.</p>
        ) : (
          viajes.map((v) => (
            <div key={v.id} className="bg-slate-900/50 p-4 rounded-3xl border border-white/5 flex items-center gap-4 hover:bg-slate-800 transition-colors">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl">
                {v.servicioSolicitado === 'Motocarga' ? '📦' : '🏍️'}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-cyan-400 uppercase italic">{v.servicioSolicitado}</span>
                  <span className="text-[9px] text-slate-500 font-bold">{v.createdAt?.toDate().toLocaleDateString()}</span>
                </div>
                <h5 className="text-xs font-bold text-white truncate max-w-[150px]">{v.puntoDestinoManual}</h5>
                <p className="text-[10px] text-slate-500 font-medium">${v.valorOfertado?.toLocaleString()}</p>
              </div>
              <ChevronRight size={16} className="text-slate-700" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistorialViajes;