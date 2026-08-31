// Versión Arquitectura: V13.1 - Filtrado Estricto REST por tipoServicio=motocarga y Resiliencia NoSQL
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\motocarga\HistorialMotocarga.jsx
 * Misión: Renderizar la bitácora de fletes completados en la red de motocarga/logística pesada consumiendo la API REST de Express/MongoDB
 *        con fallback resiliente a Firestore y ordenamiento en memoria para mitigar ausencias de índices compuestos.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Acento Ámbar/Esmeralda).
 * Ajuste V13.1: Garantía de filtrado en endpoint REST para asegurar que `tipoServicio=motocarga` prevenga la contaminación de registros.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api, { VIAJES_ENDPOINTS } from '@/config/api';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Package, CheckCircle, MapPin, Loader, AlertTriangle, RefreshCw, Truck } from 'lucide-react';

const HistorialMotocarga = () => {
    const { user } = useAuth();
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    // 🛡️ Blindaje Profesional: Normalización de visualización operativa (Anti-Undefined)
    const formatDireccion = (data) => {
        if (!data) return "Ubicación no especificada";
        if (typeof data === 'string') return data;
        return data.direccion || data.address || data.nombre || (data.lat && data.lng ? `${Number(data.lat).toFixed(4)}, ${Number(data.lng).toFixed(4)}` : "S/D");
    };

    const formatFecha = (fecha) => {
        if (!fecha) return null;
        if (typeof fecha === 'object' && fecha?.seconds) {
            return new Date(fecha.seconds * 1000).toLocaleDateString('es-CO');
        }
        const parsed = new Date(fecha);
        return isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString('es-CO');
    };

    const fetchHistorial = useCallback(async () => {
        const conductorId = user?.uid || user?.id || user?._id;
        if (!conductorId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // 📡 1. INTENTO DE CONSULTA EN API REST DE MONGODB CORE CON PARÁMETROS FILTRADOS ESTRICTAMENTE
        try {
            const rawEndpoint = VIAJES_ENDPOINTS?.historial || '/viajes/historial';
            const cleanEndpoint = rawEndpoint.replace(/^\/api/, '');

            const res = await api.get(cleanEndpoint, {
                params: {
                    conductorId: conductorId,
                    tipoServicio: 'motocarga'
                }
            });

            const viajesRest = res?.data?.viajes || (Array.isArray(res?.data) ? res.data : null);

            if (res?.data?.success && Array.isArray(res?.data?.viajes)) {
                setHistorial(res.data.viajes);
                setLoading(false);
                return;
            } else if (Array.isArray(viajesRest)) {
                setHistorial(viajesRest);
                setLoading(false);
                return;
            }
        } catch (err) {
            console.warn("⚠️ [CIMCO-MOTOCARGA-REST] Fallo en API REST Express, ejecutando respaldo Firestore:", err?.message || err);
        }

        // 🔄 2. FALLBACK SECUNDARIO NOSQL (FIRESTORE) CON ORDENAMIENTO EN MEMORIA
        try {
            const pathColeccion = FIRESTORE_PATHS?.rides || FIRESTORE_PATHS?.viajes || 'rides';
            const q = query(
                collection(db, pathColeccion),
                where('conductorId', '==', conductorId),
                where('tipoServicio', '==', 'motocarga'),
                where('estado', '==', 'COMPLETADO')
            );

            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Ordenamiento en memoria para evitar fallos por índices compuestos no provistos en la consola de Firebase
            docs.sort((a, b) => {
                const getTime = (val) => {
                    if (!val) return 0;
                    if (typeof val === 'object' && val?.seconds) return val.seconds * 1000;
                    if (typeof val === 'number') return val;
                    const t = new Date(val).getTime();
                    return isNaN(t) ? 0 : t;
                };
                return getTime(b.fechaCreacion || b.createdAt) - getTime(a.fechaCreacion || a.createdAt);
            });

            setHistorial(docs);
        } catch (noSqlErr) {
            console.error("❌ [CIMCO-CRITICAL-MOTOCARGA] Fallo en fallback NoSQL:", noSqlErr);
            setError("No se pudo sincronizar la bitácora de fletes con el servidor central.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchHistorial();
    }, [fetchHistorial, retryCount]);

    const handleReintentar = () => {
        setRetryCount(prev => prev + 1);
    };

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-4 md:p-8 relative overflow-hidden selection:bg-amber-500/20 selection:text-amber-400">
            {/* Gradiente ambiental premium */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[130px] pointer-events-none" />

            <div className="w-full max-w-4xl mx-auto relative z-10 flex flex-col gap-6">
                {/* 🔝 ENCABEZADO: Glassmorphic Premium UI */}
                <header className="backdrop-blur-md bg-[#121214]/80 p-5 rounded-2xl border border-white/5 flex items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <Package size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                                Registro Fletes
                            </h1>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">Historial de logística pesada y distribución urbana</p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-zinc-950/60 px-3 py-1.5 rounded-xl border border-white/5 text-[9px] text-zinc-400 uppercase font-bold tracking-widest">
                        <Truck size={12} className="text-amber-400" />
                        <span>{historial?.length || 0} Fletes</span>
                    </div>
                </header>

                {/* 📊 CONTENEDOR DE REGISTROS CRÍTICOS */}
                <div className="space-y-4">
                    {error ? (
                        <div className="backdrop-blur-md bg-red-500/5 p-6 rounded-2xl border border-red-500/20 text-center flex flex-col items-center gap-3 shadow-xl">
                            <AlertTriangle className="text-red-500" size={28} />
                            <p className="text-zinc-300 text-xs uppercase tracking-wide max-w-xs">{error}</p>
                            <button 
                                onClick={handleReintentar}
                                className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-amber-500/40 text-[10px] text-zinc-400 hover:text-white uppercase font-bold py-2 px-4 rounded-xl transition-all active:scale-95 cursor-pointer"
                            >
                                <RefreshCw size={12} /> Reintentar Conexión
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="h-64 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl flex items-center justify-center gap-3 text-zinc-400 text-xs uppercase tracking-widest shadow-xl">
                            <Loader size={18} className="animate-spin text-amber-400" /> Sincronizando registros fletes...
                        </div>
                    ) : historial.length === 0 ? (
                        <div className="h-64 backdrop-blur-md bg-[#121214]/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 text-center p-6 shadow-xl">
                            <Package className="text-zinc-600" size={32} />
                            <p className="text-zinc-500 uppercase text-xs tracking-widest font-bold">Sin registros operativos recientes.</p>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">No se detectan fletes completados asignados a tu unidad.</p>
                        </div>
                    ) : (
                        historial.map(flete => {
                            const tarifaFinal = parseFloat(flete.tarifa || flete.pago?.tarifaOfertada || flete.oferta || flete.valor || flete.precio || 0);
                            const fechaFormat = formatFecha(flete.fechaCreacion || flete.createdAt);

                            return (
                                <div 
                                    key={flete.id || flete._id} 
                                    className="backdrop-blur-md bg-[#121214]/80 p-5 rounded-2xl border border-white/5 flex flex-col gap-4 shadow-lg hover:border-white/10 hover:bg-[#121214]/90 transition-all duration-200"
                                >
                                    {/* Bloque superior financiero del flete */}
                                    <div className="flex justify-between items-start border-b border-white/5 pb-3">
                                        <div>
                                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Flete Neto Recaudado</p>
                                            <p className="text-lg font-black text-amber-400 tracking-tight mt-0.5">
                                                ${tarifaFinal.toLocaleString('es-CO')} <span className="text-[10px] text-zinc-500 font-normal">COP</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider text-[10px] shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                                            <CheckCircle size={12} />
                                            <span>Completado</span>
                                        </div>
                                    </div>
                                    
                                    {/* Panel Georreferenciado */}
                                    <div className="space-y-2.5 bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-start gap-2 text-xs text-zinc-300">
                                            <MapPin size={14} className="text-zinc-500 shrink-0 mt-0.5" />
                                            <span className="text-[11px] leading-tight">
                                                <strong className="text-zinc-500 uppercase text-[9px] block font-black tracking-wider mb-0.5">Punto de Carga / Origen:</strong> 
                                                {formatDireccion(flete.origen || flete.ubicacionRecogida)}
                                            </span>
                                        </div>
                                        <div className="border-t border-dashed border-white/5 my-1"></div>
                                        <div className="flex items-start gap-2 text-xs text-zinc-300">
                                            <MapPin size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                            <span className="text-[11px] leading-tight">
                                                <strong className="text-amber-400 uppercase text-[9px] block font-black tracking-wider mb-0.5">Punto de Descarga / Destino:</strong> 
                                                {formatDireccion(flete.destino || flete.ubicacionEntrega)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Metadata Estructural del Documento */}
                                    <div className="flex justify-between items-center text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                        <span>ID: CARGA-...{String(flete.id || flete._id || '').slice(-6).toUpperCase()}</span>
                                        {fechaFormat && (
                                            <span>REG: {fechaFormat}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistorialMotocarga;