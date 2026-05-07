// Versión Arquitectura: V1.1 - Sincronización de Historial Post-Auth
/**
 * PROYECTO: TAXIA CIMCO - Módulo de Billetera
 * Arquitectura: Hexagonal (Capa de Adaptadores de Entrada)
 * Misión: Resolver el aborto prematuro del listener asegurando la existencia del UID.
 */

import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { Clock, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';

const auth = getAuth();
const db = getFirestore();

// [REGLA DE ORO 1]: Estructura de Datos Sagrada
const SACRED_PATH = "artifacts/taxiacimco-app/public/data/transacciones";

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🛡️ PROTOCOLO DE ESCUCHA ASÍNCROMA
    // Escuchamos el cambio de estado de Auth para garantizar que el UID esté presente
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("✅ [History] Usuario detectado:", user.uid);
        
        const q = query(
          collection(db, SACRED_PATH),
          where("targetUid", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTransactions(docs);
          setLoading(false);
        }, (error) => {
          console.error("❌ [History] Error en snapshot:", error);
          setLoading(false);
        });

        // Limpieza del listener de Firestore
        return () => unsubscribeSnapshot();
      } else {
        console.warn("⚠️ [History] Esperando autenticación...");
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
        <Loader2 className="animate-spin text-cyan-500" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sincronizando Historial...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black text-white uppercase tracking-tighter flex items-center gap-2 mb-6">
        Últimos <span className="text-cyan-500">Movimientos</span>
      </h3>

      {transactions.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-800 rounded-3xl">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            No se detectan transacciones en el historial.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-all">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${tx.type === 'RECARGA' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {tx.type === 'RECARGA' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase">{tx.type}</p>
                  <p className="text-[9px] text-slate-500 font-mono italic">Ref: {tx.id.substring(0, 8)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${tx.type === 'RECARGA' ? 'text-green-400' : 'text-slate-300'}`}>
                  {tx.type === 'RECARGA' ? '+' : '-'}${ (tx.amount / 100).toLocaleString() }
                </p>
                <p className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter flex items-center gap-1 justify-end">
                  <Clock size={8} /> {tx.createdAt?.toDate().toLocaleDateString() || 'Reciente'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;