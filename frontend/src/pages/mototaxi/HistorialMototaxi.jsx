// Versión Arquitectura: V11.2 - Patrón Unificado: FIRESTORE_PATHS.rides y Saneamiento Monetario
// Refactorización Estética: Cyber-Neo-Brutalismo Puro (Alta Visibilidad y Estructura Rígida)
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
        <div className="min-h-screen bg-[#0e0e11] font-mono text-zinc-100 p-6 flex flex-col gap-6 selection:bg-cyan-400 selection:text-black">
            
            {/* 🔝 ENCABEZADO: Bloque Masivo Cyber-Brutalist */}
            <header className="flex items-center gap-4 bg-zinc-900 border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] rounded-none">
                <div className="p-2.5 bg-cyan-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] shrink-0">
                    <FileText size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-white leading-none">Historial de Rutas</h1>
                    <p className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold mt-1">Bitácora de servicios completados en red mototaxi</p>
                </div>
            </header>

            {/* 📊 CONTENEDOR DE REGISTROS CRÍTICOS */}
            <div className="space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center gap-3 bg-zinc-900 border-4 border-black p-6 font-black text-xs uppercase tracking-widest text-zinc-400 shadow-[4px_4px_0px_0px_#000]">
                        <Loader size={16} className="animate-spin text-cyan-400" /> Sincronizando registros perimetrales...
                    </div>
                ) : historial.length === 0 ? (
                    <div className="bg-zinc-900 p-8 border-4 border-black text-center shadow-[4px_4px_0px_0px_#000] rounded-none">
                        <p className="text-zinc-500 uppercase text-xs tracking-widest font-black">Sin registros operativos recientes.</p>
                    </div>
                ) : (
                    historial.map(viaje => (
                        <div 
                            key={viaje.id} 
                            className="bg-zinc-900 p-5 border-4 border-black flex flex-col gap-4 shadow-[4px_4px_0px_0px_#000] rounded-none hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-150"
                        >
                            {/* Bloque superior financiero del servicio */}
                            <div className="flex justify-between items-center border-b-4 border-black pb-4">
                                <div>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Tarifa Recaudada</p>
                                    <p className="text-lg font-black text-emerald-400 tracking-tight">
                                        ${(parseFloat(viaje.tarifa || viaje.oferta) || 0).toLocaleString()} COP
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 text-black bg-emerald-400 border-2 border-black px-3 py-1 font-black uppercase tracking-wider text-[10px] shadow-[2px_2px_0px_0px_#000] select-none">
                                    <CheckCircle size={12} strokeWidth={3} />
                                    <span>Completado</span>
                                </div>
                            </div>
                            
                            {/* Panel Georreferenciado Rígido */}
                            <div className="space-y-3 bg-black/40 p-3 border-2 border-black">
                                <div className="flex items-start gap-2.5 text-xs text-zinc-200">
                                    <MapPin size={14} className="text-zinc-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                                    <span className="text-[11px] leading-tight">
                                        <strong className="text-zinc-500 uppercase text-[9px] block font-black tracking-wider mb-0.5">Origen / Base:</strong> 
                                        {formatDireccion(viaje.origen)}
                                    </span>
                                </div>
                                <div className="border-t border-dashed border-zinc-800 my-1"></div>
                                <div className="flex items-start gap-2.5 text-xs text-zinc-200">
                                    <MapPin size={14} className="text-cyan-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                                    <span className="text-[11px] leading-tight">
                                        <strong className="text-cyan-400 uppercase text-[9px] block font-black tracking-wider mb-0.5">Destino Final:</strong> 
                                        {formatDireccion(viaje.destino)}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Metadata Estructural del Documento */}
                            <div className="flex justify-between items-center text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
                                <span>ID: TAXIA-...{String(viaje.id).slice(-6).toUpperCase()}</span>
                                {viaje.fechaCreacion && (
                                    <span>REG: {new Date(viaje.fechaCreacion.seconds * 1000).toLocaleDateString()}</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistorialMototaxi;