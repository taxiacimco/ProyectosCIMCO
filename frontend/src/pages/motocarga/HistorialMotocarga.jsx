// Versión Arquitectura: V11.2 - Patrón Unificado: FIRESTORE_PATHS.rides y Saneamiento Monetario
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Package, CheckCircle, MapPin, Loader } from 'lucide-react';

const HistorialMotocarga = () => {
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
                <Package className="text-amber-500" size={26} />
                <div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-white font-mono">Registro Fletes</h1>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Historial de logística pesada y distribución urbana</p>
                </div>
            </header>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase animate-pulse">
                        <Loader size={14} className="animate-spin text-amber-500" /> Sincronizando registros fletes...
                    </div>
                ) : historial.length === 0 ? (
                    <div className="backdrop-blur-md bg-[#121214]/80 p-8 rounded-3xl border border-white/5 text-center shadow-xl">
                        <p className="text-zinc-500 uppercase text-xs tracking-widest">Sin registros operativos recientes.</p>
                    </div>
                ) : (
                    historial.map(flete => {
                        const tarifaFinal = flete.tarifa || flete.pago?.tarifaOfertada || flete.oferta || 0;
                        return (
                            <div key={flete.id} className="backdrop-blur-md bg-[#121214]/80 p-5 rounded-2xl border border-white/5 flex flex-col gap-3 hover:border-white/10 transition-all shadow-lg">
                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                    <div>
                                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Flete Neto</p>
                                        <p className="text-amber-500 font-black text-md">${(parseFloat(tarifaFinal)).toLocaleString()} COP</p>
                                    </div>
                                    <div className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                                        <CheckCircle size={12} /> Completado
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                                        <MapPin size={12} className="text-zinc-500 shrink-0" />
                                        <span className="truncate text-[11px]"><strong className="text-zinc-600 uppercase text-[9px] mr-1">Recogida:</strong> {formatDireccion(flete.origen || flete.ubicacionRecogida)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                                        <MapPin size={12} className="text-amber-500 shrink-0" />
                                        <span className="truncate text-[11px]"><strong className="text-zinc-600 uppercase text-[9px] mr-1">Destino:</strong> {formatDireccion(flete.destino || flete.ubicacionEntrega)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default HistorialMotocarga;