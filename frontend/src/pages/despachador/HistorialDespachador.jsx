// Versión Arquitectura: V11.2 - PROD READY: Historial de Control de Despachos Homologado
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\despachador\HistorialDespachador.jsx
 * Misión: Renderizar la bitácora de arqueos y manifiestos de salida del despachador en terminal.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { FileText, Users, MapPin, Loader } from 'lucide-react';

const HistorialDespachador = () => {
    const { user } = useAuth();
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistorial = async () => {
            if (!user?.uid) {
                setLoading(false);
                return;
            }
            try {
                // 🛡️ Corrección de Ruta: Consumo seguro del nodo intermunicipal
                const pathColeccion = FIRESTORE_PATHS.viajesIntermunicipales || 'viajes_intermunicipales';
                const q = query(
                    collection(db, pathColeccion),
                    where('despachadorId', '==', user.uid),
                    orderBy('fechaCreacion', 'desc')
                );
                const snapshot = await getDocs(q);
                setHistorial(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("❌ [CIMCO-LOG-ERROR] Error leyendo historial operativo despachador:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistorial();
    }, [user]);

    // 🛡️ Blindaje Profesional: Normalización de visualización operativa
    const formatDireccion = (nodo) => {
        if (!nodo) return 'N/A';
        if (typeof nodo === 'string') return nodo;
        return nodo.direccion || nodo.address || nodo.nombre || (nodo.lat && nodo.lng ? `${nodo.lat.toFixed(4)}, ${nodo.lng.toFixed(4)}` : 'S/D');
    };

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-6 flex flex-col gap-6">
            <header className="flex items-center gap-3 border-b border-white/5 pb-4">
                <FileText className="text-blue-500" size={24} />
                <div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-white">Panel de Control Arqueos</h1>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Historial global de salidas autorizadas desde terminal</p>
                </div>
            </header>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase animate-pulse">
                        <Loader size={14} className="animate-spin text-blue-500" /> Cargando manifiestos terminal...
                    </div>
                ) : historial.length === 0 ? (
                    <div className="backdrop-blur-md bg-[#121214]/40 p-8 text-center text-zinc-500 border border-dashed border-white/5 rounded-2xl">
                        <p className="text-xs uppercase font-bold tracking-widest">No registras asignaciones en esta terminal.</p>
                    </div>
                ) : (
                    historial.map((despacho) => (
                        <div key={despacho.id} className="backdrop-blur-md bg-[#121214]/80 border border-white/5 p-5 flex flex-col gap-3 rounded-2xl shadow-xl hover:border-white/10 transition-all duration-300">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <div>
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Código Interno</p>
                                    <p className="font-black text-white text-xs tracking-wider">#{despacho.id.substring(0, 8).toUpperCase()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Comisión Recaudada</p>
                                    <p className="text-xs font-black text-emerald-400">${(parseFloat(despacho.comisionDespacho) || 0).toLocaleString()} COP</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-zinc-300">
                                    <MapPin size={12} className="text-blue-500 shrink-0" />
                                    <span className="truncate text-[11px]"><strong>Destino:</strong> {formatDireccion(despacho.destino)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 bg-[#09090b]/50 p-2.5 rounded-xl border border-white/5">
                                    <Users size={12} className="text-zinc-500 shrink-0" />
                                    <span className="truncate text-[10px] uppercase tracking-wide">
                                        <strong>Vehículo:</strong> #{despacho.vehiculo || 'N/A'} — ID Conductor: {despacho.conductorId?.substring(0, 6) || 'Pendiente'}
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

export default HistorialDespachador;