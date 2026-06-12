// Versión Arquitectura: V12.1 - Patrón Unificado: Consolidación de Historial y Normalización Geográfica
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\HistorialViajes.jsx
 * Misión: Renderizar el historial operativo del pasajero consumiendo la colección centralizada 'rides'.
 * Seguridad: Anti-Undefined guards para objetos de ubicación estructurados y formateo resiliente de monedas.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Calendar, MapPin, Clock, Loader, AlertTriangle, CheckCircle } from 'lucide-react';

const HistorialViajes = () => {
    const { user } = useAuth();
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 🛡️ Blindaje Profesional: Normalización de visualización operativa
    const formatDireccion = (data) => {
        if (!data) return "Ubicación no especificada";
        if (typeof data === 'string') return data;
        return data.direccion || data.address || data.nombre || (data.lat && data.lng ? `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}` : "S/D");
    };

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const pathColeccion = FIRESTORE_PATHS.rides || 'rides';
        
        try {
            // Se preserva la condición 'pasajeroId' exclusiva para este módulo
            const q = query(
                collection(db, pathColeccion),
                where('pasajeroId', '==', user.uid),
                where('estado', '==', 'COMPLETADO'),
                orderBy('fechaCreacion', 'desc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const listaViajes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setViajes(listaViajes);
                setLoading(false);
            }, (err) => {
                console.error("❌ [CIMCO-LOG-ERROR] Fallo en la sincronización de historial:", err);
                setError("Error al sincronizar el historial operativo.");
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err) {
            console.error("❌ [CIMCO-LOG-ERROR] Fallo en la inicialización de consulta:", err);
            setError(err.message);
            setLoading(false);
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-4 md:p-8 pb-24">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex flex-col gap-1.5 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2 text-yellow-500">
                        <Calendar size={20} />
                        <h1 className="text-xl font-black uppercase tracking-widest">Mis Trayectos</h1>
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Auditoría central de servicios finalizados exitosamente</p>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
                        <Loader className="animate-spin text-yellow-500" size={24} />
                        <span className="text-xs uppercase tracking-widest">Sincronizando bitácora cuántica...</span>
                    </div>
                ) : error ? (
                    <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-400 text-xs uppercase">
                        <AlertTriangle size={18} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                ) : viajes.length === 0 ? (
                    <div className="backdrop-blur-md bg-[#121214]/40 border border-dashed border-white/5 p-12 rounded-2xl text-center text-zinc-500">
                        <p className="text-xs uppercase font-bold tracking-widest">No registras trayectos completados en el ecosistema.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {viajes.map((viaje) => (
                            <div key={viaje.id} className="backdrop-blur-md bg-[#121214]/80 border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/10 transition-all duration-300 shadow-xl">
                                <div className="space-y-3 flex-1 w-full">
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                        <Clock size={12} />
                                        <span>ID: {viaje.id.substring(0, 8)}...</span>
                                        <span>•</span>
                                        <span>{viaje.fechaCreacion?.toDate ? viaje.fechaCreacion.toDate().toLocaleDateString() : 'Fecha Reciente'}</span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2 text-xs">
                                            <MapPin size={14} className="text-zinc-500 shrink-0 mt-0.5" />
                                            <span className="text-zinc-300 truncate">
                                                <span className="text-zinc-600 uppercase font-bold text-[10px] tracking-wider mr-1">Origen:</span> 
                                                {formatDireccion(viaje.origen)}
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-2 text-xs">
                                            <MapPin size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                                            <span className="text-zinc-300 truncate">
                                                <span className="text-zinc-600 uppercase font-bold text-[10px] tracking-wider mr-1">Destino:</span> 
                                                {formatDireccion(viaje.destino)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-full md:w-auto bg-zinc-950/60 border border-white/5 p-4 rounded-xl flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-1 shrink-0">
                                    <p className="text-lg font-black text-emerald-400">
                                        ${(parseFloat(viaje.tarifa || viaje.oferta) || 0).toLocaleString()} COP
                                    </p>
                                    <div className="flex flex-col items-end gap-1">
                                        {viaje.distancia && <span className="text-[9px] font-mono text-zinc-500">{viaje.distancia} Km</span>}
                                        <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                                            <CheckCircle size={10} /> Completado
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistorialViajes;