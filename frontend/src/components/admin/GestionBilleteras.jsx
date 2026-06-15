// Versión Arquitectura: V1.1 - Modo Contingencia y Simulación de Bóveda Contable
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\GestionBilleteras.jsx
 * Misión: Monitoreo transaccional de wallets e inyección de recargas autorizadas (Con Modo Simulación).
 * Estilo: Ciber-Neo-Brutalista sobre Tailwind CSS adaptado al tema oscuro (#121214).
 * Seguridad: Restricción operativa delegada nativamente a Firebase Emulators / Firestore, con Fallback local.
 */

import React, { useState, useEffect } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, query } from 'firebase/firestore';
import { Wallet, ArrowUpRight, ShieldAlert, Search, DollarSign, ServerOff } from 'lucide-react';

// 📍 MOCK DATA: Matriz táctica para simulación offline en La Jagua de Ibirico
const MOCK_WALLETS = [
    { id: 'MOTO_TACTICA_01', conductor: 'Alfonso Mendoza', saldo: 15000, estado: 'ACTIVO' },
    { id: 'MOTO_TACTICA_02', conductor: 'Jairo Gutiérrez', saldo: 500, estado: 'BLOQUEADO_SALDO' },
    { id: 'MOTO_TACTICA_03', conductor: 'Luis Carlos Vega', saldo: 25000, estado: 'ACTIVO' },
    { id: 'OP_PRUEBA_99', conductor: 'Carlos Fuentes (Test)', saldo: 50000, estado: 'ADMIN_TEST' }
];

const GestionBilleteras = () => {
    const [billeteras, setBilleteras] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [montoRecarga, setMontoRecarga] = useState('');
    const [billeteraSeleccionada, setBilleteraSeleccionada] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const [feedback, setFeedback] = useState({ tipo: '', mensaje: '' });
    const [isSimulatedMode, setIsSimulatedMode] = useState(false);

    useEffect(() => {
        const pathWallets = FIRESTORE_PATHS?.wallets || 'wallets';
        const q = query(collection(db, pathWallets));

        // 🛡️ Suscripción reactiva con intercepción de errores de seguridad
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const lista = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setBilleteras(lista);
                setFeedback({ tipo: '', mensaje: '' });
                setIsSimulatedMode(false);
            },
            (error) => {
                console.warn("⚠️ [CIMCO-FINANCIAL-WARN] Bloqueo de Firestore detectado. Activando Modo Simulación Autónoma.", error.message);
                // Inyección del Modo Contingencia
                setBilleteras(MOCK_WALLETS);
                setIsSimulatedMode(true);
                setFeedback({
                    tipo: 'warning',
                    mensaje: 'Modo Simulación Activo: Conexión denegada por Firestore. Operando en memoria volátil.'
                });
            }
        );

        return () => unsubscribe();
    }, []);

    const ejecutarRecarga = async (e) => {
        e.preventDefault();
        if (!billeteraSeleccionada || !montoRecarga || parseFloat(montoRecarga) <= 0) return;

        setProcesando(true);
        setFeedback({ tipo: '', mensaje: '' });

        const montoNumeric = parseFloat(montoRecarga);
        const nuevoSaldo = (billeteraSeleccionada.saldo || 0) + montoNumeric;

        // 🚀 BYPASS DE SIMULACIÓN: Si estamos offline, actualizamos solo el estado local
        if (isSimulatedMode) {
            setTimeout(() => {
                setBilleteras(prev => prev.map(b => 
                    b.id === billeteraSeleccionada.id ? { ...b, saldo: nuevoSaldo } : b
                ));
                setFeedback({ tipo: 'success', mensaje: `[SIMULACIÓN] Recarga de $${montoNumeric} aplicada localmente a ${billeteraSeleccionada.conductor}.` });
                setMontoRecarga('');
                setBilleteraSeleccionada(null);
                setProcesando(false);
            }, 800);
            return;
        }

        // Flujo normal de Producción (Si los permisos lo permiten)
        try {
            const walletRef = doc(db, FIRESTORE_PATHS.wallets, billeteraSeleccionada.id);
            await updateDoc(walletRef, {
                saldo: nuevoSaldo,
                ultima_actualizacion: new Date().toISOString()
            });

            const historialRef = collection(db, 'historial_saldo');
            await addDoc(historialRef, {
                walletId: billeteraSeleccionada.id,
                conductorName: billeteraSeleccionada.conductor || 'Operador Central',
                tipoMovimiento: 'RECARGA_ADMIN',
                monto: montoNumeric,
                saldoAnterior: billeteraSeleccionada.saldo || 0,
                saldoNuevo: nuevoSaldo,
                fecha: new Date().toISOString(),
                autorizadoPor: 'Administración Central'
            });

            setFeedback({ tipo: 'success', mensaje: `¡Recarga de $${montoNumeric} aplicada con éxito en la nube!` });
            setMontoRecarga('');
            setBilleteraSeleccionada(null);
        } catch (error) {
            console.error("🚨 [CIMCO-TRANSACTION-FATAL]:", error.message);
            setFeedback({ tipo: 'error', mensaje: 'Error estructural al asentar la transacción en la base de datos.' });
        } finally {
            setProcesando(false);
        }
    };

    const billeterasFiltradas = billeteras.filter(b => 
        b.conductor?.toLowerCase().includes(busqueda.toLowerCase()) || 
        b.id.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="space-y-6 bg-[#121214] text-white p-2 animate-in fade-in duration-500">
            {/* Header del Módulo con Indicador de Estado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${isSimulatedMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                        {isSimulatedMode ? <ServerOff size={22} /> : <Wallet size={22} />}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight uppercase font-mono flex items-center gap-2">
                            Bóveda Contable de Operadores
                            {isSimulatedMode && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse">
                                    SIMULADOR ACTIVO
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-zinc-400">Auditoría de balances de caja y dispersión de fondos para la flota.</p>
                    </div>
                </div>
            </div>

            {/* Alertas de Feedback Híbridas */}
            {feedback.mensaje && (
                <div className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 transition-all ${
                    feedback.tipo === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
                    feedback.tipo === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                    'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                    <ShieldAlert size={16} />
                    <span>{feedback.mensaje}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel Izquierdo: Lista de Balances */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar operador por nombre o ID de cuenta..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full bg-[#16161a] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono transition-colors placeholder:text-zinc-600"
                        />
                    </div>

                    <div className="border border-white/5 bg-[#16161a]/60 rounded-xl overflow-hidden backdrop-blur-md">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-[#121214] text-[10px] font-bold text-zinc-400 font-mono tracking-wider uppercase">
                                    <th className="p-3">Operador / ID</th>
                                    <th className="p-3">Estado Fondo</th>
                                    <th className="p-3 text-right">Saldo Actual</th>
                                    <th className="p-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs font-mono">
                                {billeterasFiltradas.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-6 text-center text-zinc-500 text-[11px] bg-white/[0.01]">
                                            Ninguna billetera activa encontrada en las mallas de memoria.
                                        </td>
                                    </tr>
                                ) : (
                                    billeterasFiltradas.map((b) => (
                                        <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-3">
                                                <div className="font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors">{b.conductor || 'Operador Técnico'}</div>
                                                <div className="text-[10px] text-zinc-500">ID: {b.id.substring(0, 15)}...</div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                    (b.saldo || 0) >= 2000 
                                                        ? 'border-emerald-900/50 text-emerald-400 bg-emerald-500/5' 
                                                        : 'border-amber-900/50 text-amber-400 bg-amber-500/5'
                                                }`}>
                                                    {(b.saldo || 0) >= 2000 ? 'ESTABLE' : 'SALDO BAJO'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-bold text-cyan-400">
                                                $ {(b.saldo || 0).toLocaleString('es-CO')}
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => setBilleteraSeleccionada(b)}
                                                    className="text-[10px] font-bold tracking-wider uppercase border border-cyan-500/30 px-3 py-1.5 rounded bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_10px_-2px_rgba(6,182,212,0.1)]"
                                                >
                                                    Inyectar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Panel Derecho: Formulario de Recargas */}
                <div className="space-y-4">
                    <div className="border border-white/5 bg-[#16161a] p-5 rounded-xl space-y-5 relative overflow-hidden">
                        {isSimulatedMode && (
                            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 blur-2xl rounded-full pointer-events-none" />
                        )}
                        
                        <h3 className="text-xs font-bold tracking-wider font-mono text-zinc-400 uppercase flex items-center gap-2">
                            <ArrowUpRight size={14} className={isSimulatedMode ? "text-amber-400" : "text-emerald-400"} />
                            Compuerta de Carga
                        </h3>

                        {billeteraSeleccionada ? (
                            <form onSubmit={ejecutarRecarga} className="space-y-4 text-xs font-mono animate-in slide-in-from-right-4 duration-300">
                                <div className="p-3 bg-[#121214] border border-white/5 rounded-lg space-y-1">
                                    <div className="text-[10px] text-zinc-500">BENEFICIARIO SELECCIONADO</div>
                                    <div className="font-bold text-zinc-200">{billeteraSeleccionada.conductor}</div>
                                    <div className="text-[10px] text-cyan-400">Saldo actual: ${(billeteraSeleccionada.saldo || 0).toLocaleString('es-CO')}</div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-zinc-400 block">MONTO A INYECTAR (COP)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 text-zinc-500" size={14} />
                                        <input
                                            type="number"
                                            required
                                            placeholder="Ej: 20000"
                                            value={montoRecarga}
                                            onChange={(e) => setMontoRecarga(e.target.value)}
                                            className="w-full bg-[#121214] border border-white/10 rounded-lg pl-8 pr-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setBilleteraSeleccionada(null)}
                                        className="w-1/2 border border-white/10 rounded-lg py-2.5 text-[10px] font-bold uppercase text-zinc-400 hover:bg-white/5 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={procesando}
                                        className={`w-1/2 font-bold py-2.5 rounded-lg text-[10px] uppercase tracking-wider transition-colors text-black disabled:opacity-40 ${
                                            isSimulatedMode 
                                            ? 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                                            : 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                        }`}
                                    >
                                        {procesando ? 'Procesando...' : 'Aplicar Abono'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="p-8 border border-dashed border-white/5 text-center text-zinc-500 text-[11px] rounded-lg font-mono bg-white/[0.01]">
                                Selecciona un operador de la grilla para abrir la compuerta transaccional.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GestionBilleteras;