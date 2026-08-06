// Versión Arquitectura: V13.0 - Integración REST API Express con Fallback Resiliente NoSQL Anti-Índice
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\HistorialViajes.jsx
 * Misión: Renderizar el historial operativo del pasajero consumiendo la API REST de Express/MongoDB
 *        con fallback resiliente a Firestore y mitigación automática de índices NoSQL faltantes.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Identidad Amarilla).
 * Ajuste V13.0: Degradación fluida desde API REST Express a Firestore, eliminando bloqueos por ausencia
 *               de índices compuestos mediante ordenamiento seguro en memoria.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api, { VIAJES_ENDPOINTS } from '@/config/api';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Calendar, MapPin, Loader, AlertTriangle, CheckCircle, Wallet, QrCode, Banknote, RefreshCw } from 'lucide-react';
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

    const normalizeViaje = (payload) => {
        const rawPay = payload || {};
        return {
            id: rawPay.id || rawPay._id || Math.random().toString(36).substring(2, 9),
            ...rawPay,
            estado: rawPay?.estado || 'COMPLETADO',
            metodoPago: (rawPay?.metodoPago || rawPay?.paymentMethod || 'EFECTIVO').toUpperCase(),
            valor: rawPay?.valor || rawPay?.precio || rawPay?.monto || rawPay?.tarifa || 0,
            distancia: rawPay?.distancia || null,
            origen: rawPay?.origen || rawPay?.coordenadasInicio || null,
            destino: rawPay?.destino || rawPay?.coordenadasFin || null,
            fechaCreacion: rawPay?.fechaCreacion || rawPay?.createdAt || rawPay?.timestamp || null
        };
    };

    const cargarHistorial = useCallback(async () => {
        const uid = user?.uid || user?.id || user?._id;
        if (!uid) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // 📡 1. INTENTO PRIMARIO: CONSULTA A LA REST API BACKEND (Express / MongoDB)
        try {
            const rawEndpoint = VIAJES_ENDPOINTS?.historial || '/viajes/historial';
            const cleanEndpoint = rawEndpoint.replace(/^\/api/, '');
            const endpoint = `${cleanEndpoint}?pasajeroId=${uid}&estado=COMPLETADO`;

            const response = await api.get(endpoint);
            const rawViajes = response?.data?.viajes || (Array.isArray(response?.data) ? response.data : null);

            if (rawViajes && Array.isArray(rawViajes)) {
                const listaNormalizada = rawViajes.map(normalizeViaje);
                setViajes(listaNormalizada);
                setLoading(false);
                return;
            }
            throw new Error("Respuesta REST API sin conjunto de datos válido.");
        } catch (restErr) {
            console.warn("⚠️ [CIMCO-HISTORIAL-REST] Fallo en API REST Express, ejecutando fallback a Firestore NoSQL:", restErr?.message || restErr);
        }

        // 🔄 2. FALLBACK SECUNDARIO: CONSULTA A FIRESTORE (Con inmunización de índice compuesto)
        try {
            const pathColeccion = FIRESTORE_PATHS?.rides || FIRESTORE_PATHS?.viajes || 'rides';

            // Intento con consulta ordenada (requiere índice compuesto en consola Firebase)
            try {
                const qIndexed = query(
                    collection(db, pathColeccion),
                    where('pasajeroId', '==', uid),
                    where('estado', '==', 'COMPLETADO'),
                    orderBy('fechaCreacion', 'desc')
                );
                const snapshot = await getDocs(qIndexed);
                const lista = snapshot.docs.map(doc => normalizeViaje({ id: doc.id, ...doc.data() }));
                setViajes(lista);
                setLoading(false);
                return;
            } catch (indexErr) {
                console.warn("⚠️ [CIMCO-FIRESTORE-INDEX] Ausencia o falla de índice compuesto. Ejecutando consulta de rescate y ordenamiento en memoria:", indexErr?.message || indexErr);

                // Consulta de rescate sin orderBy para evitar colapso si falta el índice compuesto
                const qSimple = query(
                    collection(db, pathColeccion),
                    where('pasajeroId', '==', uid)
                );
                const snapshot = await getDocs(qSimple);
                let lista = snapshot.docs
                    .map(doc => normalizeViaje({ id: doc.id, ...doc.data() }))
                    .filter(v => (v.estado || '').toUpperCase() === 'COMPLETADO');

                // Ordenamiento en memoria por fecha descendente
                lista.sort((a, b) => {
                    const getTime = (val) => {
                        if (!val) return 0;
                        if (typeof val === 'object' && val.seconds) return val.seconds * 1000;
                        return new Date(val).getTime() || 0;
                    };
                    return getTime(b.fechaCreacion) - getTime(a.fechaCreacion);
                });

                setViajes(lista);
                setLoading(false);
                return;
            }
        } catch (noSqlErr) {
            console.error("❌ [CIMCO-CRITICAL-HISTORIAL] Fallo en respaldo Firestore NoSQL:", noSqlErr);
            setError("Error de sincronización con la bitácora central. Por favor reintenta la conexión.");
        } finally {
            setLoading(false);
        }
    }, [user?.uid, user?.id, user?._id]);

    useEffect(() => {
        cargarHistorial();
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
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer"
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
                                            {/* Mapeo Dinámico Seguro del Método de Pago */}
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