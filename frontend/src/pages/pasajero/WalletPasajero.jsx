// Versión Arquitectura: V12.2 - Blindaje de Suscripciones Reactivas de Billetera y Anti-NaN Output
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\WalletPasajero.jsx
 * Misión: Proveer al pasajero una interfaz para recargar fondos y auditar sus movimientos.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Identidad Amarilla).
 * Ajuste V12.2: Manejo seguro de FIRESTORE_PATHS, blindaje anti-NaN en renderizado de fondos y manejo de errores de snapshot.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity, CreditCard, AlertCircle } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';

const WalletPasajero = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [errorReactor, setErrorReactor] = useState(null);

    useEffect(() => {
        const uid = user?.uid || user?.id;
        if (!uid) return;
        
        setErrorReactor(null);

        // Conexión unificada a la colección de finanzas consumiendo FIRESTORE_PATHS global con fallbacks
        const pathColeccion = FIRESTORE_PATHS?.wallets || FIRESTORE_PATHS?.billeteras || 'wallets';
        
        const unsubscribe = onSnapshot(doc(db, pathColeccion, uid), (docRef) => {
            if (docRef.exists()) {
                const data = docRef.data() || {};
                // Guardas anti-undefined y casteo numérico seguro
                const saldoCalculado = Number(data?.balance ?? data?.saldo ?? 0);
                setBalance(isNaN(saldoCalculado) ? 0 : saldoCalculado);
            } else {
                setBalance(0);
            }
            setErrorReactor(null);
        }, (error) => {
            console.error("❌ [BILLETERA-REACTOR-ERROR] Fallo transaccional de fondo:", error);
            setErrorReactor("Fallo de comunicación en tiempo real con la bóveda de fondos.");
        });
        
        return () => unsubscribe();
    }, [user?.uid, user?.id]);

    const uidUsuario = user?.uid || user?.id;
    const rolUsuario = user?.role || user?.rol || 'pasajero';

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-8 font-mono antialiased flex flex-col items-center justify-center relative overflow-hidden">
            {/* Gradiente ambiental premium */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[130px] pointer-events-none" />
            
            <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6 relative z-10">
                
                {/* TARJETA DE BALANCE PRINCIPAL */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300 hover:border-white/10">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-yellow-500/10 transition-all duration-500" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                    <Wallet size={20} className="text-yellow-500" />
                                </div>
                                <div>
                                    <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Billetera Digital</h2>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5 font-mono">
                                        ID Operador: <span className="text-zinc-400">{String(uidUsuario || 'ANÓNIMO').slice(0, 8)}</span>
                                    </p>
                                </div>
                            </div>
                            <CreditCard size={18} className="text-zinc-600" />
                        </div>

                        {errorReactor && (
                            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 flex items-center gap-2 text-red-400 text-[9px] font-bold uppercase tracking-wider">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{errorReactor}</span>
                            </div>
                        )}

                        <div className="py-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fondos Disponibles</p>
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight mt-1">
                                ${Number(balance || 0).toLocaleString()} <span className="text-lg text-zinc-500 font-normal">COP</span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex gap-4 relative z-10 mt-2 border-t border-white/5 pt-6">
                        {/* Componente global de recarga con fallback seguro de UID */}
                        <BotonRecarga usuarioId={uidUsuario} rol={rolUsuario} />
                    </div>
                </div>

                {/* HISTORIAL DE TRANSACCIONES */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/60 rounded-3xl p-6 border border-white/5 shadow-lg flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Activity size={18} className="text-yellow-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Movimientos Recientes</h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto h-96 pr-2 custom-scrollbar">
                        <TransactionHistory usuarioId={uidUsuario} />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default WalletPasajero;