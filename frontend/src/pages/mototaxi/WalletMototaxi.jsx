// Versión Arquitectura: V12.0 - Ajuste CIMCO-UI V9.3 Glassmorphism e Integración de StatusBanner
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';

const WalletMototaxi = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        if (!user?.uid) return;
        
        const pathColeccion = FIRESTORE_PATHS?.wallets || 'wallets';
        const unsub = onSnapshot(doc(db, pathColeccion, user.uid), (docRef) => {
            if (docRef?.exists()) {
                const data = docRef.data();
                const saldoCalculado = data?.balance ?? data?.saldo ?? 0;
                setBalance(saldoCalculado);
            }
        });
        return () => unsub();
    }, [user]);

    const saldoEfectivo = balance;

    return (
        <div className="min-h-screen bg-[#0e0e11] font-sans text-zinc-100 p-6 flex flex-col gap-6 selection:bg-cyan-400 selection:text-black">
            
            {/* 🔝 ENCABEZADO: Módulo de Identidad Financiera */}
            <header className="flex items-center gap-4 bg-[#121214]/80 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-lg">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg shrink-0">
                    <Wallet size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-wide text-white leading-none">Mi Billetera</h1>
                    <p className="text-xs text-zinc-400 font-medium mt-1">Consola de fondos y conciliación de saldos TAXIA</p>
                </div>
            </header>

            {/* 🚦 StatusBanner: Indicador Visual de Estado (CIMCO-UI V9.3) */}
            <div className={`p-4 rounded-xl border backdrop-blur-md ${
                saldoEfectivo >= 2000 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
                <p className="font-semibold text-sm">
                    {saldoEfectivo >= 2000 
                        ? '✅ Cuenta Operativa - Habilitado para recibir carreras' 
                        : '🚫 Cuenta Inactiva - Requiere recarga mínima de $2.000 COP'}
                </p>
            </div>

            {/* 💳 PANEL DE CONTROL DE SALDO */}
            <div className="bg-[#121214]/80 backdrop-blur-md border border-white/5 p-6 rounded-xl shadow-lg flex flex-col relative overflow-hidden">
                <div className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-zinc-400 select-none">
                    COP
                </div>

                <div className="relative z-10">
                    <p className="text-xs text-zinc-400 font-medium mb-1">
                        Saldo Disponible en Red
                    </p>
                    <h2 className="text-3xl font-bold text-emerald-400 tracking-tight border-b border-white/5 pb-4 mb-5">
                        ${(balance ?? 0).toLocaleString()} COP
                    </h2>
                    
                    {/* Botonera Operativa Inyectada */}
                    <div className="flex gap-4">
                        <BotonRecarga usuarioId={user?.uid} rol={user?.role || user?.rol} />
                    </div>
                </div>
            </div>

            {/* 📊 PANEL DE AUDITORÍA TRANSACCIONAL */}
            <div className="flex-1 bg-[#121214]/80 backdrop-blur-md border border-white/5 p-6 rounded-xl shadow-lg flex flex-col gap-4">
                <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Activity size={16} className="text-cyan-400" strokeWidth={2.5} />
                    <h3 className="text-sm font-semibold text-zinc-200">
                        Auditoría Financiera Reciente
                    </h3>
                </div>
                
                {/* Contenedor del Historial */}
                <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    <TransactionHistory usuarioId={user?.uid} />
                </div>
            </div>

        </div>
    );
};

export default WalletMototaxi;