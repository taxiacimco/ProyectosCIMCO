// Versión Arquitectura: V20.6 - Consumo de connectionStatus para Telemetría de Socket en Cold Start
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\MapaOperativo.jsx
 * Misión: Renderizado táctico de mapa interactivo con clustering, monitoreo de estado de socket (connectionStatus)
 *         durante cold start y limpieza garantizada de instancias de Leaflet al desmontar en React 18/Vite.
 * UI Standard: CIMCO-UI V9.3 Pure Glassmorphism.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useTelemetryThrottle } from '@/hooks/useTelemetryThrottle';
import { useSocket } from '@/hooks/useSocket';
import { Search, Signal, Activity, AlertCircle, Radio } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { deduplicarEntidades } from '@/utils/deduplicar';

// 🛡️ Inicialización de iconos por defecto de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (rol, saldo = 0) => {
    let color = rol === 'mototaxi' || rol === 'conductor' || rol === 'intermunicipal' ? '#f97316' : '#eab308';
    
    if (typeof saldo === 'number' && saldo < 2000) {
        color = '#ef4444';
    }

    const svgHtml = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="${color}" stroke="#121214" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="3" fill="#ffffff"/>
      </svg>
    `;
    return L.divIcon({
        html: svgHtml,
        className: 'custom-div-icon smooth-marker-transition',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
    });
};

const createCustomClusterIcon = (cluster) => {
    const count = cluster.getChildCount();
    return L.divIcon({
        html: `<div class="custom-cluster-marker"><span>${count}</span></div>`,
        className: 'custom-cluster-wrapper',
        iconSize: L.point(36, 36, true),
    });
};

// ⚡ CONTROLADOR INTERNO DE TAMAÑO Y RECENTRADO
const MapController = ({ center, zoom }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;
        const timer = setTimeout(() => {
            try {
                map.invalidateSize();
                if (Array.isArray(center) && center.length === 2 && center[0] && center[1]) {
                    map.setView(center, zoom || map.getZoom());
                }
            } catch (e) {
                // Silencia re-layouts si el componente se desmontó rápidamente
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [map, center, zoom]);

    return null;
};

const MapaOperativo = ({ cooperativaFiltro = null, coordenadasCentro = [9.715, -73.34], zoom = 13, activeTab = null }) => {
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [errorServicio, setErrorServicio] = useState(null);

    // ⚡ ESTADO DE SOCKET Y CONEXIÓN EN TIEMPO REAL
    const socketContext = useSocket();
    const isConnected = Boolean(socketContext?.isConnected);
    const connectionStatus = socketContext?.connectionStatus || (isConnected ? 'CONNECTED' : 'DISCONNECTED');

    const isMounted = useRef(true);
    // 🛡️ Identificador único por ciclo de vida para aislar completamente el nodo DOM de Leaflet
    const mapUniqueId = useRef(`leaflet-map-${Math.random().toString(36).substring(2, 9)}`).current;

    // 🔥 Telemetría Throttled
    const [vehiculosSuaves, actualizarCoordenadas] = useTelemetryThrottle(2000);
    const actualizarCoordenadasRef = useRef(actualizarCoordenadas);

    useEffect(() => {
        actualizarCoordenadasRef.current = actualizarCoordenadas;
    }, [actualizarCoordenadas]);

    // 🛡️ CONTROL DE CICLO DE VIDA
    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        };
    }, []);

    // ⚡ SINCRONIZACIÓN FIRESTORE
    useEffect(() => {
        setLoading(true);
        const pathUsuarios = FIRESTORE_PATHS?.users || 'usuarios';
        
        const q = query(
            collection(db, pathUsuarios),
            where('isActive', '==', true)
        );

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                if (!isMounted.current) return;

                snapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    const lat = parseFloat(data?.latitud || data?.lat || data?.coords?.latitud || data?.position?.lat || data?.coordenadas?.lat);
                    const lng = parseFloat(data?.longitud || data?.lng || data?.coords?.longitud || data?.position?.lng || data?.coordenadas?.lng);

                    if (cooperativaFiltro) {
                        const coopUnidad = data?.cooperativa || data?.empresa;
                        if (coopUnidad !== cooperativaFiltro) return;
                    }

                    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                        actualizarCoordenadasRef.current(docSnap.id, {
                            id: docSnap.id,
                            nombre: data?.nombre || data?.fullName || 'OPERADOR AD-HOC',
                            rol: (data?.role || data?.rol || 'intermunicipal').toLowerCase().trim(),
                            placa: data?.placa || data?.vehiculo || 'S/P',
                            numeroInterno: data?.numeroInterno || data?.interno || 'S/I',
                            cooperativa: data?.cooperativa || data?.empresa || 'S/C',
                            saldo: Number(data?.saldo ?? data?.wallet?.saldo ?? 0),
                            lat,
                            lng,
                            origenReporte: 'FIRESTORE'
                        });
                    }
                });

                setLoading(false);
            },
            (err) => {
                console.error("❌ [CIMCO-MAPA-FIRESTORE]:", err);
                if (isMounted.current) {
                    setErrorServicio("La sincronización de la malla satelital ha fallado temporalmente.");
                    setLoading(false);
                }
            }
        );

        return () => unsubscribe();
    }, [cooperativaFiltro]);

    // ⚡ FILTRADO Y DEDUPLICACIÓN
    const conductoresDeduplicados = useMemo(() => {
        const listaMarcadoresSuaves = Object.values(vehiculosSuaves || {});
        const queryTerm = busqueda.toLowerCase().trim();

        const filtrados = queryTerm 
            ? listaMarcadoresSuaves.filter(m => {
                const nombre = (m?.nombre || '').toLowerCase();
                const id = (m?.id || '').toLowerCase();
                const rol = (m?.rol || '').toLowerCase();
                const placa = (m?.placa || '').toLowerCase();
                const numInterno = (m?.numeroInterno || '').toLowerCase();
                return nombre.includes(queryTerm) || id.includes(queryTerm) || rol.includes(queryTerm) || placa.includes(queryTerm) || numInterno.includes(queryTerm);
            })
            : listaMarcadoresSuaves;

        return typeof deduplicarEntidades === 'function' 
            ? deduplicarEntidades(filtrados)
            : filtrados;
    }, [vehiculosSuaves, busqueda]);

    const usarCanvas = conductoresDeduplicados.length > 50;
    const centroValidado = Array.isArray(coordenadasCentro) && coordenadasCentro.length === 2 ? coordenadasCentro : [9.715, -73.34];

    return (
        <div className="w-full flex flex-col gap-4 font-mono antialiased text-zinc-100">
            {/* PANEL RECEPTOR TÁCTICO */}
            <div className="w-full backdrop-blur-md bg-zinc-950/40 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="BUSCAR POR PLACA, INTERNO O NOMBRE..."
                        className="w-full bg-[#0c0c0e] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/30 transition-colors uppercase tracking-wider"
                    />
                </div>
                <div className="flex gap-3 items-center shrink-0 flex-wrap md:flex-nowrap">
                    {/* INDICADOR DE ESTADO SOCKET REALTIME / COLD START */}
                    <span className="text-[10px] bg-zinc-950/60 border border-white/5 px-3 py-1.5 rounded-lg text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Signal className={isConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'} size={12} />
                        Socket: <span className={isConnected ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>{connectionStatus}</span>
                    </span>

                    <span className="text-[10px] bg-zinc-950/60 border border-white/5 px-3 py-1.5 rounded-lg text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Radio className="text-orange-400 animate-pulse" size={12} />
                        Malla Activa: <span className="text-orange-400">{conductoresDeduplicados.length}</span> Unidades en Mapa
                        {usarCanvas && (
                            <span className="ml-1 text-[8px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded font-black">
                                CANVAS HIGH-DENSITY
                            </span>
                        )}
                    </span>
                </div>
            </div>

            {/* MÁSCARA Y MAPA DE INTERFAZ */}
            <div className="w-full h-[400px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative bg-zinc-950 z-10">
                {errorServicio && (
                    <div className="absolute top-4 left-4 right-4 z-[1000] backdrop-blur-md bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2.5">
                        <AlertCircle className="text-rose-400 shrink-0" size={16} />
                        <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wide">{errorServicio}</span>
                    </div>
                )}

                <MapContainer 
                    key={mapUniqueId}
                    center={centroValidado} 
                    zoom={zoom} 
                    zoomControl={false}
                    preferCanvas={usarCanvas}
                    className="w-full h-full"
                >
                    <MapController center={centroValidado} zoom={zoom} />

                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    <MarkerClusterGroup
                        chunkedLoading
                        iconCreateFunction={createCustomClusterIcon}
                        maxClusterRadius={45}
                        spiderfyOnMaxZoom={true}
                        showCoverageOnHover={false}
                    >
                        {conductoresDeduplicados.map((m, index) => {
                            const keyMarker = m?._reactKey || m?.id || m?.placa || m?.numeroInterno || `marker-${index}`;
                            const lat = m?.lat;
                            const lng = m?.lng;
                            const saldo = m?.saldo ?? 0;
                            const estadoOperativo = saldo >= 2000 ? 'En Regla' : 'Saldo Insuficiente';

                            if (!lat || !lng) return null;

                            return (
                                <Marker 
                                    key={keyMarker}
                                    position={[lat, lng]} 
                                    icon={createCustomIcon(m?.rol, saldo)}
                                >
                                    <Popup className="custom-popup">
                                        <div className="w-60 backdrop-blur-md bg-[#121214]/95 border border-white/10 rounded-2xl p-4 shadow-2xl font-mono text-zinc-100">
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                                <Radio className="text-orange-400 animate-pulse" size={14} />
                                                <span className="text-[9px] uppercase tracking-widest font-black text-orange-400">
                                                    TELEMETRÍA GPS ACTIVA
                                                </span>
                                            </div>

                                            <p className="text-xs font-black text-white uppercase truncate">{m?.nombre || 'UNIDAD DESCONOCIDA'}</p>
                                            <p className="text-[9px] text-zinc-500 mt-0.5 truncate font-mono">ID: {m?.id || 'N/A'}</p>

                                            <div className="mt-3 space-y-1.5 text-[9px] uppercase tracking-tight">
                                                <div className="flex justify-between items-center bg-zinc-950/60 p-1.5 rounded-lg border border-white/5">
                                                    <span className="text-zinc-500">PLACA / INTERNO:</span>
                                                    <span className="text-white font-bold">{m?.placa || 'S/P'} / Int. {m?.numeroInterno || 'S/I'}</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-zinc-950/60 p-1.5 rounded-lg border border-white/5">
                                                    <span className="text-zinc-500">SALDO ACTUAL:</span>
                                                    <span className={`font-bold ${saldo >= 2000 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        ${saldo.toLocaleString('es-CO')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center bg-zinc-950/60 p-1.5 rounded-lg border border-white/5">
                                                    <span className="text-zinc-500">ESTADO OPERATIVO:</span>
                                                    <span className={`font-bold ${saldo >= 2000 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {estadoOperativo}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center bg-zinc-950/60 p-1.5 rounded-lg border border-white/5">
                                                    <span className="text-zinc-500">ORIGEN FEED:</span>
                                                    <span className="text-emerald-400 font-bold">
                                                        {m?.origenReporte || 'S/O'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center bg-zinc-950/60 p-1.5 rounded-lg border border-white/5">
                                                    <span className="text-zinc-500">COOPERATIVA:</span>
                                                    <span className="text-orange-400 font-bold">{m?.cooperativa || 'S/C'}</span>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                                                <span className="text-[8px] text-zinc-500 uppercase">Coordenadas:</span>
                                                <span className="text-[8px] text-zinc-400 font-mono font-bold">
                                                    {lat.toFixed(5)}, {lng.toFixed(5)}
                                                </span>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MarkerClusterGroup>
                </MapContainer>

                {loading && (
                    <div className="absolute inset-0 z-[500] backdrop-blur-md bg-[#121214]/60 flex flex-col items-center justify-center gap-2">
                        <Activity className="text-orange-500 animate-spin" size={24} />
                        <span className="tracking-widest uppercase text-[8px] text-zinc-400 font-black">Sincronizando coordenadas satelitales...</span>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">
                            Canal Socket: <span className={isConnected ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{connectionStatus}</span>
                        </span>
                    </div>
                )}

                <div className="absolute inset-0 pointer-events-none rounded-3xl border border-white/5 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]" />
            </div>

            <style>{`
                .custom-popup .leaflet-popup-content-wrapper { background: transparent; box-shadow: none; padding: 0; z-index: 2000; }
                .custom-popup .leaflet-popup-tip-container { display: none; }
                .custom-popup .leaflet-popup-content { margin: 0; width: auto !important; }
                
                .smooth-marker-transition {
                    transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
                }

                .custom-cluster-wrapper {
                    background: transparent;
                }
                .custom-cluster-marker {
                    width: 36px;
                    height: 36px;
                    background: rgba(18, 18, 20, 0.85);
                    backdrop-filter: blur(8px);
                    border: 1.5px solid rgba(249, 115, 22, 0.6);
                    box-shadow: 0 0 15px rgba(249, 115, 22, 0.3);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #f97316;
                    font-family: monospace;
                    font-weight: 900;
                    font-size: 11px;
                    text-align: center;
                    line-height: 34px;
                }
                .custom-cluster-marker:hover {
                    border-color: #f97316;
                    transform: scale(1.08);
                    transition: transform 0.2s ease;
                }
            `}</style>
        </div>
    );
};

export default MapaOperativo;