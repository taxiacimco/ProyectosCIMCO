// Versión Arquitectura: V11.2 - PROD READY: Motor de Telemetría Intermunicipal con Sincronización en Tiempo Real
import React, { useState, useEffect } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Bus, MapPin, Navigation, Clock, CheckCircle } from 'lucide-react';

// Corrección de Iconos Leaflet para despliegue intermunicipal
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

// Componente para centrado dinámico del mapa
const AutoCenter = ({ position }) => {
    const map = useMap();
    useEffect(() => { if (position) map.setView(position, 13); }, [position, map]);
    return null;
};

const HomeIntermunicipal = () => {
    const { user } = useAuth();
    const [viajesAsignados, setViajesAsignados] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 📡 ESTADOS DE TELEMETRÍA
    const [posicionActual, setPosicionActual] = useState([7.4, -73.6]);
    const [gpsActivo, setGpsActivo] = useState(false);

    // 🛰️ MOTOR DE RASTREO (Adaptación para larga distancia)
    useEffect(() => {
        if (!user?.uid) return;
    
        const watchId = navigator.geolocation.watchPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setPosicionActual([lat, lng]);
                setGpsActivo(true);
    
                try {
                    const conductorRef = doc(db, FIRESTORE_PATHS.usuarios || 'usuarios', user.uid);
                    await updateDoc(conductorRef, {
                        location: { latitude: lat, longitude: lng },
                        ultimaConexion: serverTimestamp(),
                        estadoRadar: 'INTERMUNICIPAL_ACTIVE'
                    });
    
                    // Sincronización con el viaje activo (viajesAsignados[0])
                    const viajeActivo = viajesAsignados[0];
                    if (viajeActivo?.id) {
                        const viajeRef = doc(db, FIRESTORE_PATHS.viajesIntermunicipales || 'viajes_intermunicipales', viajeActivo.id);
                        await updateDoc(viajeRef, {
                            "conductorLocation.latitude": lat,
                            "conductorLocation.longitude": lng
                        });
                    }
                } catch (err) {
                    console.error("❌ Falla de sincronización telemetría intermunicipal:", err);
                }
            },
            (err) => {
                console.error("⚠️ Señal GPS perdida:", err);
                setGpsActivo(false);
            },
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 5000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, [user, viajesAsignados]);

    useEffect(() => {
        if (!user?.uid) return;

        const pathColeccion = FIRESTORE_PATHS.viajesIntermunicipales || 'viajes_intermunicipales';
        const q = query(
            collection(db, pathColeccion),
            where('conductorId', '==', user.uid),
            where('estado', '==', 'ASIGNADO')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            setViajesAsignados(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    const confirmarViaje = async (id) => {
        try {
            const viajeRef = doc(db, FIRESTORE_PATHS.viajesIntermunicipales || 'viajes_intermunicipales', id);
            await updateDoc(viajeRef, { estado: 'EN_RUTA', inicioOperativo: serverTimestamp() });
        } catch (err) {
            console.error("Error al confirmar salida:", err);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-mono">
            <div className="h-64 w-full relative">
                <MapContainer center={posicionActual} zoom={13} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <AutoCenter position={posicionActual} />
                    <Marker position={posicionActual} icon={DefaultIcon} />
                </MapContainer>
                <div className="absolute top-4 right-4 z-[1000] backdrop-blur-md bg-[#121214]/80 px-3 py-1 rounded-full border border-white/5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${gpsActivo ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    {gpsActivo ? 'Seguimiento Activo' : 'GPS Offline'}
                </div>
            </div>

            <div className="p-6">
                <h1 className="text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <Bus className="text-yellow-500" /> Operación Intermunicipal
                </h1>

                <div className="space-y-4">
                    {viajesAsignados.length === 0 ? (
                        <div className="backdrop-blur-md bg-[#121214]/80 p-8 text-center border border-dashed border-white/5 rounded-2xl">
                            <p className="text-xs uppercase text-zinc-500 tracking-widest">Sin rutas asignadas actualmente</p>
                        </div>
                    ) : (
                        viajesAsignados.map(viaje => (
                            <div key={viaje.id} className="backdrop-blur-md bg-[#121214]/80 border border-white/5 p-5 rounded-2xl shadow-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Destino Final</p>
                                        <p className="text-sm font-black text-white flex items-center gap-2">
                                            <MapPin size={14} className="text-yellow-500 shrink-0" /> {viaje.destino || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Tarifa Base</p>
                                        <p className="text-sm font-black text-emerald-400">${(viaje.tarifa || 0).toLocaleString()} COP</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => confirmarViaje(viaje.id)}
                                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <CheckCircle size={16} /> Confirmar Salida
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomeIntermunicipal;