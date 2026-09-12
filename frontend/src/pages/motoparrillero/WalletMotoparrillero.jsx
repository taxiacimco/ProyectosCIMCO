// Versión Arquitectura: V12.2 - Verificación de Usuario, Umbral SALDO_MINIMO_OPERATIVO y Expulsión Defensiva por Token Expirado
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { SALDO_MINIMO_OPERATIVO } from '@/config/constants';
import api from '@/config/api';
import { isTokenExpired } from '@/utils/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, Activity, AlertCircle, ShieldAlert } from 'lucide-react';
import BotonRecarga from '@/components/wallet/BotonRecarga';
import TransactionHistory from '@/components/wallet/TransactionHistory';

const WalletMotoparrillero = () => {
    const { user, logout, loading: authLoading } = useAuth();
    const [balance, setBalance] = useState(0);

    // 🛡️ DESVINCULACIÓN ATÓMICA Y PURGA DE SESIÓN (EXPULSIÓN DEFENSIVA)
    const desvincularSesionAtomica = useCallback(() => {
        console.warn("🚨 [CIMCO-AUTH-EXPULSION] Expulsión defensiva iniciada desde Billetera: Invalidation y purga local.");
        
        if (typeof localStorage !== 'undefined') localStorage.clear();
        if (typeof sessionStorage !== 'undefined') sessionStorage.clear();

        if (typeof logout === 'function') {
            try {
                logout();
            } catch (e) {
                console.error("🚨 Error al ejecutar logout del contexto auth:", e);
            }
        }

        if (typeof window !== 'undefined') {
            window.location.replace('/login');
        }
    }, [logout]);

    // 🛡️ GUARDA CENTRALIZADA DE EXPIRACIÓN DE TOKEN JWT
    const verificarSesionToken = useCallback(() => {
        const token = (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null) || user?.token;
        if (!token) return true;
        try {
            if (typeof isTokenExpired === 'function' && isTokenExpired(token)) {
                return true;
            }
            const base64Url = token.split('.')[1];
            if (!base64Url) return true;
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const payload = JSON.parse(jsonPayload);
            if (payload?.exp && Date.now() >= payload.exp * 1000) {
                return true;
            }
        } catch (e) {
            console.warn("⚠️ [CIMCO-AUTH] Fallo al validar expiración de token JWT:", e);
        }
        return false;
    }, [user?.token]);

    // 🌐 MONITOR CONTINUO DE EXPIRACIÓN DE TOKEN
    useEffect(() => {
        if (!authLoading && verificarSesionToken()) {
            console.warn("🚨 [CIMCO-AUTH] Token expirado o no válido detectado en WalletMotoparrillero.");
            desvincularSesionAtomica();
        }
    }, [authLoading, verificarSesionToken, desvincularSesionAtomica]);

    // ⚡ INTERCEPCIÓN Y VALIDACIÓN DE SESIÓN VÍA CONSULTA API /api/billetera/saldo
    useEffect(() => {
        const token = (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null) || user?.token;
        if (!token || !user?.uid) return;

        let isMounted = true;
        const verificarSaldoBilletera = async () => {
            if (verificarSesionToken()) {
                desvincularSesionAtomica();
                return;
            }

            try {
                await api.get('/billetera/saldo', {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                if (!isMounted) return;
                const statusCode = error?.response?.status || error?.status;
                if (statusCode === 401) {
                    console.error("🚨 [CIMCO-401-DETECTED] Código 401 Unauthorized interceptado en /api/billetera/saldo.");
                    desvincularSesionAtomica();
                }
            }
        };

        verificarSaldoBilletera();
        const intervalId = setInterval(verificarSaldoBilletera, 30000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [user?.uid, user?.token, desvincularSesionAtomica, verificarSesionToken]);

    // 📡 ESCUCHA EN TIEMPO REAL DEL SALDO VÍA FIRESTORE
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

    // 🛡️ VERIFICACIÓN DE USUARIO Y PANTALLA DE CARGA / PROTECCIÓN DEFENSIVA
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0e0e11] font-mono text-zinc-100 p-6 flex flex-col justify-center items-center">
                <div className="p-4 bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-xl flex items-center gap-3 text-cyan-400 font-black text-xs uppercase tracking-widest animate-pulse">
                    <Wallet size={20} className="animate-spin" /> Verificando credenciales de usuario...
                </div>
            </div>
        );
    }

    if (!user && !authLoading) {
        return (
            <div className="min-h-screen bg-[#0e0e11] font-mono text-zinc-100 p-6 flex flex-col justify-center items-center">
                <div className="p-6 bg-[#121214]/80 backdrop-blur-md border border-red-500/30 rounded-xl flex flex-col items-center gap-3 text-red-400 font-black text-xs uppercase tracking-widest max-w-sm text-center">
                    <ShieldAlert size={32} strokeWidth={2.5} />
                    <span>Acceso denegado. No se encontró una sesión activa de operador.</span>
                    <button 
                        onClick={desvincularSesionAtomica} 
                        className="mt-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 text-[10px] tracking-widest uppercase transition-all"
                    >
                        Ir al Login
                    </button>
                </div>
            </div>
        );
    }

    const saldoEfectivo = Number(balance || 0);
    const umbralMinimo = Number(SALDO_MINIMO_OPERATIVO) || 2000;
    const cuentaHabilitada = saldoEfectivo >= umbralMinimo;

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

            {/* 🛡️ BANNER VISUAL DE ESTADO OPERATIVO CON SALDO_MINIMO_OPERATIVO */}
            <div className={`p-4 rounded-xl border backdrop-blur-md transition-all duration-200 ${
                cuentaHabilitada 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse'
            }`}>
                <div className="flex items-center gap-2.5">
                    {cuentaHabilitada ? (
                        <p className="font-semibold text-sm">
                            ✅ Cuenta Operativa - Habilitado para recibir servicios de motoparrillero
                        </p>
                    ) : (
                        <div className="flex items-start gap-2">
                            <AlertCircle size={18} className="shrink-0 text-rose-400 mt-0.5" strokeWidth={2.5} />
                            <div>
                                <p className="font-bold text-xs uppercase tracking-wider">
                                    🚫 Bloqueo Operativo: Saldo inferior al umbral mínimo
                                </p>
                                <p className="text-[10px] opacity-80 mt-0.5">
                                    Requiere una recarga mínima para alcanzar los ${umbralMinimo.toLocaleString('es-CO')} COP exigidos por el protocolo V12.2.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
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
                    <h2 className={`text-3xl font-black tracking-tight border-b border-white/5 pb-4 mb-5 ${cuentaHabilitada ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${saldoEfectivo.toLocaleString('es-CO')} COP
                    </h2>
                    
                    {/* Botonera Operativa Inyectada */}
                    <div className="flex gap-4 [&_button]:w-full [&_button]:bg-amber-500/20 [&_button]:text-amber-400 [&_button]:hover:bg-amber-500/30 [&_button]:font-black [&_button]:text-xs [&_button]:uppercase [&_button]:tracking-widest [&_button]:py-3.5 [&_button]:px-4 [&_button]:border [&_button]:border-amber-500/30 [&_button]:rounded-lg [&_button]:transition-all [&_button]:active:scale-95">
                        <BotonRecarga usuarioId={user?.uid} rol={user?.role || user?.rol || 'motoparrillero'} />
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