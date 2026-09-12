// Versión Arquitectura: V19.7 - Sincronización de Movimientos y Saldo en Tiempo Real por WebSockets
/**
 * Ubicación: frontend\src\pages\despachador\WalletDespachador.jsx
 * Misión: Caja de Despachos Vinculada con Tesorería Central en MongoDB y Escucha de Saldo y Movimientos por WebSockets.
 * Ajuste V19.7: Vinculación completa de eventos WebSocket ("saldo_actualizado", "transaccion_completada", "recarga_confirmada", "pago_confirmado", "movimiento_billetera")
 * para refrescar en tiempo real tanto el saldo general como la lista de movimientos e historial de transacciones.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import api from '@/config/api';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { SALDO_MINIMO_OPERATIVO } from '@/config/constants';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity, RefreshCw, Loader, ShieldAlert, CheckCircle2, LogOut } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';

const WalletDespachador = () => {
    // 🛡️ Guardas de Seguridad y Consumo del Contexto Centralizado
    const authContext = useAuth ? useAuth() : {};
    const user = authContext?.user || null;
    const logout = authContext?.logout || null;
    const token = authContext?.token || localStorage.getItem('token') || user?.token || "";
    
    const socketContext = useSocket ? useSocket() : {};
    const socket = socketContext?.socket || null;
    const isConnected = socketContext?.isConnected ?? Boolean(socket?.connected);

    // 📝 ESTADOS DE CONTROL DE TESORERÍA
    const [saldo, setSaldo] = useState(null); 
    const [errorCaja, setErrorCaja] = useState(null);
    const [esError401, setEsError401] = useState(false);
    const [loadingSaldo, setLoadingSaldo] = useState(true);
    const [refreshHistoryKey, setRefreshHistoryKey] = useState(Date.now());

    const idUsuario = user?.id || user?._id || user?.uid || "";
    const rolVerificado = user?.role || user?.rol;

    const umbralMinimo = Number(SALDO_MINIMO_OPERATIVO) || 2000;

    // 🛡️ EVALUACIÓN DE BLOQUEO POR SALDO INSUFICIENTE
    const saldoInsuficiente = saldo !== null && Number(saldo) < umbralMinimo;

    // 🚨 PROTOCOLO DE PURGADO DE SEGURIDAD ANTE DENEGACIÓN 401 (UNAUTHORIZED)
    const ejecutarLimpiezaYSesion401 = useCallback(() => {
        console.warn("🚨 [CIMCO-401-UNAUTHORIZED] Acceso denegado o token expirado. Purgando credenciales locales y redirigiendo a autenticación MongoDB.");
        if (typeof localStorage !== 'undefined') localStorage.clear();
        if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
        if (logout && typeof logout === "function") {
            try {
                logout();
            } catch (e) {
                console.error("🚨 Error al ejecutar logout context:", e);
            }
        }
        if (typeof window !== 'undefined') {
            window.location.replace('/');
        }
    }, [logout]);

    // ⚡ INTERCEPTOR DE RESPUESTAS HTTP (AXIOS) PARA CAPTURAR 401 EN LA BILLETERA
    useEffect(() => {
        const interceptorId = api.interceptors.response.use(
            (response) => response,
            (error) => {
                const status = error?.response?.status || error?.status;
                const msg = String(error?.message || '').toLowerCase();
                const respMsg = String(error?.response?.data?.message || '').toLowerCase();

                if (status === 401 || msg.includes('401') || msg.includes('unauthorized') || respMsg.includes('unauthorized') || respMsg.includes('jwt expired')) {
                    setEsError401(true);
                    setErrorCaja("Acceso denegado / Sesión expirada (HTTP 401). Es necesario limpiar la memoria temporal e iniciar sesión con credenciales válidas.");
                }
                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.response.eject(interceptorId);
        };
    }, []);

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
                const firstStatus = firstErr?.response?.status || firstErr?.status;
                if (firstStatus === 401) {
                    throw firstErr;
                }
                // Fallback secundario si es un rol de conductor o tesorería específica
                endpoint = `/api/conductores/billetera/${idUsuario}`;
                response = await api.get(endpoint, axiosConfig);
            }

            const dataBackend = response?.data?.usuario || response?.data?.data || response?.data || {};
            const saldoCalculado = dataBackend?.saldo ?? dataBackend?.balance ?? dataBackend?.billetera ?? null;

            if (saldoCalculado !== null) {
                setSaldo(Number(saldoCalculado));
                setErrorCaja(null);
                setEsError401(false);
            }
        } catch (err) {
            console.error("🚨 [CIMCO-WALLET-REST] Error al consultar tesorería central backend:", err);
            const status = err?.response?.status || err?.status;
            const is401 = status === 401 || String(err?.message || '').toLowerCase().includes('401') || String(err?.response?.data?.message || '').toLowerCase().includes('unauthorized');

            if (is401) {
                setEsError401(true);
                setErrorCaja("Error 401: Sesión caducada o token no autorizado. Limpie la memoria temporal e inicie sesión de nuevo.");
            } else if (saldo === null) {
                setErrorCaja("No fue posible sincronizar el saldo con la tesorería central MongoDB.");
            }
        } finally {
            setLoadingSaldo(false);
        }
    }, [idUsuario, token, saldo]);

    // ⚡ REFRESCAR SALDO E HISTORIAL DE MOVIMIENTOS
    const refrescarTodoEnTiempoReal = useCallback(() => {
        obtenerSaldoBackend();
        setRefreshHistoryKey(Date.now());
    }, [obtenerSaldoBackend]);

    // 📡 CONSULTA INICIAL Y SUSCRIPCIÓN SOCKET.IO PARA SALDO Y MOVIMIENTOS EN TIEMPO REAL
    useEffect(() => {
        obtenerSaldoBackend();

        if (socket) {
            const handleSaldoActualizado = (data) => {
                const esParaUsuario = !data?.usuarioId || data?.usuarioId === idUsuario || data?.id === idUsuario || data?.uid === idUsuario;
                if (esParaUsuario) {
                    if (data?.nuevoSaldo !== undefined) {
                        setSaldo(Number(data.nuevoSaldo));
                    } else if (data?.saldo !== undefined) {
                        setSaldo(Number(data.saldo));
                    } else {
                        obtenerSaldoBackend();
                    }
                    setRefreshHistoryKey(Date.now());
                }
            };

            const handleTransaccionConfirmada = (data) => {
                const esParaUsuario = !data?.usuarioId || data?.usuarioId === idUsuario || data?.id === idUsuario || data?.uid === idUsuario || data?.conductorId === idUsuario;
                if (esParaUsuario) {
                    refrescarTodoEnTiempoReal();
                }
            };

            socket.on("saldo_actualizado", handleSaldoActualizado);
            socket.on("transaccion_completada", handleTransaccionConfirmada);
            socket.on("recarga_confirmada", handleTransaccionConfirmada);
            socket.on("pago_confirmado", handleTransaccionConfirmada);
            socket.on("movimiento_billetera", handleTransaccionConfirmada);

            return () => {
                socket.off("saldo_actualizado", handleSaldoActualizado);
                socket.off("transaccion_completada", handleTransaccionConfirmada);
                socket.off("recarga_confirmada", handleTransaccionConfirmada);
                socket.off("pago_confirmado", handleTransaccionConfirmada);
                socket.off("movimiento_billetera", handleTransaccionConfirmada);
            };
        }
    }, [socket, idUsuario, obtenerSaldoBackend, refrescarTodoEnTiempoReal]);

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
                if (err?.code === 'permission-denied') {
                    setEsError401(true);
                    setErrorCaja("Acceso denegado por reglas de seguridad Firestore (401/Permission Denied). Se sugiere purgar sesión.");
                }
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
                        onClick={refrescarTodoEnTiempoReal}
                        className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-white border border-white/5 hover:border-orange-500/30 px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                        title="Recargar Balance y Movimientos de MongoDB"
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

            {/* 🚨 BANDEROLA ESPECIAL DE ADVERTENCIA PARA ERROR HTTP 401 */}
            {esError401 && (
                <div className="backdrop-blur-md bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-red-400 font-mono text-xs shadow-xl animate-pulse">
                    <div className="flex items-center gap-3">
                        <ShieldAlert size={22} className="shrink-0 text-red-400" />
                        <div>
                            <p className="font-black uppercase tracking-wider">Sesión Expirada o Credenciales Inválidas (Error 401)</p>
                            <p className="text-[10px] text-red-300/80 uppercase mt-0.5">
                                La sesión actual fue denegada por la tesorería central. Limpie los datos temporales del navegador e ingrese nuevamente.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={ejecutarLimpiezaYSesion401}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase py-2 px-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                        <LogOut size={14} />
                        Limpiar Memoria y Reautenticar
                    </button>
                </div>
            )}

            {/* 🚨 BANDEROLA DE ESTADO DE UMBRAL OPERATIVO */}
            {!esError401 && saldo !== null && (
                saldoInsuficiente ? (
                    <div className="backdrop-blur-md bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 text-red-400 font-mono text-xs shadow-lg animate-pulse">
                        <div className="flex items-center gap-3">
                            <ShieldAlert size={20} className="shrink-0 text-red-400" />
                            <div>
                                <p className="font-black uppercase tracking-wider">Opción de Despacho Bloqueada</p>
                                <p className="text-[10px] text-red-300/80 uppercase mt-0.5">
                                    El saldo de caja actual (${Number(saldo).toLocaleString()} COP) es inferior al umbral operativo mínimo de ${umbralMinimo.toLocaleString()} COP. Recargue la billetera para habilitar la asignación de rutas y pujas.
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
                )
            )}

            {errorCaja ? (
                <div className="backdrop-blur-md bg-red-500/5 p-6 rounded-3xl border border-red-500/20 text-center flex flex-col items-center gap-4 shadow-xl font-mono">
                    <ShieldAlert className="text-red-400 animate-pulse" size={28} />
                    <div className="space-y-1">
                        <p className="text-white text-xs font-black uppercase tracking-wider">
                            {esError401 ? 'Error 401 - Autenticación Requerida' : 'Error en Tesorería Central'}
                        </p>
                        <p className="text-zinc-400 text-[10px] uppercase tracking-wide max-w-md mx-auto leading-relaxed">
                            {errorCaja}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
                        {esError401 ? (
                            <button
                                onClick={ejecutarLimpiezaYSesion401}
                                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase py-2.5 px-5 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
                            >
                                <LogOut size={14} /> Purgar Memoria y Reautenticar
                            </button>
                        ) : (
                            <button 
                                onClick={refrescarTodoEnTiempoReal} 
                                className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-orange-500/40 text-[10px] text-zinc-400 hover:text-white uppercase font-bold py-2 px-4 rounded-xl transition-all cursor-pointer"
                            >
                                <RefreshCw size={12} /> Reconectar Tesorería
                            </button>
                        )}
                    </div>
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
                            <BotonRecarga usuarioId={idUsuario} rol={rolVerificado} onRecargaExitosa={refrescarTodoEnTiempoReal} />
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
                    {idUsuario && (
                        <TransactionHistory 
                            key={refreshHistoryKey} 
                            uid={idUsuario} 
                            token={token} 
                            refreshKey={refreshHistoryKey} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default WalletDespachador;