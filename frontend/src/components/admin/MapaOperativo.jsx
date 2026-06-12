// Versión Arquitectura: V2.1 - Radar de Viajes Concurrente (Blindaje de Telemetría)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\MapaOperativo.jsx
 * Misión: Mapeo de ráfagas de viajes en tiempo real sobre La Jagua de Ibirico.
 * Integridad: Blindaje Anti-Undefined y normalización de coordenadas Firestore.
 */

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Activity, AlertCircle } from 'lucide-react';

// Saneamiento de iconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapaOperativo = () => {
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 🛡️ Uso estricto de FIRESTORE_PATHS
        const q = query(collection(db, FIRESTORE_PATHS.viajes));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // 🛡️ Filtro Anti-Undefined: Solo incluir viajes con coordenadas válidas
            const validViajes = data.filter(v => v.latitud && v.longitud);
            setViajes(validViajes);
            setLoading(false);
        }, (err) => {
            console.error("❌ [CIMCO-MAP-FATAL] Error de telemetría:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) return <div className="p-8 text-cyan-400 font-mono text-xs">📡 CALIBRANDO RADAR...</div>;

    return (
        <div className="h-[500px] w-full rounded-xl overflow-hidden border border-white/5 glass-panel">
            <MapContainer center={[9.5539, -73.3551]} zoom={14} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {viajes.map((viaje) => (
                    <Marker key={viaje.id} position={[viaje.latitud, viaje.longitud]}>
                        <Popup className="custom-popup">
                            <div className="text-[10px] space-y-2">
                                <p className="font-bold text-zinc-200">ID: {viaje.id.substring(0, 8)}</p>
                                <p className="text-emerald-400">$ {viaje.tarifa || 0}</p>
                                <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-400">{viaje.estado}</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapaOperativo;