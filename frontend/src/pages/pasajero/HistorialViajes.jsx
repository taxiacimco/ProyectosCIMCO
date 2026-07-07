// Versión Arquitectura: V12.4 - Blindaje Logístico y Gestión Descentralizada de Bitácoras
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\HistorialViajes.jsx
 * Misión: Renderizar el historial operativo del pasajero consumiendo la colección centralizada de viajes.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Identidad Amarilla).
 * Ajuste V12.4: Mutación y migración atómica a snapshot reactivo de escucha en tiempo real optimizando el array de dependencias e indexación segura.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Calendar, MapPin, Clock, Loader, AlertTriangle, CheckCircle, Wallet, QrCode, Banknote } from 'lucide-react';
// 🚀 Gobernanza de Rutas: Inyección de la utilidad con Alias Absoluto
import { formatFechaColombia } from '@/utils/dateFormatter';

const HistorialViajes = () => {
    const { user } = useAuth();
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 🛡️ Blindaje Profesional: Normalización de visualización operativa (Anti-Undefined)
    const formatDireccion = (data) => {
        if (!data) return "Ubicación no especificada";
        if (typeof data === 'string') return data;
        return data?.direccion || data?.address || data?.nombre || "S/D";
    };

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const pathColeccion = FIRESTORE_PATHS?.rides || FIRESTORE_PATHS?.viajes || 'rides';
        
        try {
            // Nota de Arquitectura: Esta consulta optimizada requiere un Índice Compuesto en Firestore
            const q = query(
                collection(db, pathColeccion),
                where('pasajeroId', '==', user.uid),
                where('estado', '==', 'COMPLETADO'),
                orderBy('fechaCreacion', 'desc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const listaViajes = snapshot.docs.map(doc => {
                    const payload = doc.data();
                    return {
                        id: doc.id,
                        ...payload,
                        // Protección anti-undefined interna
                        metodoPago: payload?.metodoPago || 'EFECTIVO',
                        valor: payload?.valor || payload?.precio || 0,
                        distancia: payload?.distancia || null
                    };
                });
                setViajes(listaViajes);
                setLoading(false);
                setError(null);
            }, (err) => {
                console.error("❌ [CIMCO-INDEX-ERROR] Si este error persiste, crea el índice compuesto en la consola usando el enlace provisto por el runtime de Firebase.", err);
                setError("Error de sincronización con la bitácora central.");
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err) {
            console.error("❌ [CIMCO-CRITICAL-HISTORIAL]:", err);
            setError(err.message);
            setLoading(false);
        }
    }, [user?.uid]); // 🚀 Inyección de ID atómico para mitigar loops de renderizado

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
                    <div className="text-[9px] bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-white/5 text-zinc-400 font-bold tracking-widest uppercase">
                        Terminal: <span className="text-yellow-500">{viajes?.length}</span> Viajes Completados
                    </div>
                </div>

                {/* MANEJO DE ESTADOS DE CARGA Y ERROR */}
                {loading ? (
                    <div className="h-64 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-xl">
                        <Loader className="animate-spin text-yellow-500" size={32} />
                        <span className="tracking-widest uppercase text-[10px] text-zinc-400">Escaneando Registro de Vuelo...</span>
                    </div>
                ) : error ? (
                    <div className="backdrop-blur-md bg-red-500/5 border border-red-500/20 rounded-3xl p-6 text-center flex flex-col items-center gap-3">
                        <AlertTriangle className="text-red-500" size={32} />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">Interrupción de Enlace</h3>
                        <p className="text-xs text-zinc-400 max-w-md">{error}</p>
                    </div>
                ) : viajes.length === 0 ? (
                    <div className="h-64 backdrop-blur-md bg-[#121214]/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 text-center p-6">
                        <Calendar className="text-zinc-600" size={32} />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Historial Vacío</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider max-w-xs mt-1">No se detectan trayectos cerrados en este nodo de identidad.</p>
                    </div>
                ) : (
                    /* GRILLA DE REGISTROS DE VIAJE */
                    <div className="flex flex-col gap-4">
                        {viajes.map((viaje) => (
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
                                            HASH: {viaje.id.slice(0, 8)}
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
                                        {/* Mapeo Dinámico Seguro del Método de Pago */}
                                        <span className="text-[9px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-bold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(34,211,238,0.05)]">
                                            {viaje?.metodoPago === 'WALLET' ? <Wallet size={10} /> : viaje?.metodoPago === 'QR' ? <QrCode size={10} /> : <Banknote size={10} />}
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistorialViajes;