// Versión Arquitectura: V11.1 - PROD READY: Billetera de Motocarga Homologada y con Historial de Transacciones Activo
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';

const WalletMotocarga = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        if (!user?.uid) return;
        
        const pathColeccion = FIRESTORE_PATHS.wallets || 'wallets';
        const unsubscribe = onSnapshot(doc(db, pathColeccion, user.uid), (snap) => {
            if (snap.exists()) {
                setBalance(snap.data().balance || snap.data().saldo || 0);
            }
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-6 flex flex-col gap-6">
            <header className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Wallet className="text-amber-500" size={28} />
                <h1 className="text-xl font-black uppercase tracking-widest text-white">Billetera Motocarga</h1>
            </header>

            <div className="backdrop-blur-xl bg-[#121214]/80 border border-amber-500/20 p-8 rounded-3xl shadow-[0_0_30px_rgba(245,158,11,0.05)] relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2 relative z-10">Saldo Disponible</p>
                <h2 className="text-4xl font-black text-white mb-6 relative z-10">${balance.toLocaleString()} COP</h2>
                <div className="flex gap-4 relative z-10 mt-4">
                    <BotonRecarga usuarioId={user?.uid} rol={user?.role || user?.rol} />
                </div>
            </div>
            
            <div className="flex-1 backdrop-blur-md bg-[#121214]/60 rounded-3xl p-6 border border-white/5 flex flex-col gap-4 shadow-lg">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Activity size={18} className="text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Historial Financiero Caja</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <TransactionHistory usuarioId={user?.uid} />
                </div>
            </div>
        </div>
    );
};

export default WalletMotocarga;