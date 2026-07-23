// Versión Arquitectura: V12.5 - Corrección Transaccional BILLETERA y Mecanismo de Reintentos de Bitácora
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\HistorialViajes.jsx
 * Misión: Renderizar el historial operativo del pasajero consumiendo la colección centralizada de viajes.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Identidad Amarilla).
 * Ajuste V12.5: Normalización del condicional para BILLETERA y WALLET, manejo visual de reintentos en caso de interrupción y blindaje anti-undefined.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Calendar, MapPin, Clock, Loader, AlertTriangle, CheckCircle, Wallet, QrCode, Banknote, RefreshCw } from 'lucide-react';
// 🚀 Gobernanza de Rutas: Inyección de la utilidad con Alias Absoluto
import { formatFechaColombia } from '@/utils/dateFormatter';

const HistorialViajes = () => {
    const { user } = useAuth();
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    // 🛡️ Blindaje Profesional: Normalización de visualización operativa (Anti-Undefined)
    const formatDireccion = (data) => {
        if (!data) return "Ubicación no especificada";
        if (typeof data === 'string') return data;
        return data?.direccion || data?.address || data?.nombre || "S/D";
    };

    const cargarHistorial = useCallback(() => {
        const uid = user?.uid || user?.id;
        if (!uid) {
            setLoading(false);
            return () => {};
        }

        setLoading(true);
        setError(null);
        
        const pathColeccion = FIRESTORE_PATHS?.rides || FIRESTORE_PATHS?.viajes || 'rides';
        
        try {
            // Consulta optimizada para la bitácora del pasajero
            const q = query(
                collection(db, pathColeccion),
                where('pasajeroId', '==', uid),
                where('estado', '==', 'COMPLETADO'),
                orderBy('fechaCreacion', 'desc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const listaViajes = snapshot.docs.map(doc => {
                    const payload = doc.data() || {};
                    return {
                        id: doc.id,
                        ...payload,
                        // Protección anti-undefined interna
                        metodoPago: (payload?.metodoPago || payload?.paymentMethod || 'EFECTIVO').toUpperCase(),
                        valor: payload?.valor || payload?.precio || payload?.monto || 0,
                        distancia: payload?.distancia || null,
                        origen: payload?.origen || payload?.coordenadasInicio || null,
                        destino: payload?.destino || payload?.coordenadasFin || null,
                        fechaCreacion: payload?.fechaCreacion || payload?.createdAt || null
                    };
                });
                setViajes(listaViajes);
                setLoading(false);
                setError(null);
            }, (err) => {
                console.error("❌ [CIMCO-INDEX-ERROR] Si este error persiste, verifica el índice compuesto en Firestore:", err);
                setError("Error de sincronización con la bitácora central. Por favor reintenta la conexión.");
                setLoading(false);
            });

            return unsubscribe;
        } catch (err) {
            console.error("❌ [CIMCO-CRITICAL-HISTORIAL]:", err);
            setError(err?.message || "Ocurrió un error inesperado al conectar con el servidor.");
            setLoading(false);
            return () => {};
        }
    }, [user?.uid, user?.id]);

    useEffect(() => {
        const unsubscribe = cargarHistorial();
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [cargarHistorial, retryCount]);

    const handleReintentar = () => {
        setRetryCount((prev) => prev + 1);
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-8 font-mono antialiased relative overflow-hidden">
            {/* Gradiente ambiental premium */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[130px] pointer-events-none" />

            <div className="w-full max-w-4xl mx-auto relative z-10">
                {/* CABECERA DE OPERACIÓN */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-6">
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" />
                            Bitácora de Trayectos
                        </h1>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-1">
                            Historial operativo y auditoría transaccional del pasajero
                        </p>
                    </div>
                    <div className="text-[9px] bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-white/5 text-zinc-400 font-bold tracking-widest uppercase flex items-center gap-2">
                        <span>Terminal: <span className="text-yellow-500">{viajes?.length || 0}</span> Viajes Completados</span>
                    </div>
                </div>

                {/* MANEJO DE ESTADOS DE CARGA Y ERROR CON RESILIENCIA */}
                {loading ? (
                    <div className="h-64 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-xl">
                        <Loader className="animate-spin text-yellow-500" size={32} />
                        <span className="tracking-widest uppercase text-[10px] text-zinc-400">Escaneando Registro de Vuelo...</span>
                    </div>
                ) : error ? (
                    <div className="backdrop-blur-md bg-red-500/5 border border-red-500/20 rounded-3xl p-6 text-center flex flex-col items-center gap-4">
                        <AlertTriangle className="text-red-500" size={32} />
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">Interrupción de Enlace</h3>
                            <p className="text-xs text-zinc-400 max-w-md mt-1">{error}</p>
                        </div>
                        <button
                            onClick={handleReintentar}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95"
                        >
                            <RefreshCw size={14} className="animate-spin-slow" />
                            Reintentar Conexión
                        </button>
                    </div>
                ) : (viajes?.length || 0) === 0 ? (
                    <div className="h-64 backdrop-blur-md bg-[#121214]/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 text-center p-6">
                        <Calendar className="text-zinc-600" size={32} />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Historial Vacío</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider max-w-xs mt-1">No se detectan trayectos cerrados en este nodo de identidad.</p>
                    </div>
                ) : (
                    /* GRILLA DE REGISTROS DE VIAJE */
                    <div className="flex flex-col gap-4">
                        {viajes.map((viaje) => {
                            const esBilletera = viaje?.metodoPago === 'BILLETERA' || viaje?.metodoPago === 'WALLET';
                            const esQr = viaje?.metodoPago === 'QR';

                            return (
                                <div 
                                    key={viaje.id}
                                    className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-5 shadow-lg transition-all duration-300 hover:border-white/10 hover:bg-[#121214]/90 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                                >
                                    <div className="flex-1 flex flex-col gap-3">
                                        {/* Cabecera del Registro */}
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                            <span className="flex items-center gap-1 bg-zinc-950/60 px-2 py-1 rounded border border-white/5 text-zinc-400">
                                                <Calendar size={12} className="text-yellow-500" />
                                                {formatFechaColombia(viaje?.fechaCreacion)}
                                            </span>
                                            <span className="font-mono text-[9px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
                                                HASH: {String(viaje.id).slice(0, 8)}
                                            </span>
                                        </div>

                                        {/* Datos de Ruta */}
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-start gap-2.5">
                                                <MapPin size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-black">Origen</p>
                                                    <p className="text-xs text-zinc-300 font-semibold mt-0.5">{formatDireccion(viaje?.origen)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2.5">
                                                <MapPin size={14} className="text-red-500 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-black">Destino</p>
                                                    <p className="text-xs text-zinc-300 font-semibold mt-0.5">{formatDireccion(viaje?.destino)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desglose Financiero e Indicador Técnico */}
                                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                                        <div className="text-left md:text-right">
                                            <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-black">Tarifa Consolidada</p>
                                            <p className="text-lg font-black text-white tracking-tight mt-0.5">
                                                ${Number(viaje?.valor || 0).toLocaleString()} <span className="text-[10px] text-zinc-500 font-normal">COP</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Mapeo Dinámico Seguro del Método de Pago corregido para BILLETERA y WALLET */}
                                            <span className="text-[9px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-bold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(34,211,238,0.05)]">
                                                {esBilletera ? <Wallet size={10} /> : esQr ? <QrCode size={10} /> : <Banknote size={10} />}
                                                {viaje?.metodoPago || 'EFECTIVO'}
                                            </span>
                                            
                                            <div className="flex items-center gap-1.5">
                                                {viaje?.distancia && <span className="text-[9px] font-mono text-zinc-500">{viaje.distancia} Km</span>}
                                                <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                                                    <CheckCircle size={10} /> Completado
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistorialViajes;