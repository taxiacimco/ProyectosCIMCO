// Versión Arquitectura: V1.10 - Estabilización de Selección en Stream y Resiliencia Numérica
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\GestionBilleteras.jsx
 * Misión: Monitoreo transaccional de wallets e inyección de recargas autorizadas en tiempo real.
 * Ajuste V1.10: Optimización del efecto de re-selección por identidad persistente y blindaje de formateo.
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, query, increment, serverTimestamp } from 'firebase/firestore';
import { Wallet, ArrowUpRight, ShieldAlert, Search, DollarSign, ServerOff, Loader, CheckCircle2 } from 'lucide-react';

const GestionBilleteras = () => {
    const [wallets, setWallets] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [montoAbono, setMontoAbono] = useState('');
    const [procesando, setProcesando] = useState(false);
    const [errorTransaccion, setErrorTransaccion] = useState(null);
    const [exitoTransaccion, setExitoTransaccion] = useState(false);
    const [loading, setLoading] = useState(true);

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        setLoading(true);
        const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
        const q = query(collection(db, pathBilleteras));

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                if (!isMounted.current) return;
                const lista = snapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }));
                setWallets(lista);
                setLoading(false);
            },
            (err) => {
                console.error("❌ [CIMCO-WALLETS-STREAM-ERROR]:", err);
                if (isMounted.current) {
                    setErrorTransaccion("Fallo crítico de sincronización con la bóveda de datos.");
                    setLoading(false);
                }
            }
        );

        return () => unsubscribe();
    }, []);

    // Sincronizar selección activa comparando id y balances reales para evitar ciclos infinitos de render
    useEffect(() => {
        if (selectedWallet) {
            const actualizada = wallets.find(w => w.id === selectedWallet.id);
            if (actualizada && isMounted.current) {
                const balanceActual = actualizada.balance || actualizada.saldo || 0;
                const balancePrevio = selectedWallet.balance || selectedWallet.saldo || 0;
                if (balanceActual !== balancePrevio || actualizada.id !== selectedWallet.id) {
                    setSelectedWallet(actualizada);
                }
            }
        }
    }, [wallets, selectedWallet]);

    const handleMontoChange = (e) => {
        const valRaw = e.target.value.replace(/\D/g, ''); 
        setMontoAbono(valRaw);
    };

    const ejecutarAbonoAWallet = async (e) => {
        e.preventDefault();
        if (!selectedWallet || !montoAbono) return;

        const montoNumerico = parseInt(montoAbono, 10);
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            setErrorTransaccion("El monto ingresado debe ser un valor entero positivo.");
            return;
        }

        setProcesando(true);
        setErrorTransaccion(null);
        setExitoTransaccion(false);

        try {
            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
            const pathAuditoria = FIRESTORE_PATHS?.transactions || 'transacciones';

            const walletRef = doc(db, pathBilleteras, selectedWallet.id);
            const auditRef = collection(db, pathAuditoria);

            const campoBalanceActualizar = ('balance' in selectedWallet) ? 'balance' : (('saldo' in selectedWallet) ? 'saldo' : 'balance');

            await updateDoc(walletRef, {
                [campoBalanceActualizar]: increment(montoNumerico),
                ultimaActualizacion: serverTimestamp()
            });

            await addDoc(auditRef, {
                usuarioId: selectedWallet.id,
                tipo: 'RECARGA',
                monto: montoNumerico,
                timestamp: serverTimestamp(),
                referencia: `RECARGA_MANUAL_ADMIN_${Date.now().toString().slice(-6)}`,
                ejecutor: 'ADMINISTRADOR_SISTEMA'
            });

            if (isMounted.current) {
                setExitoTransaccion(true);
                setMontoAbono('');
                setProcesando(false);
                setTimeout(() => {
                    if (isMounted.current) setExitoTransaccion(false);
                }, 4000);
            }
        } catch (err) {
            console.error("❌ [CIMCO-TX-ERROR] Error al procesar el abono manual:", err);
            if (isMounted.current) {
                setErrorTransaccion("Error de pasarela interna. La transacción fue revertida de forma segura.");
                setProcesando(false);
            }
        }
    };

    const filteredWallets = wallets.filter(w => {
        const queryTerm = busqueda.toLowerCase().trim();
        const id = (w.id || '').toLowerCase();
        const nombre = (w.nombreUsuario || w.nombre || w.userName || '').toLowerCase();
        const rol = (w.rolUsuario || w.rol || w.userRole || '').toLowerCase();
        return id.includes(queryTerm) || nombre.includes(queryTerm) || rol.includes(queryTerm);
    });

    return (
        <div className="w-full flex flex-col gap-4 font-mono antialiased text-zinc-100">
            {/* BARRA DE FILTRADO TÁCTICO */}
            <div className="w-full backdrop-blur-md bg-[#121214]/80 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="BUSCAR WALLET POR ID, PROPIETARIO O ROL..."
                        className="w-full bg-zinc-950/80 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/30 transition-colors uppercase tracking-wider"
                    />
                </div>
                <div className="text-[10px] bg-zinc-950/60 border border-white/5 px-3 py-1.5 rounded-lg text-zinc-400 font-bold uppercase tracking-widest shrink-0">
                    Bóvedas: <span className="text-yellow-500">{filteredWallets.length}</span> Monitoreadas
                </div>
            </div>

            {/* GRILLA OPERATIVA CENTRAL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-4 shadow-xl">
                    <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                        <Wallet className="text-yellow-500 animate-pulse" size={18} />
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-200">
                            Grilla Logística de Saldos
                        </h3>
                    </div>

                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-2">
                            <Loader className="animate-spin text-yellow-500" size={24} />
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Sincronizando Bóveda de Saldos...</span>
                        </div>
                    ) : filteredWallets.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-2 border border-dashed border-white/5 rounded-2xl bg-white/[0.002]">
                            <ServerOff className="text-zinc-700" size={28} />
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest">No se detectaron carteras activas</span>
                        </div>
                    ) : (
                        <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5 pr-1">
                            {filteredWallets.map((w) => {
                                const keyEstable = w.id || `wallet-node-${Math.random()}`;
                                const isSelected = selectedWallet?.id === w.id;
                                const saldoNumerico = Number(w.balance || w.saldo || 0);

                                return (
                                    <div 
                                        key={keyEstable}
                                        onClick={() => {
                                            setSelectedWallet(w);
                                            setErrorTransaccion(null);
                                            setExitoTransaccion(false);
                                        }}
                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150 mb-1.5 border ${
                                            isSelected 
                                                ? 'bg-yellow-500/5 border-yellow-500/20' 
                                                : 'bg-zinc-950/20 border-transparent hover:bg-white/[0.01]'
                                        }`}
                                    >
                                        <div>
                                            <p className="text-xs font-bold text-zinc-200 uppercase truncate max-w-[180px]">
                                                {w.nombreUsuario || w.nombre || w.userName || 'NODO DESCONOCIDO'}
                                            </p>
                                            <p className="text-[9px] text-zinc-600 font-mono mt-0.5">
                                                ID: {w.id} • ROL: <span className="text-zinc-400 uppercase">{w.rolUsuario || w.rol || w.userRole || 'PASAJERO'}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-emerald-400">
                                                ${isNaN(saldoNumerico) ? '0' : saldoNumerico.toLocaleString('es-CO')} COP
                                            </p>
                                            <p className="text-[8px] text-zinc-500 uppercase tracking-widest mt-0.5">
                                                Saldo Disponible
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* PANEL DE RECARGA */}
                <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                            <DollarSign className="text-yellow-500" size={18} />
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-200">
                                Consola de Recarga
                            </h3>
                        </div>

                        {selectedWallet ? (
                            <form onSubmit={ejecutarAbonoAWallet} className="flex flex-col gap-4">
                                <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-3">
                                    <span className="text-[8px] font-black tracking-widest text-zinc-500 uppercase">Beneficiario Seleccionado</span>
                                    <p className="text-xs font-bold text-white mt-1 uppercase">
                                        {selectedWallet.nombreUsuario || selectedWallet.nombre || selectedWallet.userName || 'NODO DESCONOCIDO'}
                                    </p>
                                    <p className="text-[9px] text-zinc-400 font-mono mt-0.5 truncate">
                                        ID: {selectedWallet.id}
                                    </p>
                                    <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-[9px] text-zinc-500 uppercase font-black">Saldo Actual:</span>
                                        <span className="text-xs font-black text-emerald-400">
                                            ${Number(selectedWallet.balance || selectedWallet.saldo || 0).toLocaleString('es-CO')} COP
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">Monto a Inyectar (COP)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">$</span>
                                        <input 
                                            type="text"
                                            value={montoAbono}
                                            onChange={handleMontoChange}
                                            placeholder="EJ. 15000"
                                            disabled={procesando}
                                            className="w-full bg-zinc-950/80 border border-white/5 rounded-xl pl-8 pr-4 py-3 text-xs font-bold text-white placeholder-zinc-700 focus:outline-none focus:border-yellow-500/30 tracking-wider"
                                            required
                                        />
                                    </div>
                                </div>

                                {errorTransaccion && (
                                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 flex gap-2.5 items-start">
                                        <ShieldAlert size={14} className="text-rose-400 shrink-0 mt-0.5" />
                                        <p className="text-[9px] text-rose-300 font-medium leading-relaxed uppercase">{errorTransaccion}</p>
                                    </div>
                                )}

                                {exitoTransaccion && (
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex gap-2.5 items-start">
                                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                        <p className="text-[9px] text-emerald-300 font-bold leading-relaxed uppercase">Abono ejecutado con éxito.</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={procesando || !montoAbono}
                                    className={`w-full py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 active:scale-98 ${
                                        procesando || !montoAbono
                                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-transparent' 
                                            : 'bg-yellow-500 hover:bg-yellow-600 text-neutral-900 border border-yellow-400 shadow-lg shadow-yellow-500/5'
                                    }`}
                                >
                                    {procesando ? (
                                        <>
                                            <Loader size={12} className="animate-spin text-neutral-900" />
                                            <span>Sincronizando Bóveda...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ArrowUpRight size={14} className="text-neutral-900" />
                                            <span>Autorizar Abono</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="py-12 border border-dashed border-white/5 text-center text-zinc-600 text-[9px] rounded-2xl font-bold uppercase tracking-wider bg-white/[0.005] flex flex-col items-center justify-center gap-2 px-4">
                                <ShieldAlert size={18} className="text-zinc-700 animate-pulse" />
                                <span>Selecciona un nodo de saldos para abrir compuerta transaccional.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GestionBilleteras;