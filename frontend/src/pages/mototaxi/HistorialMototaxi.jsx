// Versión Arquitectura: V11.2 - Patrón Unificado: FIRESTORE_PATHS.rides y Saneamiento Monetario
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { FileText, MapPin, CheckCircle, Loader } from 'lucide-react';

const HistorialMototaxi = () => {
    const { user } = useAuth();
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    // 🛡️ Blindaje Profesional: Normalización de visualización operativa
    const formatDireccion = (data) => {
        if (!data) return "Ubicación no especificada";
        if (typeof data === 'string') return data;
        return data.direccion || data.address || data.nombre || (data.lat && data.lng ? `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}` : "S/D");
    };

    useEffect(() => {
        const fetchHistorial = async () => {
            if (!user?.uid) {
                setLoading(false);
                return;
            }
            try {
                // Uso de FIRESTORE_PATHS para evitar Hardcoding de colecciones
                const q = query(
                    collection(db, FIRESTORE_PATHS.rides || 'rides'),
                    where('conductorId', '==', user.uid),
                    where('estado', '==', 'COMPLETADO'),
                    orderBy('fechaCreacion', 'desc')
                );
                const snapshot = await getDocs(q);
                setHistorial(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("❌ [CIMCO-LOG-ERROR] Fallo en la sincronización de historial:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistorial();
    }, [user]);

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-6 flex flex-col gap-6">
            <header className="flex items-center gap-3 border-b border-white/5 pb-4">
                <FileText className="text-cyan-400" size={24} />
                <div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-white">Historial de Rutas</h1>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Bitácora de servicios completados en red mototaxi</p>
                </div>
            </header>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase animate-pulse">
                        <Loader size={14} className="animate-spin text-cyan-400" /> Sincronizando registros...
                    </div>
                ) : historial.length === 0 ? (
                    <div className="backdrop-blur-md bg-[#121214]/80 p-8 rounded-3xl border border-white/5 text-center shadow-xl">
                        <p className="text-zinc-500 uppercase text-xs tracking-widest">Sin registros operativos recientes.</p>
                    </div>
                ) : (
                    historial.map(viaje => (
                        <div key={viaje.id} className="backdrop-blur-md bg-[#121214]/80 p-5 rounded-2xl border border-white/5 flex flex-col gap-3 hover:border-white/10 transition-all shadow-lg">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <div>
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Tarifa Recaudada</p>
                                    <p className="text-sm font-black text-emerald-400">${(parseFloat(viaje.tarifa || viaje.oferta) || 0).toLocaleString()} COP</p>
                                </div>
                                <div className="flex items-center gap-1 text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md">
                                    <CheckCircle size={12} />
                                    <span className="text-[10px] uppercase font-bold tracking-widest">Completado</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-zinc-300">
                                    <MapPin size={12} className="text-zinc-500 shrink-0" />
                                    <span className="truncate text-[11px]"><strong className="text-zinc-600 uppercase text-[9px] mr-1">Origen:</strong> {formatDireccion(viaje.origen)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-300">
                                    <MapPin size={12} className="text-cyan-400 shrink-0" />
                                    <span className="truncate text-[11px]"><strong className="text-zinc-600 uppercase text-[9px] mr-1">Destino:</strong> {formatDireccion(viaje.destino)}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistorialMototaxi;