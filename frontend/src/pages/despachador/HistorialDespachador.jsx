// Versión Arquitectura: V12.0 - Desacoplamiento Clean Code y Sincronización en Tiempo Real Robustecida
/**
 * Ubicación: frontend\src\pages\despachador\HistorialDespachador.jsx
 * Misión: Renderizar la bitácora de arqueos y manifiestos de salida del despachador en tiempo real.
 * Ajuste V12.0: Eliminación de declaración local de formatDireccion e importación de la utilidad
 *               centralizada unificada desde utils\formatters.js para desacoplamiento arquitectónico.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { formatDireccion } from '@/utils/formatters'; // 🚀 Importación de la utilidad unificada centralizada
import { FileText, Users, MapPin, Loader, Clock, AlertTriangle } from 'lucide-react';
import { formatFechaColombia } from '@/utils/dateFormatter';

const HistorialDespachador = () => {
    const { user } = useAuth();
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorIndex, setErrorIndex] = useState(null);

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorIndex(null);
        const pathColeccion = FIRESTORE_PATHS.viajesIntermunicipales || 'viajes_intermunicipales';

        try {
            // Configuración de consulta ordenada cronológicamente en reversa
            const q = query(
                collection(db, pathColeccion),
                where('despachadorId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );

            // ⚡ Paradigma de Sincronización en Tiempo Real: Enlace perimetral persistente
            const unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    const listaDespachos = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setHistorial(listaDespachos);
                    setLoading(false);
                }, 
                (error) => {
                    console.error("⚠️ [CIMCO-ARCH-ERR] Fallo de consulta reactiva de historial:", error);
                    // Captura quirúrgica del enlace de autogeneración de índices compuestos distribuidos
                    if (error.message && error.message.includes("https://console.firebase.google.com")) {
                        setErrorIndex(error.message);
                    } else {
                        setErrorIndex(`Error en bus de sincronización: ${error.message}`);
                    }
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error("⚠️ [CIMCO-ARCH-CRASH] Fallo crítico al inicializar listener NoSQL:", err);
            setErrorIndex(err.message);
            setLoading(false);
        }
    }, [user?.uid]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center font-mono">
                <Loader className="text-blue-500 animate-spin mb-3" size={24} />
                <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-mono animate-pulse">📡 Streaming de Arqueos Activo...</p>
            </div>
        );
    }

    if (errorIndex) {
        return (
            <div className="min-h-screen bg-[#09090b] p-6 font-mono text-zinc-100 flex flex-col items-center justify-center">
                <div className="backdrop-blur-md bg-[#121214]/60 border border-red-500/20 rounded-2xl p-6 text-center max-w-xl shadow-2xl">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <AlertTriangle className="text-red-400" size={24} />
                    </div>
                    <h2 className="text-xs font-black text-white mb-2 tracking-wider uppercase">ÍNDICE COMPUESTO EXIGIDO</h2>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-tight mb-4 leading-relaxed text-left">
                        La consulta en tiempo real requiere una matriz de indexación compuesta en la consola perimetral de Firebase.
                    </p>
                    <div className="font-mono text-[9px] text-red-400 bg-red-950/20 p-4 rounded-xl border border-red-500/10 break-all mb-4 text-left select-all">
                        {errorIndex}
                    </div>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                        Copie la URL superior para aprovisionar el índice en Firestore automáticamente.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-6 flex flex-col gap-6">
            <header className="flex items-center justify-between border-b border-white/5 pb-4 mb-2">
                <div className="flex items-center gap-3">
                    <FileText className="text-blue-500" size={22} />
                    <h1 className="text-sm font-black uppercase tracking-widest text-white">Historial de Despachos</h1>
                </div>
                <div className="backdrop-blur-md bg-white/[0.02] border border-white/5 px-3 py-1 rounded-xl text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Core: {historial.length} Despachos
                </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                {historial.length === 0 ? (
                    <div className="backdrop-blur-md bg-[#121214]/60 border border-white/5 rounded-2xl p-12 text-center border-dashed">
                        <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">No se registran despachos históricos en la central intermunicipal.</p>
                    </div>
                ) : (
                    historial.map((despacho) => (
                        <div key={despacho.id} className="backdrop-blur-md bg-[#121214]/60 border border-white/5 rounded-2xl p-5 shadow-lg hover:border-white/10 transition-all flex flex-col gap-3">
                            <div className="flex justify-between items-start border-b border-white/5 pb-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                        <span className="text-xs font-black text-white tracking-wider">MANIFIESTO #{despacho.id?.substring(0, 8).toUpperCase()}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                        <Clock size={10} className="opacity-60" />
                                        <span>{formatFechaColombia(despacho.createdAt)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold block">Comisión</span>
                                    <p className="text-xs font-black text-emerald-400">${(parseFloat(despacho.comisionDespacho) || 0).toLocaleString()} COP</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                <div className="flex items-center gap-2.5 text-xs text-zinc-300 bg-white/[0.01] border border-white/[0.02] p-3 rounded-xl">
                                    <MapPin size={14} className="text-blue-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Destino Operativo</p>
                                        {/* 🚀 Inyección del formateador global importado */}
                                        <p className="truncate text-[11px] font-semibold mt-0.5 text-zinc-200">{formatDireccion(despacho.destino)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs text-zinc-300 bg-white/[0.01] border border-white/[0.02] p-3 rounded-xl">
                                    <Users size={14} className="text-zinc-400 shrink-0" />
                                    <div className="min-w-0 w-full">
                                        <p className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Unidad Asignada</p>
                                        <p className="truncate text-[10px] uppercase tracking-wide font-mono mt-0.5 text-zinc-400">
                                            Vehículo: <span className="text-white font-bold">#{despacho.vehiculo || 'N/A'}</span> — ID Conductor: <span className="text-cyan-400">{despacho.conductorId?.substring(0, 6) || 'Pendiente'}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistorialDespachador;