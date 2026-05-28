// Versión Arquitectura: V10.0 - Corrección de Estructura de Marcadores y Blindaje JSX
/**
 * Ubicación: frontend/src/pages/pasajero/HomePasajero.jsx
 */

import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase'; 
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const iconConductor = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png',
    iconSize: [32, 32]
});

const HomePasajero = () => {
    const { user } = useAuth();
    const [conductores, setConductores] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "conductores"), where("estado", "==", "active"));
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setConductores(data);
        });
    }, []);

    return (
        <div className="h-screen w-full flex flex-col">
            <MapContainer center={[4.6097, -74.0817]} zoom={13} className="h-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {conductores.map((cond) => (
                    cond.lastLocation && (
                        <Marker 
                            key={cond.id} 
                            position={[cond.lastLocation.lat, cond.lastLocation.lng]} 
                            icon={iconConductor}
                        >
                            <Popup>
                                <div className="p-2 font-mono text-[10px] text-zinc-100">
                                    <p className="font-bold">ID: {cond.id.substring(0, 8)}</p>
                                    <p className="uppercase text-yellow-500">ROL: {cond.rol || 'CONDUCTOR'}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>
        </div>
    );
};

export default HomePasajero;