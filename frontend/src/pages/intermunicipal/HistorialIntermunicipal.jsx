// Versión Arquitectura: V11.2 - PROD READY: Historial Intermunicipal Homologado con Patrón Unificado de Rutas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\intermunicipal\HistorialIntermunicipal.jsx
 * Misión: Renderizar la bitácora de viajes intermunicipales del conductor.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { FileText, MapPin, Bus, Loader } from 'lucide-react';

const HistorialIntermunicipal = () => {
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
                    where('conductorId', '==', user.uid),
                    orderBy('fechaCreacion', 'desc')
                );
                const snapshot = await getDocs(q);
                setHistorial(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("❌ [CIMCO-LOG-ERROR] Error leyendo historial operativo Intermunicipal:", error);
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
                <FileText className="text-yellow-500" size={24} />
                <div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-white">Rutas Despachadas</h1>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Manifiestos de salida y transporte de media distancia</p>
                </div>
            </header>

            <div className="space-y-4">
                {loading ? (
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
                                    <span className="truncate text-[11px]"><strong className="text-zinc-600 uppercase text-[9px] mr-1">Destino Autorizado:</strong> {formatDireccion(ruta.destino)}</span>
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