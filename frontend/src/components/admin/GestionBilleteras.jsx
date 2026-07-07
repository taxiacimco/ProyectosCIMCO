// Versión Arquitectura: V1.6 - Desacoplamiento del Modo Simulado y Sincronización Real con FIRESTORE_PATHS.wallets
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\GestionBilleteras.jsx
 * Misión: Monitoreo transaccional de wallets e inyección de recargas autorizadas en tiempo real.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Identidad Amarilla).
 * Ajuste V1.6: Erradicación definitiva de datos cableados ('MOCK_WALLETS'). El control operativo 'isSimulatedMode'
 * ahora se desacopla del entorno local consumiendo de forma estricta las variables de entorno de Vite (import.meta.env.VITE_SIMULATED_MODE),
 * garantizando que el canal de escritura real apunte a FIRESTORE_PATHS.wallets en simetría atómica con la billetera del pasajero.
 */

import React, { useState, useEffect } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, query, increment, serverTimestamp } from 'firebase/firestore';
import { Wallet, ArrowUpRight, ShieldAlert, Search, DollarSign, ServerOff, Loader, CheckCircle2 } from 'lucide-react';

const GestionBilleteras = () => {
    const [wallets, setWallets] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [errorFirestore, setErrorFirestore] = useState(null);
    
    // Configuración transaccional en base a variables de entorno de producción para prevenir fugas locales
    const isSimulatedMode = import.meta.env.VITE_SIMULATED_MODE === 'true';

    // Estado del operador seleccionado y formulario de abono
    const [walletSeleccionada, setWalletSeleccionada] = useState(null);
    const [montoAbono, setMontoAbono] = useState('');
    const [procesando, setProcesando] = useState(false);
    const [feedbackExito, setFeedbackExito] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        // Resolución dinámica y centralizada de la ruta de almacenamiento de finanzas
        const pathColeccion = FIRESTORE_PATHS?.wallets || 'wallets';
        const q = query(collection(db, pathColeccion));

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                if (!isMounted) return;
                
                const lista = snapshot.docs.map(docRef => {
                    const data = docRef.data();
                    return {
                        id: docRef.id,
                        // Blindaje Anti-Undefined sobre propiedades financieras críticas
                        conductor: data?.conductor || data?.nombre || `Operador ID: ${docRef.id.slice(0, 8)}`,
                        saldo: typeof data?.saldo === 'number' ? data.saldo : 0,
                        email: data?.email || 'N/A'
                    };
                });

                setWallets(lista);
                setLoading(false);
                setErrorFirestore(null);
            },
            (err) => {
                if (!isMounted) return;
                console.error("❌ [CIMCO-FIRESTORE-WALLETS-FATAL]:", err);
                setErrorFirestore("Fallo en la comunicación con el canal financiero central.");
                setLoading(false);
            }
        );

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    const handleSeleccionarWallet = (w) => {
        setWalletSeleccionada(w);
        setMontoAbono('');
        setFeedbackExito(null);
    };

    const handleAplicarAbono = async (e) => {
        e.preventDefault();
        if (!walletSeleccionada?.id || !montoAbono || isNaN(montoAbono) || Number(montoAbono) <= 0) {
            return;
        }

        setProcesando(true);
        setFeedbackExito(null);

        try {
            const valorInyeccion = Number(montoAbono);
            const pathColeccion = FIRESTORE_PATHS?.wallets || 'wallets';
            const docWalletRef = doc(db, pathColeccion, walletSeleccionada.id);

            if (isSimulatedMode) {
                // Simulación controlada sin impacto real en base de datos de producción
                console.warn(`⚠️ [CIMCO-FINANCE-SIMULATION] Abono simulado de $${valorInyeccion} COP al operador ${walletSeleccionada.id}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                // Mutación atómica en producción - Incremento de fondos real
                await updateDoc(docWalletRef, {
                    saldo: increment(valorInyeccion),
                    updatedAt: serverTimestamp()
                });

                // Registro paralelo en la bitácora central de transacciones para auditoría
                const pathTransacciones = FIRESTORE_PATHS?.transacciones || 'transacciones';
                await addDoc(collection(db, pathTransacciones), {
                    usuarioId: walletSeleccionada.id,
                    conductor: walletSeleccionada.conductor,
                    monto: valorInyeccion,
                    tipo: 'RECARGA',
                    referencia: `ADMIN_INJECTION_${Date.now()}`,
                    fechaCreacion: serverTimestamp()
                });
            }

            setFeedbackExito(`Inyección de $${valorInyeccion.toLocaleString()} COP realizada correctamente.`);
            setMontoAbono('');
        } catch (err) {
            console.error("❌ [CIMCO-FINANCE-MUTATION-ERROR] Error crítico durante abono de saldo:", err);
        } finally {
            setProcesando(false);
        }
    };

    // Motor de filtrado perimetral por cadena de identidad
    const walletsFiltradas = wallets.filter(w => {
        const queryNormalize = busqueda.toLowerCase().trim();
        return (w?.conductor || '').toLowerCase().includes(queryNormalize) || 
               (w?.id || '').toLowerCase().includes(queryNormalize) ||
               (w?.email || '').toLowerCase().includes(queryNormalize);
    });

    return (
        <div className="w-full min-h-screen bg-[#09090b] p-4 md:p-8 text-zinc-100 font-mono antialiased relative">
            {/* Indicador de Seguridad del Estado del Canal */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                    isSimulatedMode 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                    Entorno: {isSimulatedMode ? 'SIMULADO (SANDBOX)' : 'PRODUCCIÓN REAL'}
                </span>
            </div>

            <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
                
                {/* ENCABEZADO TÁCTICO */}
                <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                            <Wallet size={20} className="text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-200">Gobernanza Financiera</h2>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Control de saldos y compuertas transaccionales de flota</p>
                        </div>
                    </div>
                    
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input 
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar operador, ID o correo..."
                            className="w-full bg-zinc-950/80 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/30 transition-colors uppercase tracking-wider"
                        />
                    </div>
                </div>

                {/* DISTRIBUCIÓN BILATERAL */}
                <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
                    
                    {/* PANEL DE MONITOREO DE RED (IZQUIERDA) */}
                    <div className="w-full lg:flex-1 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                        {loading ? (
                            <div className="p-16 flex flex-col items-center justify-center gap-3">
                                <Loader className="animate-spin text-yellow-500" size={24} />
                                <span className="tracking-widest uppercase text-[9px] text-zinc-500">Escaneando Módulos de Finanzas...</span>
                            </div>
                        ) : errorFirestore ? (
                            <div className="p-12 text-center flex flex-col items-center gap-3">
                                <ServerOff className="text-red-500" size={28} />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">Error Central</h3>
                                <p className="text-[10px] text-zinc-500">{errorFirestore}</p>
                            </div>
                        ) : walletsFiltradas.length === 0 ? (
                            <div className="p-16 text-center text-zinc-600 text-[10px] uppercase font-bold tracking-widest">
                                Sin registros coincidentes en este sector
                            </div>
                        ) : (
                            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.01] text-[9px] uppercase tracking-widest text-zinc-500 font-black">
                                            <th className="p-4 pl-6">Operador / Identidad</th>
                                            <th className="p-4">Billetera Activa</th>
                                            <th className="p-4 text-right pr-6">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                                        {walletsFiltradas.map((w) => (
                                            <tr 
                                                key={w.id}
                                                className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${walletSeleccionada?.id === w.id ? 'bg-white/[0.02]' : ''}`}
                                                onClick={() => handleSeleccionarWallet(w)}
                                            >
                                                <td className="p-4 pl-6">
                                                    <div className="font-bold text-zinc-200 uppercase truncate max-w-[180px]">{w.conductor}</div>
                                                    <div className="text-[9px] text-zinc-600 mt-0.5 truncate max-w-[180px]">{w.email}</div>
                                                </td>
                                                <td className="p-4 font-mono font-black text-zinc-100">
                                                    ${w.saldo.toLocaleString()} <span className="text-[9px] text-zinc-600 font-bold">COP</span>
                                                </td>
                                                <td className="p-4 text-right pr-6">
                                                    <div className={`w-2 h-2 rounded-full inline-block ${walletSeleccionada?.id === w.id ? 'bg-yellow-500 animate-pulse' : 'bg-zinc-700'}`} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* INTERFAZ TRANSACCIONAL DE INYECCIÓN (DERECHA) */}
                    <div className="w-full lg:w-[400px] backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
                        
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
                            <ArrowUpRight size={14} className="text-yellow-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Inyector de Saldo Autorizado</h3>
                        </div>

                        {walletSeleccionada ? (
                            <form onSubmit={handleAplicarAbono} className="flex flex-col gap-4">
                                <div className="bg-zinc-950/60 border border-white/5 p-3 rounded-xl">
                                    <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-black block mb-1">Destinatario Validado</span>
                                    <div className="text-xs font-black text-white uppercase truncate">{walletSeleccionada.conductor}</div>
                                    <div className="text-[9px] font-mono text-zinc-600 mt-0.5">UID: {walletSeleccionada.id}</div>
                                </div>

                                <div>
                                    <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-black flex items-center gap-1 mb-1.5">
                                        <DollarSign size={10} /> Monto Neto a Abonar (COP)
                                    </label>
                                    <input 
                                        type="number"
                                        value={montoAbono}
                                        onChange={(e) => setMontoAbono(e.target.value)}
                                        placeholder="Ej: 50000"
                                        disabled={procesando}
                                        className="w-full bg-zinc-950/80 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono font-bold text-white placeholder-zinc-700 focus:outline-none focus:border-yellow-500/30 transition-colors"
                                        required
                                    />
                                </div>

                                {feedbackExito && (
                                    <div className="backdrop-blur-md bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-start gap-2 text-emerald-400 text-[10px] font-bold font-mono">
                                        <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
                                        <span>{feedbackExito}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={procesando || !montoAbono}
                                    className={`w-full font-black text-[10px] tracking-widest uppercase py-3.5 rounded-xl transition-all border active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 ${
                                        isSimulatedMode 
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20' 
                                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                    }`}
                                >
                                    {procesando ? (
                                        <>
                                            <Loader size={12} className="animate-spin" />
                                            <span>Procesando...</span>
                                        </>
                                    ) : (
                                        <span>Aplicar Abono</span>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="p-8 border border-dashed border-white/5 text-center text-zinc-600 text-[9px] rounded-2xl font-bold uppercase tracking-wider bg-white/[0.005] flex flex-col items-center gap-2">
                                <ShieldAlert size={18} className="text-zinc-700" />
                                <span>Seleccione un nodo operativo de la grilla para abrir la compuerta transaccional.</span>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default GestionBilleteras;