// Versión Arquitectura: V12.0 - Resiliencia Transaccional y Blindaje Anti-Crash de Caja Operativa
/**
 * Ubicación: frontend\src\pages\despachador\WalletDespachador.jsx
 * Misión: Caja de Despachos Vinculada con Historial de Transacciones (CIMCO-UI V12.0).
 * Ajuste V12.0: Adición de manejo de errores en onSnapshot para evitar saldos fantasmas de $0,
 *               estabilización de paso de props y UI de desconexión sincrónica.
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
    const [saldo, setSaldo] = useState(null); // 💡 Cambiado a null para distinguir entre "cargando" y "saldo cero"
    const [errorCaja, setErrorCaja] = useState(null);

    useEffect(() => {
        if (!user?.uid) return;
        
        setErrorCaja(null);
        const coleccionFlujo = FIRESTORE_PATHS.wallets || FIRESTORE_PATHS.usuarios || 'usuarios';
        
        // 🛰️ Escucha reactiva protegida con callbacks de éxito y error discretos
        const unsub = onSnapshot(
            doc(db, coleccionFlujo, user.uid), 
            (docRef) => {
                if (docRef.exists()) {
                    setSaldo(docRef.data().saldo || docRef.data().balance || 0);
                } else {
                    setSaldo(0); // El documento existe pero no tiene fondos inicializados
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

    // Determinar el rol verificado de despacho
    const rolVerificado = user?.role || user?.rol;

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-6 flex flex-col gap-6">
            <header className="flex items-center gap-3 border-b border-white/5 pb-4 mb-2">
                <Wallet className="text-blue-500" size={24} />
                <h1 className="text-sm font-black uppercase tracking-widest text-white">Caja de Despachos</h1>
            </header>

            {/* 🚨 COMPUERTA VISUAL DE ERRORES DE SINCRONIZACIÓN */}
            {errorCaja ? (
                <div className="backdrop-blur-md bg-red-500/5 p-6 rounded-3xl border border-red-500/20 text-center flex flex-col items-center gap-3 shadow-xl">
                    <AlertTriangle className="text-red-500" size={24} />
                    <p className="text-zinc-300 text-xs uppercase tracking-wide">{errorCaja}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-blue-500/40 text-[10px] text-zinc-400 hover:text-white uppercase font-bold py-2 px-4 rounded-xl transition-all"
                    >
                        <RefreshCw size={12} /> Reconectar Terminal
                    </button>
                </div>
            ) : (
                <div className="backdrop-blur-xl bg-[#121214]/80 border border-blue-500/20 p-6 rounded-3xl shadow-[0_0_30px_rgba(59,130,246,0.05)] relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2 relative z-10">Fondo Operativo de Caja</p>
                    
                    {saldo === null ? (
                        <div className="h-10 flex items-center gap-2 text-zinc-500 text-xs uppercase animate-pulse mb-6">
                            <Loader size={16} className="animate-spin text-blue-500" /> Consultando fondos...
                        </div>
                    ) : (
                        <h2 className="text-4xl font-black text-white mb-6 relative z-10">
                            ${saldo.toLocaleString()} COP
                        </h2>
                    )}

                    <div className="flex gap-4 relative z-10">
                        {/* 🛡️ Inyección controlada: Solo renderiza el botón si la identidad mutua está resuelta */}
                        {user?.uid && rolVerificado && (
                            <BotonRecarga usuarioId={user.uid} rol={rolVerificado} />
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 backdrop-blur-md bg-[#121214]/60 rounded-3xl p-6 border border-white/5 shadow-lg flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Activity size={18} className="text-blue-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Movimientos Recientes</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto h-96 pr-2 custom-scrollbar">
                    {/* Exigencia de desacoplamiento determinista pasando el ID explícito */}
                    {user?.uid && <TransactionHistory uid={user.uid} />}
                </div>
            </div>
        </div>
    );
};

export default WalletDespachador;