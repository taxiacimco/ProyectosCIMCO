// Versión Arquitectura: V2.4 - Acoplamiento de Telemetría Real-Time y Blindaje de Coordenadas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\MapaOperativo.jsx
 * Misión: Capturar e indexar ráfagas GPS sobre La Jagua de Ibirico en tiempo real.
 * Blindaje: Normalización híbrida de coordenadas (lat/latitude/latitud) para evitar descartes en Leaflet.
 */

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Activity, AlertCircle } from 'lucide-react';

// 🛡️ Reparación de Assets de Leaflet para entornos empaquetados por Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icono personalizado de pulso táctico para la flota activa CIMCO
const iconoFlota = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

const MapaOperativo = () => {
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pathError, setPathError] = useState(false);

    useEffect(() => {
        // 🛡️ Resolución polimórfica de la colección (Sincronización con la Regla 2 de firestore.rules)
        const coleccionDestino = FIRESTORE_PATHS?.viajes || FIRESTORE_PATHS?.rides || 'viajes';
        
        console.log(`📡 [CIMCO-RADAR] Enlazando receptor síncrono en nodo: /${coleccionDestino}`);
        
        const q = query(collection(db, coleccionDestino));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const telemetriaMapeada = snapshot.docs.map(doc => {
                const data = doc.data();

                // 🛡️ BLINDAJE ANTI-UNDEFINED DE COORDENADAS HÍBRIDAS
                // Extrae latitud y longitud sin importar si el backend responde en inglés, español o sub-objeto
                let lat = data?.latitud ?? data?.latitude ?? data?.coords?.latitude;
                let lng = data?.longitud ?? data?.longitude ?? data?.coords?.longitude;

                // Si viene empaquetado como objeto GeoPoint de Firebase nativo
                if (data?.posicion?.latitude !== undefined) {
                    lat = data.posicion.latitude;
                    lng = data.posicion.longitude;
                }

                // Forzar parseo numérico estricto
                const latNum = parseFloat(lat);
                const lngNum = parseFloat(lng);

                // Descartar registros corruptos que harían colapsar a Leaflet
                if (isNaN(latNum) || isNaN(lngNum)) {
                    return null;
                }

                return {
                    id: doc.id,
                    ...data,
                    latitud: latNum,
                    longitud: lngNum,
                    tarifa: data?.tarifa || data?.price || 0,
                    status: data?.status || data?.estado || 'EN RUTA'
                };
            }).filter(v => v !== null); // Purga atómica de nodos vacíos

            setViajes(telemetriaMapeada);
            setLoading(false);
            setPathError(false);
        }, (error) => {
            console.error("🚨 [CIMCO-RADAR-FATAL] Tráfico interrumpido por políticas de seguridad:", error.message);
            setPathError(true);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="h-[500px] w-full rounded-xl border border-white/5 bg-[#121214]/80 backdrop-blur-md flex flex-col items-center justify-center text-zinc-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mb-2"></div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/80 animate-pulse">Sincronizando Radar de Flota...</p>
            </div>
        );
    }

    if (pathError) {
        return (
            <div className="h-[500px] w-full rounded-xl border border-red-500/10 bg-[#121214]/80 backdrop-blur-md flex flex-col items-center justify-center text-red-400 p-4 text-center">
                <AlertCircle className="text-red-500 mb-2 animate-bounce" size={32} />
                <p className="font-mono text-xs uppercase font-bold tracking-widest">Error de Sincronización Táctica</p>
                <p className="text-zinc-500 font-mono text-[10px] mt-2 max-w-xs">El radar no posee los permisos de lectura de telemetría en Firestore.</p>
            </div>
        );
    }

    return (
        <div className="h-[500px] w-full rounded-xl overflow-hidden border border-white/5 bg-[#121214]/80 backdrop-blur-md relative group">
            {/* Indicador Flotante de Telemetría Activa */}
            <div className="absolute top-3 right-3 z-[1000] bg-black/70 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-lg flex items-center gap-2 pointer-events-none">
                <Activity size={12} className="text-green-400 animate-pulse" />
                <span className="font-mono text-[9px] text-zinc-300 uppercase tracking-widest">
                    Flota en Radar: {viajes.length} Unidades
                </span>
            </div>

            <MapContainer 
                center={[9.5539, -73.3551]} // Anclaje Geoespacial: La Jagua de Ibirico
                zoom={14} 
                className="h-full w-full z-0"
                zoomControl={true}
            >
                <TileLayer 
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; CIMCO Logistics'
                />
                
                {viajes.map((viaje) => (
                    <Marker 
                        key={viaje.id} 
                        position={[viaje.latitud, viaje.longitud]}
                        icon={iconoFlota}
                    >
                        <Popup className="custom-popup">
                            <div className="text-[10px] space-y-1.5 p-1 font-mono text-zinc-200">
                                <div className="flex justify-between items-center border-b border-white/10 pb-1 gap-4">
                                    <span className="font-bold text-white">ID: {viaje.id.substring(0, 6)}</span>
                                    <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-[8px] font-black tracking-widest">
                                        {viaje.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-zinc-400">Tarifa Compilada:</p>
                                    <p className="text-emerald-400 text-xs font-bold font-sans">${Number(viaje.tarifa).toLocaleString()}</p>
                                </div>
                                <div className="text-[8px] text-zinc-500 pt-1 border-t border-white/5">
                                    COORD: {viaje.latitud.toFixed(4)}, {viaje.longitud.toFixed(4)}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapaOperativo;