// Versión Arquitectura: V12.0 - Resiliencia de UI en Fallas de Red y Desacoplamiento Clean Code
/**
 * Ubicación: frontend\src\pages\intermunicipal\HistorialIntermunicipal.jsx
 * Misión: Renderizar la bitácora de viajes intermunicipales del conductor.
 * Ajuste V12.0: Importación de formatDireccion centralizada (DRY) e inyección de estado de error
 *               para manejo controlado de excepciones de red en ruta.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { formatDireccion } from '@/utils/formatters'; // 🚀 Importación de la utilidad unificada
import { FileText, MapPin, Bus, Loader, AlertTriangle, RefreshCw } from 'lucide-react';

const HistorialIntermunicipal = () => {
    const { user } = useAuth();
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // 🛡️ Estado de resiliencia ante caídas de red

    const fetchHistorial = async () => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null); // Resetear estado de error al reintentar
        
        try {
            const pathColeccion = FIRESTORE_PATHS.viajesIntermunicipales || 'viajes_intermunicipales';
            const q = query(
                collection(db, pathColeccion),
                where('conductorId', '==', user.uid),
                orderBy('fechaCreacion', 'desc')
            );
            const snapshot = await getDocs(q);
            setHistorial(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error("❌ [CIMCO-LOG-ERROR] Error leyendo historial operativo Intermunicipal:", err);
            setError("No se pudo sincronizar el historial. Verifica tu señal o conexión de datos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistorial();
    }, [user]);

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-6 flex flex-col gap-6">
            <header className="flex items-center gap-3 border-b border-white/5 pb-4">
                <FileText className="text-yellow-500" size={24} />
                <div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-white">Rutas Despachadas</h1>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Manifiestos de salida y transporte de media distancia</p>
                </div>
            </header>

            <div className="space-y-4">
                {/* 🚨 CAPA DE CONTROL DE INTERRUPCIÓN DE RED */}
                {error ? (
                    <div className="backdrop-blur-md bg-red-500/5 p-6 rounded-2xl border border-red-500/20 text-center flex flex-col items-center gap-3 shadow-xl">
                        <AlertTriangle className="text-red-500" size={24} />
                        <p className="text-zinc-300 text-xs uppercase tracking-wide max-w-xs">{error}</p>
                        <button 
                            onClick={fetchHistorial}
                            className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-yellow-500/40 text-[10px] text-zinc-400 hover:text-white uppercase font-bold py-2 px-4 rounded-xl transition-all active:scale-95"
                        >
                            <RefreshCw size={12} /> Reintentar Conexión
                        </button>
                    </div>
                ) : loading ? (
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase animate-pulse">
                        <Loader size={14} className="animate-spin text-yellow-500" /> Sincronizando rutas...
                    </div>
                ) : historial.length === 0 ? (
                    <div className="backdrop-blur-md bg-[#121214]/80 p-8 rounded-3xl border border-white/5 text-center shadow-xl">
                        <p className="text-zinc-500 uppercase text-xs tracking-widest">Sin despachos autorizados en bitácora.</p>
                    </div>
                ) : (
                    historial.map(ruta => (
                        <div key={ruta.id} className="backdrop-blur-md bg-[#121214]/80 p-5 rounded-2xl border border-white/5 flex flex-col gap-3 hover:border-white/10 transition-all shadow-lg">
                            <div className="flex justify-between items-start border-b border-white/5 pb-3">
                                <div>
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Tarifa Generada</p>
                                    <p className="text-sm font-black text-emerald-400">${(parseFloat(ruta.tarifa) || 0).toLocaleString()} COP</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1.5 rounded-lg">
                                    <Bus size={12} />
                                    <span className="text-[10px] uppercase font-black tracking-widest">{ruta.estado || 'FINALIZADO'}</span>
                                </div>
                            </div>
                            <div className="space-y-2 pt-1">
                                <div className="flex items-center gap-2 text-xs text-zinc-300">
                                    <MapPin size={14} className="text-yellow-500 shrink-0" />
                                    <span className="truncate text-[11px]">
                                        <strong className="text-zinc-600 uppercase text-[9px] mr-1">Destino Autorizado:</strong> 
                                        {formatDireccion(ruta.destino)} {/* 🚀 Inyección de la función externa */}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistorialIntermunicipal;