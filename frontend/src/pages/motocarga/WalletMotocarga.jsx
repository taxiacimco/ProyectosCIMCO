// Versión Arquitectura: V11.1 - PROD READY: Billetera de Motocarga Homologada y con Historial de Transacciones Activo
// Refactorización Estética: Cyber-Neo-Brutalismo Industrial (Alta Visibilidad, Cero Curvas, Hard Shadows)
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
        <div className="min-h-screen bg-[#0e0e11] font-mono text-zinc-100 p-6 flex flex-col gap-6 selection:bg-amber-400 selection:text-black">
            
            {/* 🔝 ENCABEZADO: Módulo de Identidad Financiera */}
            <header className="flex items-center gap-4 bg-zinc-900 border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] rounded-none">
                <div className="p-2.5 bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] shrink-0">
                    <Wallet size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-white leading-none">Billetera Motocarga</h1>
                    <p className="text-[10px] text-amber-400 uppercase tracking-wider font-bold mt-1">Consola de fondos y conciliación de saldos TAXIA Motocarga</p>
                </div>
            </header>

            {/* 💳 PANEL DE CONTROL DE SALDO (Bloque Masivo Rígido) */}
            <div className="bg-zinc-900 border-4 border-black p-6 shadow-[4px_4px_0px_0px_#000] rounded-none flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-800 border-b-4 border-l-4 border-black flex items-center justify-center font-black text-zinc-700 text-3xl select-none pointer-events-none">
                    COP
                </div>

                <div className="relative z-10">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black mb-1">
                        Saldo Disponible
                    </p>
                    <h2 className="text-3xl font-black text-emerald-400 tracking-tight border-b-4 border-black pb-4 mb-5">
                        ${balance.toLocaleString()} COP
                    </h2>
                    
                    {/* Botonera Operativa Inyectada Brutalista */}
                    <div className="flex gap-4 [&_button]:w-full [&_button]:bg-amber-400 [&_button]:text-black [&_button]:font-black [&_button]:text-xs [&_button]:uppercase [&_button]:tracking-widest [&_button]:py-3.5 [&_button]:px-4 [&_button]:border-2 [&_button]:border-black [&_button]:rounded-none [&_button]:shadow-[3px_3px_0px_0px_#000] [&_button]:transition-all [&_button]:active:translate-x-[1px] [&_button]:active:translate-y-[1px] [&_button]:active:shadow-[2px_2px_0px_0px_#000]">
                        <BotonRecarga usuarioId={user?.uid} rol={user?.role || user?.rol} />
                    </div>
                </div>
            </div>
            
            {/* 📊 PANEL DE AUDITORÍA TRANSACCIONAL */}
            <div className="flex-1 bg-zinc-900 border-4 border-black p-6 shadow-[4px_4px_0px_0px_#000] rounded-none flex flex-col gap-4">
                <div className="flex items-center gap-2.5 border-b-4 border-black pb-3">
                    <Activity size={16} className="text-amber-400" strokeWidth={2.5} />
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-200">
                        Historial Financiero Caja
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-black scrollbar-track-zinc-800">
                    <TransactionHistory usuarioId={user?.uid} />
                </div>
            </div>
        </div>
    );
};

export default WalletMotocarga;