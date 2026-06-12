// Versión Arquitectura: V12.0 - PROD READY: Normalización Divisa (COP Neto) y Consulta Inyectada
/**
 * Ubicación: @/components/wallet/TransactionHistory.jsx
 * Misión: Auditar y renderizar la trazabilidad financiera del usuario. 
 * Ajuste: Eliminación de parseo de céntimos para sincronizar con la Inyección Atómica del AdminPanel.
 */

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { useAuth } from '@/hooks/useAuth';
import { Clock, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';

const TransactionHistory = () => {
    const { user, loading: authLoading } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loadingTx, setLoadingTx] = useState(true);

    useEffect(() => {
        // 🛡️ Guarda Anti-Undefined
        if (!user?.uid) {
            setLoadingTx(false);
            return;
        }

        // 🚀 Consulta optimizada a la ruta limpia inyectada
        const pathColeccion = FIRESTORE_PATHS.transacciones || 'transacciones';
        const q = query(
            collection(db, pathColeccion),
            where("targetUid", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: data.type || "DESCONOCIDO",
                    amount: data.amount || 0,
                    createdAt: data.createdAt || null
                };
            });
            setTransactions(docs);
            setLoadingTx(false);
        }, (error) => {
            console.error("❌ [History] Error crítico de lectura en snapshot:", error);
            setLoadingTx(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (authLoading || loadingTx) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-[#121214]/60 backdrop-blur-md rounded-2xl border border-white/5">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
                <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Auditoria en curso...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Libro Mayor</h3>
                <span className="text-[9px] text-zinc-500 font-mono bg-white/5 px-2 py-1 rounded-md">{transactions.length} Mvts</span>
            </div>

            {transactions.length === 0 ? (
                <div className="text-center py-12 bg-[#121214]/40 backdrop-blur-md border border-white/5 rounded-2xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        Libro contable en cero.
                    </p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {transactions.map((tx) => {
                        // Clasificación de la naturaleza del movimiento
                        const isRecarga = tx.type === 'RECARGA' || tx.type === 'DEPOSITO';
                        
                        return (
                            <div 
                                key={tx.id} 
                                className="bg-[#121214]/60 backdrop-blur-md border border-white/5 p-4 rounded-xl flex items-center justify-between hover:border-white/10 hover:bg-[#121214]/80 transition-all duration-300 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl border transition-all ${
                                        isRecarga 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20' 
                                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20 group-hover:bg-rose-500/20'
                                    }`}>
                                        {isRecarga ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">{tx.type}</p>
                                        <p className="text-[9px] text-zinc-500 font-mono">Ref: {tx.id.substring(0, 8)}</p>
                                    </div>
                                </div>
                                
                                <div className="text-right">
                                    {/* 🛡️ Normalización COP: Se elimina la división por 100 */}
                                    <p className={`text-sm font-bold font-mono ${isRecarga ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                        {isRecarga ? '+' : '-'}${ parseFloat(tx.amount || 0).toLocaleString('es-CO') }
                                    </p>
                                    <p className="text-[8px] text-zinc-500 font-bold uppercase flex items-center gap-1 justify-end mt-0.5 tracking-wider">
                                        <Clock className="opacity-60" size={10} /> 
                                        {tx.createdAt ? new Date(tx.createdAt.toDate()).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TransactionHistory;