// Versión Arquitectura: V16.3 - Sincronización Transaccional Glassmorphism con Telemetría Centralizada
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\MapaOperativo.jsx
 * Misión: Despliegue táctico de unidades en el mapa mediante Leaflet.js enganchado a Firestore y WebSockets.
 * Ajuste V16.3: Integración quirúrgica del receptor unificado 'telemetria_central_radar' preservando la integridad financiera
 * de Firestore (saldos, metadatos) bajo los lineamientos estéticos premium Glassmorphism de CIMCO-UI V9.3.
 */

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useSocket } from '@/hooks/SocketContext';
import { MapPin, Navigation, Signal, Activity, AlertCircle, Database, Search, Shield, Radio, User } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 🛡️ Reparación de Assets de Leaflet para entornos empaquetados por Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

// 🔄 Componente Auxiliar para centrar el mapa dinámicamente si cambia el vector de control
const RecenterMap = ({ coords }) => {
    const map = useMap();
    useEffect(() => {
        if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
            map.setView([coords.lat, coords.lng], map.getZoom());
        }
    }, [coords, map]);
    return null;
};

const MapaOperativo = () => {
    const { socket, isConnected } = useSocket();
    const [unidades, setUnidades] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [errorCanal, setErrorCanal] = useState(null);
    const [centroMapa] = useState({ lat: 9.3005, lng: -73.3361 }); // Coordenadas base: La Jagua de Ibirico

    // 📍 1. CANAL FIRESTORE: Sincronización del Core del Perfil y Metadatos Financieros (Garantía Anti-Bypass)
    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const pathColeccion = FIRESTORE_PATHS?.users || 'usuarios';
        // Filtramos conductores, transportadores y pasajeros activos para unificar la visualización del radar centralizado
        const q = query(collection(db, pathColeccion), where('role', 'in', ['conductor', 'mototaxi', 'motocarga', 'pasajero']));

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                if (!isMounted) return;
                
                setUnidades(prevUnidades => {
                    return snapshot.docs.map(docRef => {
                        const data = docRef.data();
                        const id = docRef.id;
                        
                        // Localizar si ya existía la unidad para no perder la telemetría viva de alta velocidad
                        const unidadPrevia = prevUnidades.find(u => u.id === id);

                        // Blindaje Anti-Undefined sobre coordenadas base de Firestore
                        const latBase = typeof data?.lat === 'number' ? data.lat : 9.3005;
                        const lngBase = typeof data?.lng === 'number' ? data.lng : -73.3361;

                        return {
                            id,
                            nombre: data?.nombre || 'UNIDAD SIN NOMBRE',
                            email: data?.email || 'N/A',
                            telefono: data?.telefono || '',
                            placa: data?.placa || 'N/A',
                            saldo: typeof data?.saldo === 'number' ? data.saldo : 0,
                            estado: data?.estado || 'inactive',
                            role: data?.role || 'conductor',
                            subrol: data?.subrol || unidadPrevia?.subrol || 'general',
                            accuracy: unidadPrevia?.accuracy || 0,
                            coordenadas: unidadPrevia?.coordenadas || [latBase, lngBase],
                            updatedAt: data?.updatedAt?.toMillis ? data.updatedAt.toMillis() : (unidadPrevia?.updatedAt || Date.now())
                        };
                    });
                });

                setLoading(false);
                setErrorCanal(null);
            },
            (err) => {
                if (!isMounted) return;
                console.error("❌ [CIMCO-GEO-FIRESTORE-ERROR]:", err);
                setErrorCanal("Fallo de sincronización en el canal perimetral de metadatos.");
                setLoading(false);
            }
        );

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    // 📡 2. CANAL WEBSOCKETS (SOCKET.IO): Procesamiento de Ráfagas Multicast del Radar Central
    useEffect(() => {
        if (!socket) return;

        const handleRadarTelemetry = (payloadUniversal) => {
            // 🛡️ BLINDAJE DE VARIABLES (ANTI-UNDEFINED): Validación estricta de trama de hardware externa
            if (!payloadUniversal) return;
            
            const uid = payloadUniversal.usuarioId || payloadUniversal.conductorId;
            const lat = typeof payloadUniversal.lat === 'number' ? payloadUniversal.lat : null;
            const lng = typeof payloadUniversal.lng === 'number' ? payloadUniversal.lng : null;

            if (!uid || lat === null || lng === null) {
                return;
            }

            // 🔄 FUSIÓN SELECTIVA TRANSACCIONAL (SHALLOW MERGE): Actualiza posición y vector de radar sin pisar saldos financieros
            setUnidades(prevUnidades => {
                const existeUnidad = prevUnidades.some(u => u.id === uid);

                if (existeUnidad) {
                    return prevUnidades.map(u => 
                        u.id === uid 
                            ? { 
                                ...u, 
                                coordenadas: [lat, lng],
                                subrol: payloadUniversal.subrol || u.subrol || 'general',
                                accuracy: payloadUniversal.accuracy !== undefined ? payloadUniversal.accuracy : u.accuracy,
                                updatedAt: Date.now() 
                              } 
                            : u
                    );
                } else {
                    // Si el operador emite telemetría pero no ha sido cargado por Firestore (Nodo transitorio o Pasajero dinámico)
                    return [
                        ...prevUnidades,
                        {
                            id: uid,
                            nombre: `SATELLITE_${uid.substring(0, 6).toUpperCase()}`,
                            email: 'N/A',
                            telefono: '',
                            placa: payloadUniversal.placa || 'N/A',
                            saldo: 0,
                            estado: 'active',
                            role: payloadUniversal.role || 'conductor',
                            subrol: payloadUniversal.subrol || 'general',
                            accuracy: payloadUniversal.accuracy || 0,
                            coordenadas: [lat, lng],
                            updatedAt: Date.now()
                        }
                    ];
                }
            });
        };

        // Enlace directo al nuevo pipeline unificado del backplane
        socket.on('telemetria_central_radar', handleRadarTelemetry);
        
        // 🔄 BACKWARD COMPATIBILITY: Salvaguarda atómica para flujos legados sin colisiones
        socket.on('posicion_actualizada', handleRadarTelemetry);
        socket.on('coordenadas_streaming', handleRadarTelemetry);

        return () => {
            socket.off('telemetria_central_radar', handleRadarTelemetry);
            socket.off('posicion_actualizada', handleRadarTelemetry);
            socket.off('coordenadas_streaming', handleRadarTelemetry);
        };
    }, [socket]);

    // Motor reactivo de búsqueda geoespacial
    const unidadesFiltradas = unidades.filter(u => {
        const queryNormalize = busqueda.toLowerCase().trim();
        return (u?.nombre || '').toLowerCase().includes(queryNormalize) || 
               (u?.placa || '').toLowerCase().includes(queryNormalize) ||
               (u?.id || '').toLowerCase().includes(queryNormalize);
    });

    // 🎨 Factoría de Marcadores Premium Glassmorphism (CIMCO-UI V9.3 - Evita rupturas de assets en Vite)
    const obtenerIconoUnidadPremium = (role = 'conductor', subrol = 'general', saldo = 0) => {
        const esConductor = role === 'conductor' || role === 'mototaxi' || role === 'motocarga';
        const esSolvente = saldo >= 2000;
        
        let glowColor = 'rgba(34, 211, 238, 0.45)'; // Cyan por defecto para flota activa
        let textColor = 'text-cyan-400';
        let bgStyle = 'bg-cyan-950/70';
        let borderStyle = 'border-cyan-500/30';

        if (!esConductor) {
            glowColor = 'rgba(192, 132, 252, 0.45)'; // Púrpura elegante para Pasajeros
            textColor = 'text-purple-400';
            bgStyle = 'bg-purple-950/70';
            borderStyle = 'border-purple-500/30';
        } else if (!esSolvente) {
            glowColor = 'rgba(244, 63, 94, 0.5)'; // Rojo de alerta transaccional para carteras vencidas
            textColor = 'text-rose-400';
            bgStyle = 'bg-rose-950/70';
            borderStyle = 'border-rose-500/30';
        } else if (role === 'mototaxi') {
            glowColor = 'rgba(234, 179, 8, 0.45)'; // Amarillo para sub-flotas específicas
            textColor = 'text-yellow-400';
            bgStyle = 'bg-yellow-950/70';
            borderStyle = 'border-yellow-500/30';
        }

        return L.divIcon({
            className: 'cimco-premium-marker',
            html: `
                <div class="w-8 h-8 ${bgStyle} backdrop-blur-md border ${borderStyle} rounded-xl flex items-center justify-center transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2"
                     style="box-shadow: 0 0 14px ${glowColor}, inset 0 0 6px ${glowColor};">
                    ${esConductor 
                        ? `<span class="text-[9px] font-mono font-black tracking-tighter ${textColor}">${subrol.substring(0, 3).toUpperCase()}</span>`
                        : `<svg class="w-3.5 h-3.5 ${textColor}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
                    }
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
    };

    return (
        <div className="w-full h-full min-h-[550px] bg-[#0c0c0e]/90 border border-white/5 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl flex flex-col font-mono relative text-zinc-100">
            
            {/* BARRA DE FILTRADO TÁCTICO Y CONTROL DE COMANDO GLASSMORPHISM */}
            <div className="backdrop-blur-md bg-[#121214]/80 border-b border-white/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-[1000] relative">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Shield className="text-cyan-400 animate-pulse shrink-0" size={18} />
                    <div className="flex flex-col">
                        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-200">
                            Central de Telemetría Operativa
                        </h2>
                        <span className="text-[8px] text-zinc-500 font-bold tracking-wider uppercase mt-0.5">
                            TAXIA CIMCO Real-Time Matrix
                        </span>
                    </div>
                </div>

                <div className="relative w-full sm:max-w-xs md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={13} />
                    <input 
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="FILTRAR UNIDAD POR PLACA, NOMBRE O ID..."
                        className="w-full bg-zinc-950/60 border border-white/5 rounded-xl pl-9 pr-4 py-1.5 text-[10px] font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/30 transition-colors uppercase tracking-wider"
                    />
                </div>

                <div className="flex gap-3 items-center shrink-0 w-full sm:w-auto justify-end">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${
                        isConnected ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' : 'bg-rose-950/40 border-rose-500/20 text-rose-400'
                    }`}>
                        <Radio size={11} className={isConnected ? "animate-ping" : ""} />
                        <span>{isConnected ? "Radar Activo" : "Desconectado"}</span>
                    </div>
                    <span className="text-[9px] bg-zinc-900 border border-white/5 px-2.5 py-1 rounded-lg text-zinc-400 font-bold tracking-wider">
                        {unidadesFiltradas.length} CONEXIONES
                    </span>
                </div>
            </div>

            {/* CONTROL DE ALERTAS DE ERROR DEL CANAL GEOESPACIAL */}
            {errorCanal && (
                <div className="absolute top-20 left-4 right-4 z-[1000] backdrop-blur-md bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-3 text-rose-400 text-xs font-bold shadow-lg animate-bounce">
                    <AlertCircle className="shrink-0" size={14} />
                    <span>{errorCanal}</span>
                </div>
            )}

            {/* CONTENEDOR PRINCIPAL DEL MAPA LEAFLET */}
            <div className="flex-1 w-full h-full relative z-10">
                <MapContainer 
                    center={[centroMapa.lat, centroMapa.lng]} 
                    zoom={14} 
                    className="w-full h-full min-h-[480px]"
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    <RecenterMap coords={unidadesFiltradas[0]?.coordenadas ? { lat: unidadesFiltradas[0].coordenadas[0], lng: unidadesFiltradas[0].coordenadas[1] } : null} />

                    {/* MAPEADO REACTIVO DE UNIDADES BAJO PROTECCIÓN TRANSACCIONAL DE MODELO */}
                    {unidadesFiltradas.map((unidad) => {
                        const esSolvente = unidad.saldo >= 2000;
                        
                        // Validación de hardware interna antes de inyectar vectores posicionales en el renderizador
                        if (!unidad.coordenadas || typeof unidad.coordenadas[0] !== 'number' || typeof unidad.coordenadas[1] !== 'number') {
                            return null;
                        }

                        return (
                            <Marker 
                                key={unidad.id} 
                                position={unidad.coordenadas}
                                icon={obtenerIconoUnidadPremium(unidad.role, unidad.subrol, unidad.saldo)}
                            >
                                <Popup className="custom-popup">
                                    <div className="backdrop-blur-md bg-[#121214]/95 border border-white/10 rounded-2xl p-4 shadow-2xl font-mono text-zinc-100 w-64">
                                        <div className="flex justify-between items-start border-b border-white/5 pb-2 mb-2">
                                            <div>
                                                <h4 className="text-xs font-black uppercase text-white truncate max-w-[150px]">
                                                    {unidad.nombre}
                                                </h4>
                                                <span className="text-[8px] px-1.5 py-0.5 bg-zinc-800 border border-white/5 rounded font-bold text-zinc-400 uppercase tracking-wider mt-1 inline-block">
                                                    {unidad.role}
                                                </span>
                                            </div>
                                            {unidad.placa && unidad.placa !== 'N/A' && (
                                                <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 shadow-[0_0_8px_rgba(234,179,8,0.1)]">
                                                    {unidad.placa}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1 text-[10px]">
                                            <p className="text-zinc-400 font-bold flex items-center gap-1">
                                                <Navigation size={10} className="text-cyan-400" /> 
                                                ID: <span className="text-zinc-500 font-mono text-[9px]">{unidad.id.slice(0, 12)}...</span>
                                            </p>
                                            <div>
                                                <span className="text-zinc-500 font-bold">SUBROL:</span> <span className="text-cyan-400 font-black uppercase">{unidad.subrol}</span>
                                            </div>
                                            {unidad.accuracy > 0 && (
                                                <div>
                                                    <span className="text-zinc-500 font-bold">PRECISIÓN:</span> <span className="text-yellow-400 font-black">{Math.round(unidad.accuracy)}m</span>
                                                </div>
                                            )}
                                            {unidad.telefono && (
                                                <p className="text-zinc-400 font-bold">
                                                    CELULAR: <span className="text-zinc-200">{unidad.telefono}</span>
                                                </p>
                                            )}
                                            
                                            {/* 🛡️ INTEGRIDAD FINANCIERA PRESERVADA: El saldo jamás parpadea ni se destruye por ráfagas de WebSocket */}
                                            {unidad.role !== 'pasajero' && (
                                                <p className="text-zinc-400 font-bold flex items-center gap-1.5 mt-1 border-t border-white/5 pt-1.5">
                                                    <Database size={10} className={esSolvente ? "text-emerald-400" : "text-rose-400"} />
                                                    BILLETERA: <span className={`${esSolvente ? 'text-emerald-400' : 'text-rose-400'} font-black font-mono`}>
                                                        ${Number(unidad.saldo).toLocaleString()} COP
                                                    </span>
                                                </p>
                                            )}
                                            
                                            <p className="text-[8px] text-zinc-500 pt-1 border-t border-white/5 mt-1.5 flex items-center justify-between">
                                                <span>LATENCIA RADAR:</span>
                                                <span className="text-zinc-400 font-mono font-bold">
                                                    {unidad.updatedAt ? new Date(unidad.updatedAt).toLocaleTimeString() : 'N/A'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>

                {/* ANIMACIÓN DE ESCANEO DE RED COMPATIBLE CON MÁSCARA DEL MAPA */}
                {loading && (
                    <div className="absolute inset-0 z-[500] backdrop-blur-md bg-[#121214]/60 flex flex-col items-center justify-center gap-2">
                        <Activity className="text-cyan-500 animate-spin" size={24} />
                        <span className="tracking-widest uppercase text-[8px] text-zinc-400 font-black">Escaneando Perímetro de Combate...</span>
                    </div>
                )}

                {/* Capa técnica interna decorativa Glassmorphism */}
                <div className="absolute inset-0 pointer-events-none rounded-3xl border border-white/5 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]" />
            </div>

            {/* INYECCIÓN DE ESTILOS INLINE DE CORRECCIÓN PARA POPUPS COMPLEJOS DE LEAFLET */}
            <style>{`
                .custom-popup .leaflet-popup-content-wrapper { background: transparent; box-shadow: none; padding: 0; }
                .custom-popup .leaflet-popup-tip-container { display: none; }
                .custom-popup .leaflet-popup-content { margin: 0; width: auto !important; }
            `}</style>
        </div>
    );
};

export default MapaOperativo;