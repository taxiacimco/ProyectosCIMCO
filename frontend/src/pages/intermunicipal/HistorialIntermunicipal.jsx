// Versión Arquitectura: V16.0 - Integración Quirúrgica con Backend Node.js/MongoDB y Resiliencia de UI
/**
 * Ubicación: frontend\src\pages\intermunicipal\HistorialIntermunicipal.jsx
 * Misión: Renderizar la bitácora de viajes intermunicipales del conductor conectándose
 *        con el backend REST (MongoDB) con fallback a Firestore y preservando CIMCO-UI V9.3.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api, { VIAJES_ENDPOINTS } from '@/config/api';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { formatDireccion } from '@/utils/formatters';
import { FileText, MapPin, Bus, Loader, AlertTriangle, RefreshCw } from 'lucide-react';

const HistorialIntermunicipal = () => {
    const authContext = useAuth();
    const user = authContext?.user || null;
    const token = authContext?.token || localStorage.getItem('token') || user?.token || "";

    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const idConductor = user?.id || user?._id || user?.uid || "";

    const fetchHistorial = useCallback(async () => {
        if (!idConductor) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        const axiosConfig = token ? {
            headers: { Authorization: `Bearer ${token}` }
        } : {};

        try {
            // 📡 1. INTENTO DE CONSULTA EN REST API BACKEND (MongoDB Core)
            const endpoint = VIAJES_ENDPOINTS?.historial 
                ? `${VIAJES_ENDPOINTS.historial}?conductorId=${idConductor}&tipoViaje=intermunicipal`
                : `/api/viajes/historial?conductorId=${idConductor}&tipoViaje=intermunicipal`;

            const response = await api.get(endpoint, axiosConfig);

            if (response?.data?.success && Array.isArray(response?.data?.viajes)) {
                setHistorial(response.data.viajes);
                setLoading(false);
                return;
            } else if (Array.isArray(response?.data)) {
                setHistorial(response.data);
                setLoading(false);
                return;
            }
            
            throw new Error("Respuesta backend sin formato de lista.");
        } catch (err) {
            console.warn("⚠️ [CIMCO-HISTORIAL-REST] Fallo en REST API, ejecutando respaldo NoSQL Firestore:", err);
            
            // 🔄 2. FALLBACK SECUNDARIO A FIRESTORE
            try {
                const pathColeccion = FIRESTORE_PATHS?.viajesIntermunicipales || 'viajes_intermunicipales';
                const q = query(
                    collection(db, pathColeccion),
                    where('conductorId', '==', idConductor),
                    orderBy('fechaCreacion', 'desc')
                );
                const snapshot = await getDocs(q);
                const listadoNoSQL = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
                setHistorial(listadoNoSQL);
            } catch (noSqlErr) {
                console.error("❌ [CIMCO-LOG-ERROR] Error leyendo historial operativo Intermunicipal:", noSqlErr);
                setError("No se pudo sincronizar el historial. Verifica tu señal o conexión de datos.");
            }
        } finally {
            setLoading(false);
        }
    }, [idConductor, token]);

    useEffect(() => {
        fetchHistorial();
    }, [fetchHistorial]);

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

            <div className="space-y-4">
                {/* 🚨 CAPA DE CONTROL DE INTERRUPCIÓN DE RED */}
                {error ? (
                    <div className="backdrop-blur-md bg-red-500/5 p-6 rounded-2xl border border-red-500/20 text-center flex flex-col items-center gap-3 shadow-xl">
                        <AlertTriangle className="text-red-500" size={24} />
                        <p className="text-zinc-300 text-xs uppercase tracking-wide max-w-xs">{error}</p>
                        <button 
                            onClick={fetchHistorial}
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
                    historial.map(ruta => {
                        const tarifaCalculada = Number(ruta.tarifa || ruta.valorPasaje || 0);
                        return (
                            <div key={ruta.id || ruta._id} className="backdrop-blur-md bg-[#121214]/80 p-5 rounded-2xl border border-white/5 flex flex-col gap-3 hover:border-white/10 transition-all shadow-lg">
                                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                                    <div>
                                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Tarifa Generada</p>
                                        <p className="text-sm font-black text-emerald-400">${tarifaCalculada.toLocaleString()} COP</p>
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
                                            <strong className="text-zinc-600 uppercase text-[9px] mr-1">Origen / Destino Autorizado:</strong> 
                                            {ruta.origen ? `${formatDireccion(ruta.origen)} ➔ ` : ''}{formatDireccion(ruta.destino || 'Sin Destino')}
                                        </span>
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

export default HistorialIntermunicipal;