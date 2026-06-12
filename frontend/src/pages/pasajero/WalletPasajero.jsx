// Versión Arquitectura: V12.0 - PROD READY: Billetera Pasajero Homologada
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\WalletPasajero.jsx
 * Misión: Proveer al pasajero una interfaz para recargar fondos y auditar sus movimientos.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Identidad Amarilla).
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity, CreditCard } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';

const WalletPasajero = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        if (!user?.uid) return;
        
        // Conexión unificada a la colección de finanzas
        const pathColeccion = FIRESTORE_PATHS.wallets || 'wallets';
        const unsubscribe = onSnapshot(doc(db, pathColeccion, user.uid), (docRef) => {
            if (docRef.exists()) {
                // Retrocompatibilidad segura para leer el estado del fondo
                setBalance(docRef.data().balance || docRef.data().saldo || 0);
            }
        });
        
        return () => unsubscribe();
    }, [user]);

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-6 flex flex-col gap-6 md:p-8 pb-24">
            <div className="max-w-4xl mx-auto w-full space-y-6">
                
                {/* ENCABEZADO TÁCTICO */}
                <header className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Wallet className="text-yellow-500" size={26} />
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-widest text-white">Mi Billetera</h1>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Gestión de saldo y pagos de servicios</p>
                    </div>
                </header>

                {/* TARJETA PRINCIPAL DE SALDO (GLASSMORPHISM) */}
                <div className="backdrop-blur-xl bg-[#121214]/80 border border-yellow-500/20 p-8 rounded-3xl shadow-[0_0_30px_rgba(234,179,8,0.05)] relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <CreditCard size={14} className="text-yellow-500" /> Saldo Disponible
                            </p>
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                                ${balance.toLocaleString()} <span className="text-lg text-zinc-500">COP</span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex gap-4 relative z-10 mt-2 border-t border-white/5 pt-6">
                        {/* Se inyecta el componente global de recarga pasando el rol para definir reglas de negocio si es necesario */}
                        <BotonRecarga usuarioId={user?.uid} rol={user?.role || user?.rol || 'pasajero'} />
                    </div>
                </div>

                {/* HISTORIAL DE TRANSACCIONES */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/60 rounded-3xl p-6 border border-white/5 shadow-lg flex flex-col gap-4 mt-2">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Activity size={18} className="text-yellow-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Movimientos Recientes</h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto h-96 pr-2 custom-scrollbar">
                        <TransactionHistory usuarioId={user?.uid} />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default WalletPasajero;