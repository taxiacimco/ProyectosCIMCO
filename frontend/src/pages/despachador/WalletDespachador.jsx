// Versión Arquitectura: V15.5 - Resiliencia Transaccional y Consistencia de Diseño de Central Intermunicipal
/**
 * Ubicación: frontend\src\pages\despachador\WalletDespachador.jsx
 * Misión: Caja de Despachos Vinculada con Historial de Transacciones de la Cooperativa.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity, AlertTriangle, RefreshCw, Loader } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';

const WalletDespachador = () => {
    const { user } = useAuth();
    const [saldo, setSaldo] = useState(null); 
    const [errorCaja, setErrorCaja] = useState(null);

    useEffect(() => {
        if (!user?.uid) return;
        
        setErrorCaja(null);
        // Fallback dinámico ordenado a la colección de seguridad de wallets
        const coleccionFlujo = FIRESTORE_PATHS.wallets || FIRESTORE_PATHS.usuarios || 'usuarios';
        
        const unsub = onSnapshot(
            doc(db, coleccionFlujo, user.uid), 
            (docRef) => {
                if (docRef.exists()) {
                    setSaldo(docRef.data().saldo || docRef.data().balance || 0);
                } else {
                    setSaldo(0); 
                }
                setErrorCaja(null);
            },
            (err) => {
                console.error("❌ [CIMCO-WALLET-ERROR] Falla crítica en escucha NoSQL de caja:", err);
                setErrorCaja("Error de sincronización con la tesorería central.");
            }
        );
        
        return () => unsub();
    }, [user?.uid]);

    const rolVerificado = user?.role || user?.rol;

    return (
        <div className="min-h-screen bg-[#121214] font-sans text-zinc-100 p-4 md:p-8 flex flex-col gap-6">
            <header className="flex items-center gap-3 border-b border-white/5 pb-4 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <Wallet size={20} />
                </div>
                <div>
                    <h1 className="text-sm font-black uppercase tracking-widest text-white">Caja de Despachos</h1>
                    <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">Control de Fondos y Liquidaciones de Cooperativa</p>
                </div>
            </header>

            {errorCaja ? (
                <div className="backdrop-blur-md bg-red-500/5 p-6 rounded-3xl border border-red-500/20 text-center flex flex-col items-center gap-3 shadow-xl font-mono">
                    <AlertTriangle className="text-red-500" size={24} />
                    <p className="text-zinc-300 text-xs uppercase tracking-wide">{errorCaja}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-orange-500/40 text-[10px] text-zinc-400 hover:text-white uppercase font-bold py-2 px-4 rounded-xl transition-all"
                    >
                        <RefreshCw size={12} /> Reconectar Terminal
                    </button>
                </div>
            ) : (
                <div className="backdrop-blur-xl bg-[#161619]/40 border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-2 relative z-10">Fondo Operativo de Caja</p>
                    
                    {saldo === null ? (
                        <div className="h-10 flex items-center gap-2 text-zinc-500 font-mono text-xs uppercase animate-pulse mb-6">
                            <Loader size={16} className="animate-spin text-orange-400" /> Consultando fondos...
                        </div>
                    ) : (
                        <h2 className="text-4xl font-black text-white mb-6 relative z-10 font-mono tracking-tight">
                            ${saldo.toLocaleString()} <span className="text-xs font-medium text-zinc-500">COP</span>
                        </h2>
                    )}

                    <div className="flex gap-4 relative z-10">
                        {user?.uid && rolVerificado && (
                            <BotonRecarga usuarioId={user.uid} rol={rolVerificado} />
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 backdrop-blur-md bg-[#161619]/40 rounded-3xl p-6 border border-white/5 shadow-lg flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Activity size={18} className="text-orange-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Movimientos Recientes</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto h-96 pr-2 custom-scrollbar font-mono">
                    {user?.uid && <TransactionHistory uid={user.uid} />}
                </div>
            </div>
        </div>
    );
};

export default WalletDespachador;