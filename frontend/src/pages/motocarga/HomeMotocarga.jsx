// Versión Arquitectura: V11.2 - PROD READY: Motor Telemetría Atómica con Sincronización Firestore en Motocarga
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 🛡️ FIX PARA ICONOS DE LEAFLET
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
const MotocargaIcon = L.icon({ iconUrl: '/assets/motocarga-192.png', iconSize: [48, 48], iconAnchor: [24, 48] });

function RadarView({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, 15);
    }, [center, map]);
    return null;
}

const HomeMotocarga = ({ profile }) => {
    const { user } = useAuth();
    const [position, setPosition] = useState([7.4, -73.6]);
    const [gpsActivo, setGpsActivo] = useState(false);
    const [viajeActivo, setViajeActivo] = useState(null);
    const [fletesDisponibles, setFletesDisponibles] = useState([]);
    
    const FEE = 500;

    // 🛰️ MOTOR DE RASTREO EN TIEMPO REAL (RADAR ACTUALIZADO)
    useEffect(() => {
        if (!user?.uid) return;
    
        const watchId = navigator.geolocation.watchPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setPosition([lat, lng]); 
                setGpsActivo(true);
    
                try {
                    // Actualización del perfil en el Radar central
                    const conductorRef = doc(db, FIRESTORE_PATHS.usuarios || 'usuarios', user.uid);
                    await updateDoc(conductorRef, {
                        location: { latitude: lat, longitude: lng },
                        updatedAt: serverTimestamp()
                    });
    
                    // Transmisión de ubicación al flete/viaje activo
                    if (viajeActivo?.id) {
                        const viajeRef = doc(db, FIRESTORE_PATHS.viajes, viajeActivo.id);
                        await updateDoc(viajeRef, {
                            conductorLocation: { latitude: lat, longitude: lng }
                        });
                    }
                } catch (error) {
                    console.error("❌ Error inyectando coordenadas de motocarga:", error);
                }
            },
            (err) => {
                console.error("Error GPS:", err);
                setGpsActivo(false);
            },
            { enableHighAccuracy: true, maximumAge: 5000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, [user, viajeActivo]);

    // 📡 Listener de Fletes Disponibles
    useEffect(() => {
        const q = query(collection(db, FIRESTORE_PATHS.viajes), where("estado", "==", "pendiente"));
        const unsub = onSnapshot(q, (snapshot) => {
            setFletesDisponibles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    const aceptarFlete = async (flete) => {
        try {
            await updateDoc(doc(db, FIRESTORE_PATHS.viajes, flete.id), {
                estado: 'asignado',
                conductorId: user.uid,
                asignadoEn: serverTimestamp()
            });
            setViajeActivo(flete);
        } catch (err) {
            console.error("Fallo al aceptar flete:", err);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-mono">
            <div className="h-screen w-full relative">
                <MapContainer center={position} zoom={15} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <RadarView center={position} />
                    <Marker position={position} icon={MotocargaIcon} />
                </MapContainer>
            </div>

            <div className="fixed bottom-0 left-0 w-full backdrop-blur-md bg-[#121214]/90 p-6 border-t border-white/5 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-white font-black uppercase tracking-widest text-sm">Centro de Fletes</h2>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${gpsActivo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {gpsActivo ? 'Radar Conectado' : 'Sin Señal GPS'}
                    </div>
                </div>
                
                {!viajeActivo && fletesDisponibles.length > 0 ? fletesDisponibles.map(flete => (
                    <div key={flete.id} className="bg-[#121214]/60 p-4 rounded-2xl border border-white/5 flex justify-between items-center hover:border-white/10 transition-all">
                        <div>
                            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Tarifa Ofertada</p>
                            <p className="text-white font-black text-lg">${(flete.pago?.tarifaOfertada || 0).toLocaleString()}</p>
                        </div>
                        <button 
                            onClick={() => aceptarFlete(flete)} 
                            className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-6 py-3 font-black text-xs uppercase rounded-xl hover:bg-amber-500/30 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        >
                            Capturar Carga
                        </button>
                    </div>
                )) : (
                    <p className="text-zinc-600 text-center text-xs uppercase font-bold py-4">Esperando carga disponible...</p>
                )}
            </div>
        </div>
    );
};

export default HomeMotocarga;