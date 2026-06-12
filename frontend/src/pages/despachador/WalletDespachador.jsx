// Versión Arquitectura: V11.1 - PROD READY: Caja de Despachos Vinculada con Historial de Transacciones
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';

const WalletDespachador = () => {
    const { user } = useAuth();
    const [saldo, setSaldo] = useState(0);

    useEffect(() => {
        if (!user?.uid) return;
        
        // Mapeo unificado a la colección configurada (fallback seguro a usuarios o wallets)
        const coleccionFlujo = FIRESTORE_PATHS.wallets || FIRESTORE_PATHS.usuarios || 'usuarios';
        const unsub = onSnapshot(doc(db, coleccionFlujo, user.uid), (docRef) => {
            if (docRef.exists()) {
                setSaldo(docRef.data().saldo || docRef.data().balance || 0);
            }
        });
        return () => unsub();
    }, [user]);

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-6 flex flex-col gap-6">
            <header className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Wallet className="text-blue-500" size={26} />
                <h1 className="text-xl font-black uppercase tracking-widest text-white">Caja de Despachos</h1>
            </header>

            <div className="backdrop-blur-xl bg-[#121214]/80 border border-blue-500/20 p-6 rounded-3xl shadow-[0_0_30px_rgba(59,130,246,0.05)] relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2 relative z-10">Fondo Operativo de Caja</p>
                <h2 className="text-4xl font-black text-white mb-6 relative z-10">${saldo.toLocaleString()} COP</h2>
                <div className="flex gap-4 relative z-10">
                    <BotonRecarga usuarioId={user?.uid} rol={user?.role || user?.rol} />
                </div>
            </div>

            <div className="flex-1 backdrop-blur-md bg-[#121214]/60 rounded-3xl p-6 border border-white/5 shadow-lg flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Activity size={18} className="text-blue-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Transacciones de Caja</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <TransactionHistory usuarioId={user?.uid} />
                </div>
            </div>
        </div>
    );
};

export default WalletDespachador;