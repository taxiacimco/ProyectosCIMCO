// Versión Arquitectura: V16.0 - Integración Dual Backend Node.js/MongoDB y Fallback Firestore para Historial de Despachos
/**
 * Ubicación: frontend\src\pages\despachador\HistorialDespachador.jsx
 * Misión: Renderizar la bitácora de arqueos y manifiestos de salida del despachador en tiempo real.
 * Ajuste V16.0: Conexión preferente a la API REST de Express/MongoDB (/api/viajes/despachador)
 * con fallback resiliente a Firestore NoSQL, normalización atómica de atributos y sincronización por WebSockets.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { formatDireccion } from '@/utils/formatters'; 
import { FileText, Users, MapPin, Loader, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatFechaColombia } from '@/utils/dateFormatter';
import api, { VIAJES_ENDPOINTS } from '@/config/api';
import { useSocket } from '@/hooks/SocketContext';

const HistorialDespachador = () => {
    const authContext = useAuth();
    const user = authContext?.user || null;
    const { socket } = useSocket();

    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorIndex, setErrorIndex] = useState(null);
    const [origenDatos, setOrigenDatos] = useState('MongoDB'); // 'MongoDB' | 'Firestore'

    // 🛡️ Normalizador atómico para unificar estructuras heterogéneas entre MongoDB y Firestore
    const normalizarDespacho = useCallback((doc) => {
        const id = doc?._id || doc?.id || `DESP-${Math.random().toString(36).substring(2, 9)}`;
        
        // Extracción resiliente de valor de pasaje / tarifa
        const tarifaRaw = doc?.valorPasaje ?? doc?.tarifa ?? doc?.precio ?? 0;
        const tarifa = typeof tarifaRaw === 'number' ? tarifaRaw : parseFloat(tarifaRaw) || 0;

        // Normalización de datos del conductor y vehículo
        const driverPlaca = doc?.driverPlaca || doc?.placaVehiculo || doc?.conductor?.placaVehiculo || doc?.conductor?.placa || 'N/A';
        const driverUid = doc?.driverUid || doc?.conductorId || doc?.conductor?._id || doc?.conductor?.uid || 'Directo';
        const conductorNombre = doc?.conductorNombre || doc?.conductor?.fullName || doc?.conductor?.nombre || '';

        // Fechas de registro
        const createdAt = doc?.createdAt || doc?.fechaCreacion || doc?.fecha || new Date().toISOString();

        return {
            id,
            _id: doc?._id || id,
            destino: doc?.destino || doc?.destinoDireccion || "Destino No Especificado",
            origen: doc?.origen || "Origen No Especificado",
            tarifa,
            driverPlaca,
            driverUid,
            conductorNombre,
            createdAt,
            estado: doc?.estado || 'completado',
            raw: doc
        };
    }, []);

    // 🚀 Petición al Backend de Express/MongoDB
    const cargarHistorialBackend = useCallback(async () => {
        const idDespachador = user?._id || user?.id || user?.uid;
        if (!idDespachador) return false;

        try {
            const endpoint = VIAJES_ENDPOINTS?.despachador || '/api/viajes/despachador';
            const response = await api.get(`${endpoint}/${idDespachador}`);

            if (response?.data?.success && Array.isArray(response?.data?.data)) {
                const listaNormalizada = response.data.data.map(normalizarDespacho);
                setHistorial(listaNormalizada);
                setOrigenDatos('MongoDB');
                setErrorIndex(null);
                return true;
            } else if (Array.isArray(response?.data)) {
                const listaNormalizada = response.data.map(normalizarDespacho);
                setHistorial(listaNormalizada);
                setOrigenDatos('MongoDB');
                setErrorIndex(null);
                return true;
            }
            return false;
        } catch (err) {
            console.warn("⚠️ [CIMCO-HISTORIAL-REST] Backend Express inaccesible. Activando fallback NoSQL Firestore:", err?.message);
            return false;
        }
    }, [user?._id, user?.id, user?.uid, normalizarDespacho]);

    // 📡 Listener de Respaldo en Firestore si Express falla
    const suscribirFirestore = useCallback(() => {
        const uidDespachador = user?.uid || user?._id || user?.id;
        if (!uidDespachador) return () => {};

        const pathColeccion = FIRESTORE_PATHS?.viajesIntermunicipales || 'viajes_intermunicipales';

        try {
            const q = query(
                collection(db, pathColeccion),
                where('dispatcherUid', '==', uidDespachador),
                orderBy('createdAt', 'desc')
            );

            return onSnapshot(q, 
                (snapshot) => {
                    const listaDespachos = snapshot.docs.map(doc => normalizarDespacho({ id: doc.id, ...doc.data() }));
                    setHistorial(listaDespachos);
                    setOrigenDatos('Firestore');
                    setErrorIndex(null);
                    setLoading(false);
                }, 
                (error) => {
                    console.error("⚠️ [CIMCO-ARCH-ERR] Fallo de consulta reactiva NoSQL:", error);
                    if (error.message && error.message.includes("https://console.firebase.google.com")) {
                        setErrorIndex(error.message);
                    } else {
                        setErrorIndex(`Error en bus de sincronización: ${error.message}`);
                    }
                    setLoading(false);
                }
            );
        } catch (err) {
            console.error("⚠️ [CIMCO-ARCH-CRASH] Fallo crítico al inicializar listener Firestore:", err);
            setErrorIndex(err.message);
            setLoading(false);
            return () => {};
        }
    }, [user?.uid, user?._id, user?.id, normalizarDespacho]);

    // 🔄 Flujo de Inicialización Principal
    useEffect(() => {
        let isMounted = true;
        let unsubFirestore = () => {};

        const inicializarHistorial = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setErrorIndex(null);

            // Intentar primero con Express / MongoDB REST
            const exitoBackend = await cargarHistorialBackend();

            if (isMounted) {
                if (exitoBackend) {
                    setLoading(false);
                } else {
                    // Fallback automático a Firestore si Express/MongoDB falla
                    unsubFirestore = suscribirFirestore();
                }
            }
        };

        inicializarHistorial();

        return () => {
            isMounted = false;
            if (typeof unsubFirestore === 'function') unsubFirestore();
        };
    }, [user, cargarHistorialBackend, suscribirFirestore]);

    // ⚡ Escucha de eventos Socket.io para actualización en tiempo real cuando el origen es MongoDB
    useEffect(() => {
        if (!socket || origenDatos !== 'MongoDB') return;

        const handleNuevoViaje = (nuevoViaje) => {
            console.log("⚡ [CIMCO-SOCKET] Nuevo despacho detectado en tiempo real:", nuevoViaje);
            const viajeNormalizado = normalizarDespacho(nuevoViaje);
            setHistorial((prev) => [viajeNormalizado, ...prev.filter(v => v.id !== viajeNormalizado.id)]);
        };

        socket.on('viaje_creado', handleNuevoViaje);
        socket.on('viaje_actualizado', handleNuevoViaje);

        return () => {
            socket.off('viaje_creado', handleNuevoViaje);
            socket.off('viaje_actualizado', handleNuevoViaje);
        };
    }, [socket, origenDatos, normalizarDespacho]);

    // ✅ Sanitizador interno para evitar roturas de UI con tipos de datos string/objeto en mapas
    const safeFormatDireccion = (destinoRaw) => {
        if (!destinoRaw) return "Dirección no especificada";
        if (typeof destinoRaw === 'string') return destinoRaw;
        return formatDireccion(destinoRaw) || "Ubicación Georreferenciada";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center font-sans">
                <Loader className="text-orange-500 animate-spin mb-3" size={24} />
                <p className="text-[10px] uppercase tracking-widest text-orange-400 font-mono animate-pulse">📡 Streaming de Arqueos Activo...</p>
            </div>
        );
    }

    if (errorIndex && origenDatos === 'Firestore') {
        return (
            <div className="min-h-screen bg-[#121214] p-6 font-mono text-zinc-100 flex flex-col items-center justify-center">
                <div className="backdrop-blur-md bg-[#161619]/60 border border-red-500/20 rounded-2xl p-6 text-center max-w-xl shadow-2xl">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <AlertTriangle className="text-red-400" size={24} />
                    </div>
                    <h2 className="text-xs font-black text-white mb-2 tracking-wider uppercase">ÍNDICE COMPUESTO EXIGIDO</h2>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-tight mb-4 leading-relaxed text-left">
                        La consulta en tiempo real requiere una matriz de indexación compuesta en la consola perimetral de Firebase.
                    </p>
                    <div className="font-mono text-[9px] text-red-400 bg-red-950/20 p-4 rounded-xl border border-red-500/10 break-all mb-4 text-left select-all">
                        {errorIndex}
                    </div>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                        Copie la URL superior para aprovisionar el índice en Firestore automáticamente.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121214] font-sans text-zinc-100 p-4 md:p-8 flex flex-col gap-6">
            <header className="flex items-center justify-between border-b border-white/5 pb-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest text-white">Historial de Despachos</h1>
                        <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">Manifiestos y Liquidaciones de Flota</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={cargarHistorialBackend}
                        className="p-2 rounded-xl bg-zinc-900 border border-white/5 hover:border-orange-500/30 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        title="Recargar Historial"
                    >
                        <RefreshCw size={12} />
                    </button>
                    <div className="backdrop-blur-md bg-zinc-950/50 border border-white/5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${origenDatos === 'MongoDB' ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                        {origenDatos}: {historial.length} Unidades
                    </div>
                </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                {historial.length === 0 ? (
                    <div className="backdrop-blur-md bg-[#161619]/40 border border-white/5 rounded-3xl p-12 text-center border-dashed flex flex-col items-center justify-center gap-2">
                        <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">No se registran despachos históricos de tu autoría en la central.</p>
                    </div>
                ) : (
                    historial.map((despacho) => (
                        <div key={despacho.id} className="backdrop-blur-md bg-[#161619]/40 border border-white/5 rounded-2xl p-5 shadow-lg hover:border-white/10 transition-all flex flex-col gap-3">
                            <div className="flex justify-between items-start border-b border-white/5 pb-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                        <span className="text-xs font-black text-white tracking-wider font-mono">MANIFIESTO #{String(despacho.id).substring(0, 8).toUpperCase()}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
                                        <Clock size={10} className="opacity-60" />
                                        <span>{formatFechaColombia(despacho.createdAt)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono font-bold block">Valor Ruta</span>
                                    <p className="text-xs font-black text-emerald-400 font-mono">${despacho.tarifa.toLocaleString()} COP</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                <div className="flex items-center gap-2.5 text-xs text-zinc-300 bg-zinc-950/30 border border-white/5 p-3 rounded-xl">
                                    <MapPin size={14} className="text-orange-400 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Destino Operativo</p>
                                        <p className="truncate text-[11px] font-semibold mt-0.5 text-zinc-200">{safeFormatDireccion(despacho.destino)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs text-zinc-300 bg-zinc-950/30 border border-white/5 p-3 rounded-xl">
                                    <Users size={14} className="text-zinc-500 shrink-0" />
                                    <div className="min-w-0 w-full font-mono">
                                        <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Unidad Asignada</p>
                                        <p className="truncate text-[10px] uppercase tracking-wide mt-0.5 text-zinc-400">
                                            PLACA: <span className="text-white font-bold">{despacho.driverPlaca}</span>
                                            {despacho.conductorNombre && <span className="text-zinc-300 font-normal"> ({despacho.conductorNombre})</span>}
                                            {" — ID: "}<span className="text-orange-400">{String(despacho.driverUid).substring(0, 6)}</span>
                                        </p>
                                    </div>
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