// Versión Arquitectura: V15.5 - Firma Polimórfica y Unificación Estética de Auditoría
/**
 * Ubicación: frontend\src\components\wallet\TransactionHistory.jsx
 * Misión: Auditar y renderizar la trazabilidad financiera del usuario mitigando nulos por desincronización.
 */
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { useAuth } from '@/hooks/useAuth';
import { Clock, ArrowUpRight, ArrowDownLeft, Loader2, ServerOff } from 'lucide-react';
import { formatFechaColombia } from '@/utils/dateFormatter';

const TransactionHistory = ({ targetUid = null }) => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loadingTx, setLoadingTx] = useState(true);
    const [errorFirebase, setErrorFirebase] = useState(null);

    useEffect(() => {
        // 🛡️ Guarda Avanzada: Selección y resolución del UID operativo
        const uidOperativo = targetUid || user?.uid;
        
        if (!uidOperativo) {
            setLoadingTx(false);
            return;
        }

        setErrorFirebase(null);
        const pathColeccion = FIRESTORE_PATHS.transacciones || 'transacciones';
        
        try {
            // ✅ FILTRADO POLIMÓRFICO V15.5: Consulta bidireccional soportando targetUid o el dispatcherUid de la central
            const q = query(
                collection(db, pathColeccion),
                where("targetUid", "==", uidOperativo),
                orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    const txList = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            fechaSanitizada: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date()
                        };
                    });
                    setTransactions(txList);
                    setLoadingTx(false);
                },
                (error) => {
                    console.error("❌ [CIMCO-WALLET-CORE] Error en streaming de transacciones:", error);
                    setErrorFirebase(error.message);
                    setLoadingTx(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error("❌ [CIMCO-WALLET-CORE] Fallo crítico al instanciar consulta NoSQL:", err);
            setErrorFirebase(err.message);
            setLoadingTx(false);
        }
    }, [user?.uid, targetUid]);

    if (loadingTx) {
        return (
            <div className="flex items-center justify-center py-8 gap-2 text-zinc-500 font-mono text-[10px] tracking-widest uppercase">
                <Loader2 className="animate-spin text-orange-500" size={14} />
                <span>Sincronizando Trazabilidad...</span>
            </div>
        );
    }

    if (errorFirebase) {
        return (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 font-mono text-[10px] uppercase tracking-wider">
                <ServerOff size={14} className="shrink-0" />
                <span>Error de comunicación perimetral con base de datos.</span>
            </div>
        );
    }

    return (
        <div className="w-full font-sans">
            {transactions.length === 0 ? (
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest text-center py-6 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                    Sin movimientos financieros registrados en la bitácora.
                </p>
            ) : (
                <div className="space-y-2.5">
                    {transactions.map((tx) => {
                        const tipoTx = (tx.type || tx.tipo || 'Transacción').toUpperCase();
                        const isRecarga = tipoTx === 'RECARGA' || tipoTx === 'CREDIT' || tipoTx === 'ABONO';
                        
                        return (
                            <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-[#161619]/40 border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
                                        isRecarga 
                                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' 
                                        : 'bg-zinc-500/10 border-white/5 text-zinc-400'
                                    }`}>
                                        {isRecarga ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest truncate">{tipoTx}</p>
                                        <p className="text-[9px] text-zinc-500 font-mono truncate">
                                            Ref: {tx.id ? tx.id.substring(0, 8).toUpperCase() : 'S/R'}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="text-right shrink-0 pl-2">
                                    <p className={`text-xs font-bold font-mono ${isRecarga ? 'text-orange-400' : 'text-zinc-300'}`}>
                                        {isRecarga ? '+' : '-'}${parseFloat(tx.amount || tx.monto || 0).toLocaleString('es-CO')}
                                    </p>
                                    <p className="text-[8px] text-zinc-500 font-bold uppercase flex items-center gap-1 justify-end mt-0.5 tracking-wider font-mono">
                                        <Clock className="opacity-60" size={9} /> 
                                        {formatFechaColombia(tx.fechaSanitizada)}
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