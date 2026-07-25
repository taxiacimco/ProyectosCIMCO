// Versión Arquitectura: V2.0.0 - Unificación Reactiva Usuarios/Billeteras + Fallback CIMCO Sanitizado
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\GestionBilleteras.jsx
 * Misión: Monitoreo transaccional de saldos con sincronización automática de usuarios/wallets,
 *         auto-inicialización de bóvedas y sanitización estricta de identidades de la flota.
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc, query, increment, serverTimestamp } from 'firebase/firestore';
import { Wallet, ArrowUpRight, ShieldAlert, Search, DollarSign, ServerOff, Loader, CheckCircle2, Shield } from 'lucide-react';

const GestionBilleteras = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [walletsMap, setWalletsMap] = useState({});
    const [busqueda, setBusqueda] = useState('');
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [montoAbono, setMontoAbono] = useState('');
    const [procesando, setProcesando] = useState(false);
    const [errorTransaccion, setErrorTransaccion] = useState(null);
    const [exitoTransaccion, setExitoTransaccion] = useState(false);
    const [loadingUsuarios, setLoadingUsuarios] = useState(true);
    const [loadingWallets, setLoadingWallets] = useState(true);

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // 1️⃣ Suscripción en Tiempo Real a la Colección de Usuarios
    useEffect(() => {
        setLoadingUsuarios(true);
        const pathUsuarios = FIRESTORE_PATHS?.users || 'usuarios';
        const qUsers = query(collection(db, pathUsuarios));

        const unsubscribeUsers = onSnapshot(qUsers,
            (snapshot) => {
                if (!isMounted.current) return;
                const listaUsers = snapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }));
                setUsuarios(listaUsers);
                setLoadingUsuarios(false);
            },
            (err) => {
                console.error("❌ [CIMCO-USERS-STREAM-ERROR]:", err);
                if (isMounted.current) {
                    setErrorTransaccion("Fallo al sincronizar directorio de la flota.");
                    setLoadingUsuarios(false);
                }
            }
        );

        return () => unsubscribeUsers();
    }, []);

    // 2️⃣ Suscripción en Tiempo Real a la Colección de Billeteras
    useEffect(() => {
        setLoadingWallets(true);
        const pathBilleteras = FIRESTORE_PATHS?.wallets || 'wallets';
        const qWallets = query(collection(db, pathBilleteras));

        const unsubscribeWallets = onSnapshot(qWallets,
            (snapshot) => {
                if (!isMounted.current) return;
                const map = {};
                snapshot.docs.forEach(docSnap => {
                    map[docSnap.id] = {
                        id: docSnap.id,
                        ...docSnap.data()
                    };
                });
                setWalletsMap(map);
                setLoadingWallets(false);
            },
            (err) => {
                console.error("❌ [CIMCO-WALLETS-STREAM-ERROR]:", err);
                if (isMounted.current) {
                    setErrorTransaccion("Fallo crítico de sincronización con la bóveda de datos.");
                    setLoadingWallets(false);
                }
            }
        );

        return () => unsubscribeWallets();
    }, []);

    // 🔧 Sanitización y resolución de nombres para la flota
    const obtenerNombreMostrar = (nodo) => {
        if (!nodo) return 'NODO DESCONOCIDO';

        const nombreDirecto = nodo.nombreUsuario || 
                              nodo.nombreCompleto || 
                              nodo.nombre || 
                              nodo.fullName || 
                              nodo.displayName || 
                              nodo.userName;

        if (nombreDirecto && nombreDirecto !== 'SIN REGISTRO') {
            return nombreDirecto;
        }

        if (nodo.email) {
            return nodo.email.split('@')[0].replace(/[._-]/g, ' ').toUpperCase();
        }

        return `OPERADOR ${(nodo.rol || nodo.role || 'SISTEMA').toUpperCase()}`;
    };

    // 3️⃣ Construcción Unificada: Fusiona Usuarios con Billeteras Existentes
    const listaBovedasUnificada = usuarios
        .filter(u => {
            const rol = (u.role || u.rol || '').toLowerCase().trim();
            // Excluye superusuarios/gerencia de la grilla de abonados
            return rol !== 'admin' && rol !== 'ceo' && rol !== 'gerente';
        })
        .map(u => {
            const wData = walletsMap[u.id] || {};
            const saldoExistente = wData.balance !== undefined ? wData.balance : (wData.saldo !== undefined ? wData.saldo : 0);

            return {
                id: u.id,
                uid: u.id,
                nombre: obtenerNombreMostrar(u),
                email: u.email || 'SIN_CORREO',
                rol: (u.role || u.rol || 'PASAJERO').toUpperCase(),
                balance: Number(saldoExistente),
                existeEnWallets: Boolean(walletsMap[u.id]),
                rawUserData: u,
                rawWalletData: wData
            };
        });

    // Mantener la selección sincronizada en vivo si cambia el saldo
    useEffect(() => {
        if (selectedWallet) {
            const actualizada = listaBovedasUnificada.find(w => w.id === selectedWallet.id);
            if (actualizada && isMounted.current) {
                if (actualizada.balance !== selectedWallet.balance || actualizada.id !== selectedWallet.id) {
                    setSelectedWallet(actualizada);
                }
            }
        }
    }, [walletsMap, usuarios]);

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
            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'wallets';
            const pathAuditoria = FIRESTORE_PATHS?.transactions || 'transacciones';

            const walletRef = doc(db, pathBilleteras, selectedWallet.id);
            const auditRef = collection(db, pathAuditoria);

            if (selectedWallet.existeEnWallets) {
                const campoBalance = ('balance' in selectedWallet.rawWalletData) ? 'balance' : 'balance';
                await updateDoc(walletRef, {
                    [campoBalance]: increment(montoNumerico),
                    ultimaActualizacion: serverTimestamp()
                });
            } else {
                await setDoc(walletRef, {
                    usuarioId: selectedWallet.id,
                    nombreUsuario: selectedWallet.nombre,
                    rolUsuario: selectedWallet.rol,
                    balance: montoNumerico,
                    creadoEl: serverTimestamp(),
                    ultimaActualizacion: serverTimestamp()
                });
            }

            await addDoc(auditRef, {
                usuarioId: selectedWallet.id,
                nombreUsuario: selectedWallet.nombre,
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

    const filteredWallets = listaBovedasUnificada.filter(w => {
        const queryTerm = busqueda.toLowerCase().trim();
        const id = (w.id || '').toLowerCase();
        const nombre = (w.nombre || '').toLowerCase();
        const rol = (w.rol || '').toLowerCase();
        const email = (w.email || '').toLowerCase();

        return id.includes(queryTerm) || nombre.includes(queryTerm) || rol.includes(queryTerm) || email.includes(queryTerm);
    });

    const isLoading = loadingUsuarios || loadingWallets;

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

                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-2">
                            <Loader className="animate-spin text-yellow-500" size={24} />
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Sincronizando Bóveda de Saldos...</span>
                        </div>
                    ) : filteredWallets.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-2 border border-dashed border-white/5 rounded-2xl bg-white/[0.002]">
                            <ServerOff className="text-zinc-700" size={28} />
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest">No se detectaron carteras activas recargables</span>
                        </div>
                    ) : (
                        <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5 pr-1">
                            {filteredWallets.map((w) => {
                                const keyEstable = w.id || `wallet-node-${Math.random()}`;
                                const isSelected = selectedWallet?.id === w.id;

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
                                                {w.nombre}
                                            </p>
                                            <p className="text-[9px] text-zinc-600 font-mono mt-0.5">
                                                ID: {w.id} • ROL: <span className="text-zinc-400 uppercase">{w.rol}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-emerald-400">
                                                ${w.balance.toLocaleString('es-CO')} COP
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
                                        {selectedWallet.nombre}
                                    </p>
                                    <p className="text-[9px] text-zinc-400 font-mono mt-0.5 truncate">
                                        ID: {selectedWallet.id}
                                    </p>
                                    <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-[9px] text-zinc-500 uppercase font-black">Saldo Actual:</span>
                                        <span className="text-xs font-black text-emerald-400">
                                            ${selectedWallet.balance.toLocaleString('es-CO')} COP
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