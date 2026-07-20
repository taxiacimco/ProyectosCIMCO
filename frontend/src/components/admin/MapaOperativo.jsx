// Versión Arquitectura: V17.2 - Optimización Multi-Tenant Estricta y Blindaje de Ciclos de Efecto
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\MapaOperativo.jsx
 * Misión: Despliegue táctico y renderizado de unidades mediante Leaflet.js enganchado a un amortiguador de alta frecuencia.
 * Ajuste V17.2: Corrección estricta en la guarda Multi-Tenant de WebSockets y estabilización de dependencias de efectos.
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useSocket } from '@/hooks/SocketContext';
import { useTelemetryThrottle } from '@/hooks/useTelemetryThrottle';
import { Search, Signal, Activity, AlertCircle, Radio } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 🛡️ Inicialización blindada y segura de marcadores para compatibilidad total en producción
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (rol) => {
    const color = rol === 'mototaxi' || rol === 'conductor' || rol === 'intermunicipal' ? '#f97316' : '#eab308';
    const svgHtml = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="${color}" stroke="#121214" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="3" fill="#ffffff"/>
      </svg>
    `;
    return L.divIcon({
        html: svgHtml,
        className: 'custom-div-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
    });
};

const MapaOperativo = ({ cooperativaFiltro = null }) => {
    const { socket } = useSocket();
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [errorServicio, setErrorServicio] = useState(null);
    const isMounted = useRef(true);

    // 🔥 Consola del Amortiguador Térmico (Delay configurado a 1500ms para liberar carga del procesador de renderizado)
    const [vehiculosSuaves, actualizarCoordenadas] = useTelemetryThrottle(1500);
    
    // Guardamos la función en una referencia mutable para evitar re-suscripciones a los canales si cambia por falta de useCallback
    const actualizarCoordenadasRef = useRef(actualizarCoordenadas);
    
    useEffect(() => {
        actualizarCoordenadasRef.current = actualizarCoordenadas;
    }, [actualizarCoordenadas]);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // CANAL 1: Sincronización en tiempo real desde Firestore (Persistencia y Estados Base)
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

                    // 🏢 REGLA MULTI-TENANT: Si hay un filtro de cooperativa activo, descartamos unidades de otras empresas
                    if (cooperativaFiltro) {
                        const coopUnidad = data?.cooperativa || data?.empresa;
                        if (coopUnidad !== cooperativaFiltro) return;
                    }

                    // 🛡️ Filtro matemático estricto de geolocalización válida
                    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                        actualizarCoordenadasRef.current(docSnap.id, {
                            id: docSnap.id,
                            nombre: data?.nombre || data?.fullName || 'OPERADOR AD-HOC',
                            rol: (data?.role || data?.rol || 'intermunicipal').toLowerCase().trim(),
                            placa: data?.placa || data?.vehiculo || 'S/P',
                            numeroInterno: data?.numeroInterno || data?.interno || 'S/I',
                            cooperativa: data?.cooperativa || data?.empresa || 'S/C',
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

    // CANAL 2: Telemetría por WebSockets en caliente (Redirección Inmediata al Amortiguador)
    useEffect(() => {
        if (!socket) return;

        const handleTelemetria = (data) => {
            if (!isMounted.current || !data) return;
            const conductorId = data?.conductorId || data?.id || data?.usuarioId;
            const lat = parseFloat(data?.latitud || data?.lat || data?.position?.lat || data?.coordenadas?.lat);
            const lng = parseFloat(data?.longitud || data?.lng || data?.position?.lng || data?.coordenadas?.lng);

            if (!conductorId || isNaN(lat) || isNaN(lng)) return;

            // 🏢 REGLA MULTI-TENANT OPTIMIZADA: Saneamiento estricto bajo contexto de cooperativa
            // Si la trama WS no trae la cooperativa, verificamos en nuestro estado guardado si corresponde a la autorizada
            const unidadExistente = vehiculosSuaves[conductorId];
            const coopUnidad = data?.cooperativa || data?.empresa || unidadExistente?.cooperativa;

            if (cooperativaFiltro && coopUnidad && coopUnidad !== cooperativaFiltro) {
                return;
            }

            actualizarCoordenadasRef.current(conductorId, {
                id: conductorId,
                nombre: data?.nombre || data?.fullName || unidadExistente?.nombre || 'UNIDAD ACTIVA',
                rol: (data?.rol || data?.role || unidadExistente?.rol || 'intermunicipal').toLowerCase().trim(),
                placa: data?.placa || data?.vehiculo || unidadExistente?.placa || 'S/P',
                numeroInterno: data?.numeroInterno || data?.interno || unidadExistente?.numeroInterno || 'S/I',
                cooperativa: coopUnidad || cooperativaFiltro || 'S/C',
                lat,
                lng,
                origenReporte: 'TELEMETRIA_WS'
            });
        };

        socket.on('telemetria_central_radar', handleTelemetria);

        return () => {
            socket.off('telemetria_central_radar', handleTelemetria);
        };
    // Añadimos vehiculosSuaves a las dependencias para que el validador multi-tenant tenga la información más fresca en tiempo real
    }, [socket, cooperativaFiltro, vehiculosSuaves]);

    // Conversión a matriz limpia y saneamiento del buscador predictivo sobre la telemetría suavizada
    const listaMarcadoresSuaves = Object.values(vehiculosSuaves);

    const filtrados = listaMarcadoresSuaves.filter(m => {
        const queryTerm = busqueda.toLowerCase().trim();
        const nombre = (m.nombre || '').toLowerCase();
        const id = (m.id || '').toLowerCase();
        const rol = (m.rol || '').toLowerCase();
        const placa = (m.placa || '').toLowerCase();
        const numInterno = (m.numeroInterno || '').toLowerCase();
        return nombre.includes(queryTerm) || id.includes(queryTerm) || rol.includes(queryTerm) || placa.includes(queryTerm) || numInterno.includes(queryTerm);
    });

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
                    center={[9.715, -73.34]} 
                    zoom={13} 
                    zoomControl={false}
                    className="w-full h-full"
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />

                    {filtrados.map((m) => {
                        const keyMarker = m.id || `marker-throt-${Math.random()}`;

                        return (
                            <Marker 
                                key={keyMarker}
                                position={[m.lat, m.lng]} 
                                icon={createCustomIcon(m.rol)}
                            >
                                <Popup className="custom-popup">
                                    <div className="w-60 backdrop-blur-md bg-[#121214]/95 border border-white/10 rounded-2xl p-4 shadow-2xl font-mono text-zinc-100">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                            <Radio className="text-orange-400 animate-pulse" size={14} />
                                            <span className="text-[9px] uppercase tracking-widest font-black text-orange-400">
                                                TELEMETRÍA GPS ACTIVA
                                            </span>
                                        </div>

                                        <p className="text-xs font-black text-white uppercase truncate">{m.nombre}</p>
                                        <p className="text-[9px] text-zinc-500 mt-0.5 truncate font-mono">ID: {m.id}</p>

                                        <div className="mt-3 space-y-1.5 text-[9px] uppercase tracking-tight">
                                            <div className="flex justify-between items-center bg-zinc-950/60 p-1.5 rounded-lg border border-white/5">
                                                <span className="text-zinc-500">PLACA / INTERNO:</span>
                                                <span className="text-white font-bold">{m.placa} / Int. {m.numeroInterno}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-zinc-950/60 p-1.5 rounded-lg border border-white/5">
                                                <span className="text-zinc-500">ORIGEN FEED:</span>
                                                <span className={`font-bold ${m.origenReporte === 'TELEMETRIA_WS' ? 'text-emerald-400' : 'text-yellow-500'}`}>
                                                    {m.origenReporte}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center bg-zinc-950/60 p-1.5 rounded-lg border border-white/5">
                                                <span className="text-zinc-500">COOPERATIVA:</span>
                                                <span className="text-orange-400 font-bold">{m.cooperativa}</span>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[8px] text-zinc-500 uppercase">Coordenadas:</span>
                                            <span className="text-[8px] text-zinc-400 font-mono font-bold">
                                                {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                                            </span>
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
                        <Activity className="text-orange-500 animate-spin" size={24} />
                        <span className="tracking-widest uppercase text-[8px] text-zinc-400 font-black">Sincronizando coordenadas satelitales...</span>
                    </div>
                )}

                {/* Capa técnica interna decorativa Glassmorphism */}
                <div className="absolute inset-0 pointer-events-none rounded-3xl border border-white/5 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]" />
            </div>

            <style>{`
                .custom-popup .leaflet-popup-content-wrapper { background: transparent; box-shadow: none; padding: 0; z-index: 2000; }
                .custom-popup .leaflet-popup-tip-container { display: none; }
                .custom-popup .leaflet-popup-content { margin: 0; width: auto !important; }
            `}</style>
        </div>
    );
};

export default MapaOperativo;