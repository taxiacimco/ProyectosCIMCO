// Versión Arquitectura: V11.3 - Integración de Umbral Mínimo Operativo y Banderola de Estado
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\motocarga\WalletMotocarga.jsx
 * Misión: Consola financiera de fondos y conciliación en tiempo real para unidades de Motocarga.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Acento Ámbar/Esmeralda).
 * Ajuste V11.3: Importación de SALDO_MINIMO_OPERATIVO e incorporación de banderola de estado de saldo insuficiente.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { SALDO_MINIMO_OPERATIVO } from '@/config/constants';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';

const WalletMotocarga = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [error, setError] = useState(null);

    useEffect(() => {
        const userId = user?.uid || user?.id || user?._id;
        if (!userId) return;
        
        const pathColeccion = FIRESTORE_PATHS?.wallets || 'wallets';
        
        // Listener con manejo resiliente de errores para prevenir desincronizaciones
        const unsubscribe = onSnapshot(
            doc(db, pathColeccion, userId), 
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setBalance(data?.balance ?? data?.saldo ?? 0);
                }
                setError(null);
            },
            (err) => {
                console.error("❌ [CIMCO-WALLET-MOTOCARGA] Error en sincronización NoSQL:", err);
                setError("Sincronización de saldo en tiempo real interrumpida. Verifique su conexión.");
            }
        );

        return () => unsubscribe();
    }, [user]);

    const usuarioId = user?.uid || user?.id || user?._id;
    const umbralMinimo = Number(SALDO_MINIMO_OPERATIVO) || 2000;
    const saldoInsuficiente = Number(balance) < umbralMinimo;

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-4 md:p-8 relative overflow-hidden selection:bg-amber-500/20 selection:text-amber-400">
            {/* Gradiente ambiental premium */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[130px] pointer-events-none" />

            <div className="w-full max-w-4xl mx-auto relative z-10 flex flex-col gap-6">
                
                {/* 🔝 ENCABEZADO: Glassmorphic Premium UI */}
                <header className="backdrop-blur-md bg-[#121214]/80 p-5 rounded-2xl border border-white/5 flex items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                                Billetera Motocarga
                            </h1>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">
                                Consola de fondos y conciliación de saldos TAXIA Motocarga
                            </p>
                        </div>
                    </div>
                </header>

                {/* ⚠️ ALERTA DE RECHAZO / DESCONEXIÓN DE SUSCRIPCIÓN */}
                {error && (
                    <div className="backdrop-blur-md bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex items-center gap-3 text-red-400 text-xs font-bold uppercase tracking-wider shadow-lg">
                        <AlertTriangle size={18} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* 🚨 BANDEROLA DE ESTADO DE UMBRAL OPERATIVO */}
                {saldoInsuficiente ? (
                    <div className="backdrop-blur-md bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 text-red-400 font-mono text-xs shadow-lg animate-pulse">
                        <div className="flex items-center gap-3">
                            <ShieldAlert size={20} className="shrink-0 text-red-400" />
                            <div>
                                <p className="font-black uppercase tracking-wider">Opción de Despacho Bloqueada</p>
                                <p className="text-[10px] text-red-300/80 uppercase mt-0.5">
                                    El saldo de caja actual (${Number(balance).toLocaleString()} COP) es inferior al umbral operativo mínimo de ${umbralMinimo.toLocaleString()} COP. Recargue la billetera para habilitar la asignación de rutas.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="backdrop-blur-md bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-3 text-emerald-400 font-mono text-xs shadow-md">
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                        <p className="text-[10px] uppercase tracking-wider font-semibold">
                            Habilitado para Despacho: Saldo sobre el umbral mínimo operativo (${umbralMinimo.toLocaleString()} COP).
                        </p>
                    </div>
                )}

                {/* 💳 PANEL DE CONTROL DE SALDO (Glassmorphism UI V9.3) */}
                <div className="backdrop-blur-md bg-[#121214]/80 p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full flex items-center justify-center font-black text-amber-500/20 text-3xl select-none pointer-events-none pr-2 pt-2">
                        COP
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                                Saldo Disponible
                            </p>
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase ${
                                saldoInsuficiente 
                                    ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            }`}>
                                {saldoInsuficiente ? 'Despacho Bloqueado' : 'Despacho Activo'}
                            </span>
                        </div>
                        
                        <h2 className={`text-3xl font-black tracking-tight border-b border-white/5 pb-4 mb-5 ${
                            saldoInsuficiente ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                            ${Number(balance).toLocaleString('es-CO')} <span className="text-xs font-normal text-zinc-500">COP</span>
                        </h2>
                        
                        {/* Botonera Operativa Inyectada Glassmorphism */}
                        <div className="flex gap-4 [&_button]:w-full [&_button]:bg-amber-500/10 [&_button]:hover:bg-amber-500/20 [&_button]:text-amber-400 [&_button]:font-black [&_button]:text-xs [&_button]:uppercase [&_button]:tracking-widest [&_button]:py-3.5 [&_button]:px-4 [&_button]:border [&_button]:border-amber-500/20 [&_button]:rounded-xl [&_button]:shadow-lg [&_button]:transition-all [&_button]:active:scale-95 cursor-pointer">
                            <BotonRecarga usuarioId={usuarioId} rol={user?.role || user?.rol} />
                        </div>
                    </div>
                </div>
                
                {/* 📊 PANEL DE AUDITORÍA TRANSACCIONAL */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/80 p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-4">
                    <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                        <Activity size={16} className="text-amber-400" strokeWidth={2.5} />
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-200">
                            Historial Financiero Caja
                        </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/50">
                        <TransactionHistory usuarioId={usuarioId} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WalletMotocarga;