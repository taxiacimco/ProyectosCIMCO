// Versión Arquitectura: V12.0 - Integración StatusBanner ($2.000 COP) y Alineación Estética CIMCO-UI V9.3 Glassmorphism
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';

const UMBRAL_MINIMO_COP = 2000;

const WalletMotoparrillero = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        if (!user?.uid) return;
        
        const pathColeccion = FIRESTORE_PATHS?.wallets || 'wallets';
        const unsub = onSnapshot(doc(db, pathColeccion, user.uid), (docRef) => {
            if (docRef.exists()) {
                const data = docRef.data();
                setBalance(data?.balance ?? data?.saldo ?? 0);
            }
        }, (error) => {
            console.error("🚨 [CIMCO-WALLET-ERROR] Fallo en la escucha de saldo:", error);
        });
        return () => unsub();
    }, [user?.uid]);

    const saldoEfectivo = Number(balance || 0);

    return (
        <div className="min-h-screen bg-[#0e0e11] font-mono text-zinc-100 p-6 flex flex-col gap-6 selection:bg-cyan-400 selection:text-black">
            
            {/* 🔝 ENCABEZADO: Módulo de Identidad Financiera */}
            <header className="flex items-center gap-4 bg-[#121214]/80 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-lg">
                <div className="p-2.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg shrink-0">
                    <Wallet size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-white leading-none">Mi Billetera</h1>
                    <p className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold mt-1">Consola de fondos y conciliación de saldos TAXIA Parrillero</p>
                </div>
            </header>

            {/* 🛡️ BANNER VISUAL DE ESTADO OPERATIVO (StatusBanner) */}
            <div className={`p-4 rounded-xl border backdrop-blur-md transition-all duration-200 ${
                saldoEfectivo >= UMBRAL_MINIMO_COP 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
                <p className="font-semibold text-sm">
                    {saldoEfectivo >= UMBRAL_MINIMO_COP 
                        ? '✅ Cuenta Operativa - Habilitado para recibir carreras' 
                        : '🚫 Cuenta Inactiva - Requiere recarga mínima de $2.000 COP'}
                </p>
            </div>

            {/* 💳 PANEL DE CONTROL DE SALDO */}
            <div className="bg-[#121214]/80 backdrop-blur-md border border-white/5 p-6 rounded-xl shadow-lg flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-800/20 border-b border-l border-white/5 flex items-center justify-center font-black text-zinc-700 text-3xl select-none pointer-events-none rounded-bl-xl">
                    COP
                </div>

                <div className="relative z-10">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black mb-1">
                        Saldo Disponible en Red
                    </p>
                    <h2 className="text-3xl font-black text-emerald-400 tracking-tight border-b border-white/5 pb-4 mb-5">
                        ${saldoEfectivo.toLocaleString('es-CO')} COP
                    </h2>
                    
                    {/* Botonera Operativa Inyectada */}
                    <div className="flex gap-4 [&_button]:w-full [&_button]:bg-amber-500/20 [&_button]:text-amber-400 [&_button]:hover:bg-amber-500/30 [&_button]:font-black [&_button]:text-xs [&_button]:uppercase [&_button]:tracking-widest [&_button]:py-3.5 [&_button]:px-4 [&_button]:border [&_button]:border-amber-500/30 [&_button]:rounded-lg [&_button]:transition-all [&_button]:active:scale-95">
                        <BotonRecarga usuarioId={user?.uid} rol={user?.role || user?.rol} />
                    </div>
                </div>
            </div>

            {/* 📊 PANEL DE AUDITORÍA TRANSACCIONAL */}
            <div className="flex-1 bg-[#121214]/80 backdrop-blur-md border border-white/5 p-6 rounded-xl shadow-lg flex flex-col gap-4">
                <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Activity size={16} className="text-cyan-400" strokeWidth={2.5} />
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-200">
                        Auditoría Financiera Reciente
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    <TransactionHistory usuarioId={user?.uid} />
                </div>
            </div>

        </div>
    );
};

export default WalletMotoparrillero;