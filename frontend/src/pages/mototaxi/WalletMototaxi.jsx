// Versión Arquitectura: V12.2 - Sincronización Financiera con Validación de Identidad y Purga Defensiva 401
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { SALDO_MINIMO_OPERATIVO } from '@/config/constants';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity, AlertCircle } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';
import api from '@/config/api';
import { logger } from '@/utils/logger';

/**
 * 🛡️ PROTOCOLO DE PURGA Y LOGOUT DEFENSIVO
 * Limpia el almacenamiento local en caché y reorienta al operador al formulario de autenticación.
 */
const ejecutarLogoutDefensivo = async (logoutFn) => {
    if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
    }
    try {
        if (typeof logoutFn === 'function') {
            await logoutFn();
        }
    } catch (err) {
        if (logger && typeof logger.error === 'function') {
            logger.error("🚨 [CIMCO-AUTH-DEFENSE] Error en logout del contexto:", err);
        }
    } finally {
        if (typeof window !== 'undefined') {
            window.location.replace('/login');
        }
    }
};

const WalletMototaxi = () => {
    const { user, logout } = useAuth();
    const [balance, setBalance] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [errorUsuario, setErrorUsuario] = useState(null);

    // 🛡️ Blindaje Anti-Undefined: Evaluación defensiva del límite de configuración global
    const limiteMinimoOperativo = Number(SALDO_MINIMO_OPERATIVO) || 2000;

    const handlePurgaSesion = useCallback(async (mensaje) => {
        if (typeof window !== 'undefined') {
            alert(mensaje || "🔒 Sesión Expirada o Usuario no Encontrado: Por favor reingrese con un usuario válido.");
        }
        await ejecutarLogoutDefensivo(logout);
    }, [logout]);

    useEffect(() => {
        let unsubWallet = null;
        let unsubUser = null;

        if (!user?.uid) {
            setCargando(false);
            return;
        }

        const conductorUid = user.uid;

        // 1. Sincronización y Validación previa del documento del usuario en Firestore/MongoDB
        const pathUsuarios = FIRESTORE_PATHS?.usuarios || FIRESTORE_PATHS?.conductores || 'usuarios';
        const userDocRef = doc(db, pathUsuarios, conductorUid);

        unsubUser = onSnapshot(
            userDocRef,
            (userSnap) => {
                if (!userSnap.exists()) {
                    if (logger && typeof logger.warn === 'function') {
                        logger.warn("🚨 [CIMCO-FINANCE-DEFENSE] Usuario no registrado en la colección de la base de datos.");
                    }
                    setErrorUsuario("Usuario no encontrado en la base de datos.");
                    handlePurgaSesion("⚠️ Su usuario no existe o ha sido eliminado del sistema. Limpiando sesión...");
                    return;
                }
                setErrorUsuario(null);
            },
            (error) => {
                if (logger && typeof logger.error === 'function') {
                    logger.error("🚨 [CIMCO-USER-SYNC-ERROR] Error al verificar existencia del usuario:", error);
                }
                if (error?.code === 'permission-denied' || error?.status === 401 || String(error).includes('401')) {
                    handlePurgaSesion("🔒 401 Unauthorized: Acceso no autorizado o token caducado. Limpiando memoria caché...");
                }
            }
        );

        // 2. Verificación complementaria vía API REST con captura explícita de estado 401
        const verificarUsuarioApi = async () => {
            try {
                const res = await api.get(`/conductores/verificar/${conductorUid}`);
                if (res?.data?.success === false) {
                    handlePurgaSesion("⚠️ Usuario no válido según la verificación del servidor.");
                }
            } catch (err) {
                if (err?.response?.status === 401) {
                    if (logger && typeof logger.error === 'function') {
                        logger.error("🚨 [CIMCO-REST-401] Respuesta 401 Unauthorized capturada en API de cartera.");
                    }
                    handlePurgaSesion("🔒 401 Unauthorized: Sesión extinta. Reinicie sesión para continuar.");
                }
            }
        };

        verificarUsuarioApi();

        // 3. Sincronización del estado financiero (Wallet)
        const pathWallets = FIRESTORE_PATHS?.wallets || 'wallets';
        const walletDocRef = doc(db, pathWallets, conductorUid);

        unsubWallet = onSnapshot(
            walletDocRef,
            (docRef) => {
                if (docRef?.exists()) {
                    const data = docRef.data();
                    const saldoCalculado = data?.balance ?? data?.saldo ?? 0;
                    setBalance(Number(saldoCalculado) || 0);
                } else {
                    // Fallback a propiedades de saldo en objeto de usuario si el documento wallet no está instanciado
                    const saldoFallback = user?.saldoWallet ?? user?.billetera?.saldo ?? user?.saldo ?? 0;
                    setBalance(Number(saldoFallback) || 0);
                }
                setCargando(false);
            },
            (error) => {
                if (logger && typeof logger.error === 'function') {
                    logger.error("🚨 [CIMCO-WALLET-SYNC-ERROR] Fallo en la lectura del estado financiero:", error);
                }
                if (error?.code === 'permission-denied' || error?.status === 401 || String(error).includes('401')) {
                    handlePurgaSesion("🔒 401 Unauthorized: Sin autorización para consultar saldo.");
                }
                setCargando(false);
            }
        );

        return () => {
            if (unsubWallet) unsubWallet();
            if (unsubUser) unsubUser();
        };
    }, [user?.uid, user?.saldoWallet, user?.billetera?.saldo, user?.saldo, handlePurgaSesion]);

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

            {/* ⚠️ Indicador de Estado de Sincronización de Usuario */}
            {errorUsuario && (
                <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-300 backdrop-blur-md flex items-center gap-3">
                    <AlertCircle size={20} className="shrink-0 text-amber-400" />
                    <p className="text-xs font-semibold">{errorUsuario}</p>
                </div>
            )}

            {/* 🚦 StatusBanner: Indicador Visual de Estado (CIMCO-UI V9.3) */}
            <div className={`p-4 rounded-xl border backdrop-blur-md ${
                saldoEfectivo >= limiteMinimoOperativo 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
                <p className="font-semibold text-sm">
                    {saldoEfectivo >= limiteMinimoOperativo 
                        ? '✅ Cuenta Operativa - Habilitado para recibir carreras' 
                        : `🚫 Cuenta Inactiva - Requiere recarga mínima de $${limiteMinimoOperativo.toLocaleString('es-CO')} COP`}
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
                        ${(balance ?? 0).toLocaleString('es-CO')} COP
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