// Versión Arquitectura: V19.4 - Control de Umbral Mínimo de Billetera ($2,000 COP) e Interfaz de Despacho
/**
 * Ubicación: frontend\src\pages\despachador\WalletDespachador.jsx
 * Misión: Caja de Despachos Vinculada con Tesorería Central en MongoDB y Escucha de Saldo por WebSockets.
 * Ajuste V19.4: Integración del umbral mínimo operativo de $2,000 COP. Validación y bloqueo visual de la interfaz de despacho cuando el saldo de la caja sea inferior a dicho límite.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import api from '@/config/api';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity, AlertTriangle, RefreshCw, Loader, ShieldAlert, CheckCircle2 } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';

// 💳 CONSTANTE DE NEGOCIO: UMBRAL MÍNIMO OPERATIVO DE BILLETERA DE DESPACHADOR
const UMBRAL_MINIMO_SALDO = 2000;

const WalletDespachador = () => {
    // 🛡️ Guardas de Seguridad y Consumo del Contexto Centralizado
    const authContext = useAuth();
    const user = authContext?.user || null;
    const token = authContext?.token || localStorage.getItem('token') || user?.token || "";
    
    const socketContext = useSocket ? useSocket() : {};
    const socket = socketContext?.socket || null;
    const isConnected = socketContext?.isConnected ?? Boolean(socket?.connected);

    // 📝 ESTADOS DE CONTROL DE TESORERÍA
    const [saldo, setSaldo] = useState(null); 
    const [errorCaja, setErrorCaja] = useState(null);
    const [loadingSaldo, setLoadingSaldo] = useState(true);

    const idUsuario = user?.id || user?._id || user?.uid || "";
    const rolVerificado = user?.role || user?.rol;

    // 🛡️ EVALUACIÓN DE BLOQUEO POR SALDO INSUFICIENTE
    const saldoInsuficiente = saldo !== null && Number(saldo) < UMBRAL_MINIMO_SALDO;

    // 💰 FUNCIÓN DE OBTENCIÓN DE SALDO DESDE TESORERÍA CENTRAL (REST API MongoDB)
    const obtenerSaldoBackend = useCallback(async () => {
        if (!idUsuario) return;

        setLoadingSaldo(true);
        const axiosConfig = token ? {
            headers: { Authorization: `Bearer ${token}` }
        } : {};

        try {
            // Intentar primero endpoint de perfil general o fallback a billetera
            let endpoint = '/api/usuarios/perfil';
            let response;

            try {
                response = await api.get(endpoint, axiosConfig);
            } catch (firstErr) {
                // Fallback secundario si es un rol de conductor o tesorería específica
                endpoint = `/api/conductores/billetera/${idUsuario}`;
                response = await api.get(endpoint, axiosConfig);
            }

            const dataBackend = response?.data?.usuario || response?.data?.data || response?.data || {};
            const saldoCalculado = dataBackend?.saldo ?? dataBackend?.balance ?? dataBackend?.billetera ?? null;

            if (saldoCalculado !== null) {
                setSaldo(Number(saldoCalculado));
                setErrorCaja(null);
            }
        } catch (err) {
            console.error("🚨 [CIMCO-WALLET-REST] Error al consultar tesorería central backend:", err);
            // Mantenemos reintento o fallback NoSQL si el backend no responde
        } finally {
            setLoadingSaldo(false);
        }
    }, [idUsuario, token]);

    // 📡 CONSULTA INICIAL Y SUSCRIPCIÓN SOCKET.IO (`saldo_actualizado`)
    useEffect(() => {
        obtenerSaldoBackend();

        if (socket) {
            const handleSaldoActualizado = (data) => {
                if (data?.usuarioId === idUsuario || data?.id === idUsuario || data?.uid === idUsuario) {
                    if (data?.nuevoSaldo !== undefined) {
                        setSaldo(Number(data.nuevoSaldo));
                    } else if (data?.saldo !== undefined) {
                        setSaldo(Number(data.saldo));
                    } else {
                        obtenerSaldoBackend();
                    }
                }
            };

            socket.on("saldo_actualizado", handleSaldoActualizado);
            socket.on("transaccion_completada", obtenerSaldoBackend);

            return () => {
                socket.off("saldo_actualizado", handleSaldoActualizado);
                socket.off("transaccion_completada", obtenerSaldoBackend);
            };
        }
    }, [socket, idUsuario, obtenerSaldoBackend]);

    // 🔄 RESPALDO / SYNCRONIZACIÓN HÍBRIDA FIRESTORE (Preservación Atómica de Seguridad)
    useEffect(() => {
        if (!user?.uid) return;

        const coleccionFlujo = FIRESTORE_PATHS?.wallets || FIRESTORE_PATHS?.usuarios || 'usuarios';
        
        const unsub = onSnapshot(
            doc(db, coleccionFlujo, user.uid), 
            (docRef) => {
                if (docRef.exists()) {
                    const dataDoc = docRef.data();
                    const saldoFirestore = dataDoc?.saldo ?? dataDoc?.balance;
                    // Actualizar en caso de que aún no exista un saldo en estado desde REST
                    if (saldoFirestore !== undefined && saldo === null) {
                        setSaldo(Number(saldoFirestore));
                    }
                }
            },
            (err) => {
                console.warn("⚠️ [CIMCO-WALLET-NOSQL] Alerta en canal secundario NoSQL:", err);
            }
        );
        
        return () => unsub();
    }, [user?.uid, saldo]);

    return (
        <div className="min-h-screen bg-[#121214] font-sans text-zinc-100 p-4 md:p-8 flex flex-col gap-6 selection:bg-orange-500 selection:text-zinc-950">
            {/* CABECERA OPERATIVA DE TESORERÍA */}
            <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 mb-2 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                        <Wallet size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest text-white">Caja de Despachos</h1>
                        <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">
                            Control de Fondos y Liquidaciones de Cooperativa (MongoDB Central)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={obtenerSaldoBackend}
                        className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-white border border-white/5 hover:border-orange-500/30 px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                        title="Recargar Balance de MongoDB"
                    >
                        <RefreshCw size={12} className={`text-orange-400 ${loadingSaldo ? 'animate-spin' : ''}`} />
                        Sincronizar Fondos
                    </button>

                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase bg-zinc-950/50 border border-white/5 px-3 py-1.5 rounded-xl text-zinc-400">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
                        {isConnected ? "Tesorería en Vivo (WSS://)" : "Socket Desconectado"}
                    </div>
                </div>
            </header>

            {/* 🚨 BANDEROLA DE ESTADO DE UMBRAL OPERATIVO */}
            {saldo !== null && (
                saldoInsuficiente ? (
                    <div className="backdrop-blur-md bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 text-red-400 font-mono text-xs shadow-lg animate-pulse">
                        <div className="flex items-center gap-3">
                            <ShieldAlert size={20} className="shrink-0 text-red-400" />
                            <div>
                                <p className="font-black uppercase tracking-wider">Opción de Despacho Bloqueada</p>
                                <p className="text-[10px] text-red-300/80 uppercase mt-0.5">
                                    El saldo de caja actual (${Number(saldo).toLocaleString()} COP) es inferior al umbral operativo mínimo de ${UMBRAL_MINIMO_SALDO.toLocaleString()} COP. Recargue la billetera para habilitar la asignación de rutas y pujas.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="backdrop-blur-md bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-3 text-emerald-400 font-mono text-xs shadow-md">
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                        <p className="text-[10px] uppercase tracking-wider font-semibold">
                            Habilitado para Despacho: Saldo sobre el umbral mínimo operativo (${UMBRAL_MINIMO_SALDO.toLocaleString()} COP).
                        </p>
                    </div>
                )
            )}

            {errorCaja ? (
                <div className="backdrop-blur-md bg-red-500/5 p-6 rounded-3xl border border-red-500/20 text-center flex flex-col items-center gap-3 shadow-xl font-mono">
                    <AlertTriangle className="text-red-500" size={24} />
                    <p className="text-zinc-300 text-xs uppercase tracking-wide">{errorCaja}</p>
                    <button 
                        onClick={() => obtenerSaldoBackend()} 
                        className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-orange-500/40 text-[10px] text-zinc-400 hover:text-white uppercase font-bold py-2 px-4 rounded-xl transition-all"
                    >
                        <RefreshCw size={12} /> Reconectar Tesorería
                    </button>
                </div>
            ) : (
                <div className="backdrop-blur-xl bg-[#161619]/40 border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Fondo Operativo de Caja</p>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase ${
                            saldoInsuficiente 
                                ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}>
                            {saldoInsuficiente ? 'Despacho Bloqueado' : 'Despacho Activo'}
                        </span>
                    </div>
                    
                    {saldo === null || loadingSaldo ? (
                        <div className="h-10 flex items-center gap-2 text-zinc-500 font-mono text-xs uppercase animate-pulse mb-6">
                            <Loader size={16} className="animate-spin text-orange-400" /> Consultando fondos en tesorería central...
                        </div>
                    ) : (
                        <h2 className={`text-4xl font-black mb-6 relative z-10 font-mono tracking-tight ${
                            saldoInsuficiente ? 'text-red-400' : 'text-white'
                        }`}>
                            ${Number(saldo).toLocaleString()} <span className="text-xs font-medium text-zinc-500">COP</span>
                        </h2>
                    )}

                    <div className="flex gap-4 relative z-10">
                        {idUsuario && rolVerificado && (
                            <BotonRecarga usuarioId={idUsuario} rol={rolVerificado} onRecargaExitosa={obtenerSaldoBackend} />
                        )}
                    </div>
                </div>
            )}

            {/* SECCIÓN DE MOVIMIENTOS E HISTORIAL DE TRANSACCIONES REST */}
            <div className="flex-1 backdrop-blur-md bg-[#161619]/40 rounded-3xl p-6 border border-white/5 shadow-lg flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Activity size={18} className="text-orange-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Movimientos Recientes (MongoDB Core)</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto h-96 pr-2 custom-scrollbar font-mono">
                    {idUsuario && <TransactionHistory uid={idUsuario} token={token} />}
                </div>
            </div>
        </div>
    );
};

export default WalletDespachador;