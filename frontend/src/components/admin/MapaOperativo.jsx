// Versión Arquitectura: V19.6 - Integración Táctica de Control de Saldo Operativo y Estado de Marcadores
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\MapaOperativo.jsx
 * Misión: Renderizado táctico de mapa interactivo con clustering, telemetría throttled, prevención 
 *         de colisiones de contenedor en React 18 / React-Leaflet, recalibración de tiles (invalidateSize) 
 *         y evaluación de saldo operativo para inhabilitación visual de marcadores.
 * UI Standard: CIMCO-UI V9.3 Pure Glassmorphism.
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useTelemetryThrottle } from '@/hooks/useTelemetryThrottle';
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
    
    // Inhabilitación visual si el saldo es menor a $2000
    if (typeof saldo === 'number' && saldo < 2000) {
        color = '#ef4444'; // Color rojo/gris de inhabilitado por saldo insuficiente
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

// 🛡️ Capturador de Referencia del Mapa sin interferir en el desmontaje nativo de React-Leaflet
const MapReferenceBinder = ({ onMapReady }) => {
    const map = useMap();

    useEffect(() => {
        if (onMapReady) {
            onMapReady(map);
        }
        const timer = setTimeout(() => {
            if (map) {
                map.invalidateSize();
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [map, onMapReady]);

    return null;
};

const MapaOperativo = ({ cooperativaFiltro = null, coordenadasCentro = [9.715, -73.34], zoom = 13, activeTab = null }) => {
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [errorServicio, setErrorServicio] = useState(null);
    const isMounted = useRef(true);
    const mapInstanceRef = useRef(null);

    // 🔥 Amortiguador Térmico (Throttled GPS Telemetry)
    const [vehiculosSuaves, actualizarCoordenadas] = useTelemetryThrottle(2000);
    const actualizarCoordenadasRef = useRef(actualizarCoordenadas);

    useEffect(() => {
        actualizarCoordenadasRef.current = actualizarCoordenadas;
    }, [actualizarCoordenadas]);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            mapInstanceRef.current = null;
        };
    }, []);

    // 🚀 RECALIBRACIÓN TÁCTICA DEL LIENZO: Asegura el ajuste correcto de mosaicos al conmutar pestaña o redimensionar
    useEffect(() => {
        if (mapInstanceRef.current) {
            const timer = setTimeout(() => {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.invalidateSize();
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [activeTab]);

    // Sincronización Firestore en Tiempo Real
    useEffect(() => {
        setLoading(true);
        const pathUsuarios = FIRESTORE_PATHS?.users || 'usuarios';
        const q = query(collection(db, pathUsuarios));

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

    const listaMarcadoresSuaves = Object.values(vehiculosSuaves);
    const marcadoresUnicos = typeof deduplicarEntidades === 'function' 
        ? deduplicarEntidades(listaMarcadoresSuaves)
        : listaMarcadoresSuaves;

    const filtrados = marcadoresUnicos.filter(m => {
        const queryTerm = busqueda.toLowerCase().trim();
        const nombre = (m?.nombre || '').toLowerCase();
        const id = (m?.id || '').toLowerCase();
        const rol = (m?.rol || '').toLowerCase();
        const placa = (m?.placa || '').toLowerCase();
        const numInterno = (m?.numeroInterno || '').toLowerCase();
        return nombre.includes(queryTerm) || id.includes(queryTerm) || rol.includes(queryTerm) || placa.includes(queryTerm) || numInterno.includes(queryTerm);
    });

    const usarCanvas = filtrados.length > 50;

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
                <div className="flex gap-4 items-center shrink-0">
                    <span className="text-[10px] bg-zinc-950/60 border border-white/5 px-3 py-1.5 rounded-lg text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Signal className="text-orange-400 animate-pulse" size={12} />
                        Malla Activa: <span className="text-orange-400">{filtrados.length}</span> Unidades en Mapa
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
                    center={coordenadasCentro} 
                    zoom={zoom} 
                    zoomControl={false}
                    preferCanvas={usarCanvas}
                    className="w-full h-full"
                >
                    <MapReferenceBinder onMapReady={(map) => { mapInstanceRef.current = map; }} />

                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />

                    <MarkerClusterGroup
                        chunkedLoading
                        iconCreateFunction={createCustomClusterIcon}
                        maxClusterRadius={45}
                        spiderfyOnMaxZoom={true}
                        showCoverageOnHover={false}
                    >
                        {filtrados.map((m, index) => {
                            const keyMarker = m?.id || m?.placa || m?.numeroInterno || `marker-${index}`;
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