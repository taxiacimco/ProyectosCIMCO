// Versión Arquitectura: V17.0 - Refactorización Hexagonal (viajeService) y Paginación Progresiva para Historial Intermunicipal
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\intermunicipal\HistorialIntermunicipal.jsx
 * Misión: Renderizar la bitácora de viajes intermunicipales del conductor delegando
 *        la consulta de datos a viajeService (Arquitectura Hexagonal) e implementando paginación
 *        para evitar la degradación de memoria por volumen masivo de histórico.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import viajeService from '@/services/viajeService';
import { formatDireccion } from '@/utils/formatters';
import { FileText, MapPin, Bus, Loader, AlertTriangle, RefreshCw, WifiOff, ChevronDown } from 'lucide-react';

const PAGE_LIMIT = 10;

const HistorialIntermunicipal = () => {
    const authContext = useAuth();
    const user = authContext?.user || null;

    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator?.onLine ?? true);

    const lastDocRef = useRef(null);
    const idConductor = user?.id || user?._id || user?.uid || "";

    // Listener para monitoreo activo de la estabilidad de la red
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 📡 DELEGACIÓN A VIAJESERVICE (ARQUITECTURA HEXAGONAL) Y PAGINACIÓN PROGRESIVA
    const fetchHistorial = useCallback(async (isInitial = false) => {
        if (!idConductor) {
            setLoading(false);
            return;
        }

        if (navigator?.onLine === false) {
            setIsOnline(false);
            setError("Sin acceso a la red. Verifica la estabilidad de tu conexión de datos o Wi-Fi.");
            setLoading(false);
            setLoadingMore(false);
            return;
        }

        const currentPageToFetch = isInitial ? 1 : page;

        if (isInitial) {
            setLoading(true);
            setError(null);
        } else {
            setLoadingMore(true);
        }

        try {
            // Desacoplamiento total: la lógica REST / Fallback NoSQL reside centralizada en viajeService
            const respuesta = await viajeService.obtenerHistorialIntermunicipal({
                conductorId: idConductor,
                tipoViaje: 'intermunicipal',
                page: currentPageToFetch,
                limit: PAGE_LIMIT,
                lastDoc: isInitial ? null : lastDocRef.current
            });

            const viajesObtenidos = Array.isArray(respuesta?.viajes)
                ? respuesta.viajes
                : Array.isArray(respuesta?.data)
                    ? respuesta.data
                    : Array.isArray(respuesta)
                        ? respuesta
                        : [];

            if (isInitial) {
                setHistorial(viajesObtenidos);
                setPage(1);
            } else {
                setHistorial(prev => [...prev, ...viajesObtenidos]);
            }

            if (respuesta?.lastDoc) {
                lastDocRef.current = respuesta.lastDoc;
            }

            const seEsperanMas = respuesta?.hasMore !== undefined
                ? Boolean(respuesta.hasMore)
                : viajesObtenidos.length >= PAGE_LIMIT;

            setHasMore(seEsperanMas);
        } catch (err) {
            console.error("❌ [CIMCO-HISTORIAL-SERVICE] Error recuperando historial desde viajeService:", err);
            setError(err?.message || "No se pudo sincronizar el historial. Verifica tu señal o estabilidad de la conexión.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [idConductor, page]);

    // Carga Inicial
    useEffect(() => {
        fetchHistorial(true);
    }, [idConductor]);

    // Handler para Infinite Scroll / Cargar Más Páginas
    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            setPage(prev => prev + 1);
        }
    };

    useEffect(() => {
        if (page > 1) {
            fetchHistorial(false);
        }
    }, [page]);

    return (
        <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-6 flex flex-col gap-6 selection:bg-yellow-500/20 selection:text-yellow-400">
            <header className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                    <FileText size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-white">Rutas Despachadas</h1>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Manifiestos de salida y transporte intermunicipal</p>
                </div>
            </header>

            {!isOnline && (
                <div className="backdrop-blur-md bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-2 text-amber-400 text-xs uppercase font-bold tracking-wide">
                    <WifiOff size={16} className="shrink-0" />
                    <span>Conexión inestable o sin conexión a internet detectada.</span>
                </div>
            )}

            <div className="space-y-4">
                {/* 🚨 CAPA DE CONTROL DE INTERRUPCIÓN DE RED */}
                {error ? (
                    <div className="backdrop-blur-md bg-red-500/5 p-6 rounded-2xl border border-red-500/20 text-center flex flex-col items-center gap-3 shadow-xl">
                        <AlertTriangle className="text-red-500" size={24} />
                        <p className="text-zinc-300 text-xs uppercase tracking-wide max-w-xs">{error}</p>
                        <button 
                            onClick={() => fetchHistorial(true)}
                            className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-yellow-500/40 text-[10px] text-zinc-400 hover:text-white uppercase font-bold py-2 px-4 rounded-xl transition-all active:scale-95 cursor-pointer"
                        >
                            <RefreshCw size={12} /> Reintentar Conexión
                        </button>
                    </div>
                ) : loading ? (
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase animate-pulse">
                        <Loader size={14} className="animate-spin text-yellow-500" /> Sincronizando rutas desde central...
                    </div>
                ) : historial.length === 0 ? (
                    <div className="backdrop-blur-md bg-[#121214]/80 p-8 rounded-3xl border border-white/5 text-center shadow-xl">
                        <p className="text-zinc-500 uppercase text-xs tracking-widest">Sin despachos autorizados en bitácora.</p>
                    </div>
                ) : (
                    <>
                        {historial.map(ruta => {
                            const tarifaCalculada = Number(ruta?.tarifa || ruta?.valorPasaje || 0);
                            return (
                                <div key={ruta?.id || ruta?._id} className="backdrop-blur-md bg-[#121214]/80 p-5 rounded-2xl border border-white/5 flex flex-col gap-3 hover:border-white/10 transition-all shadow-lg">
                                    <div className="flex justify-between items-start border-b border-white/5 pb-3">
                                        <div>
                                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Tarifa Generada</p>
                                            <p className="text-sm font-black text-emerald-400">${tarifaCalculada.toLocaleString()} COP</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1.5 rounded-lg">
                                            <Bus size={12} />
                                            <span className="text-[10px] uppercase font-black tracking-widest">{ruta?.estado || 'FINALIZADO'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                                            <MapPin size={14} className="text-yellow-500 shrink-0" />
                                            <span className="truncate text-[11px]">
                                                <strong className="text-zinc-600 uppercase text-[9px] mr-1">Origen / Destino Autorizado:</strong> 
                                                {ruta?.origen ? `${formatDireccion(ruta.origen)} ➔ ` : ''}{formatDireccion(ruta?.destino || 'Sin Destino')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* 🔄 CONTROL DE PAGINACIÓN ACCESIBLE (CARGAR MÁS REGISTROS) */}
                        {hasMore && (
                            <div className="pt-4 flex justify-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="backdrop-blur-md bg-[#121214]/80 hover:bg-yellow-500/10 border border-white/10 hover:border-yellow-500/30 text-yellow-500 text-xs font-bold uppercase tracking-widest py-3 px-6 rounded-2xl transition-all shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader size={14} className="animate-spin text-yellow-500" />
                                            <span>Cargando más registros...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown size={14} />
                                            <span>Cargar Más Despachos</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default HistorialIntermunicipal;