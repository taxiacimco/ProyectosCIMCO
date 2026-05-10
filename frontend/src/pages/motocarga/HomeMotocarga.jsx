// Versión Arquitectura: V2.1 - Radar Leaflet Motocarga, Cobro Atómico y Chat en Tiempo Real
/**
 * HomeMotocarga.jsx
 * Misión: Rastrear GPS, mostrar fletes, asegurar cobro de tasa ($500) y 
 * habilitar comunicación bidireccional con el pasajero una vez aceptado el viaje.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, runTransaction, serverTimestamp, addDoc, orderBy } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Truck, Box, Navigation, AlertTriangle, MessageSquare, Send } from 'lucide-react';

// 🛡️ FIX PARA ICONOS DE LEAFLET
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ 
    iconUrl: icon, 
    shadowUrl: iconShadow, 
    iconSize: [25, 41], 
    iconAnchor: [12, 41] 
});

const MotocargaIcon = L.icon({ 
    iconUrl: '/assets/motocarga-192.png', 
    iconSize: [48, 48], 
    iconAnchor: [24, 48],
    className: 'border-2 border-black rounded-sm bg-red-500' 
});

// Componente para recentrar el mapa al GPS del conductor
function RadarView({ center }) {
    const map = useMap();
    map.setView(center, map.getZoom());
    return null;
}

const HomeMotocarga = ({ profile }) => {
    const { user } = useAuth();
    const FEE = 500; // Tasa de servicio
    const [position, setPosition] = useState([9.566, -73.333]); // La Jagua Centro
    const [fletesDisponibles, setFletesDisponibles] = useState([]);
    const [viajeActivo, setViajeActivo] = useState(null);
    const [gpsActivo, setGpsActivo] = useState(false);
    
    // Estados del Chat
    const [mensajes, setMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState("");

    // 1. 📡 RASTREO GPS EN TIEMPO REAL
    useEffect(() => {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setPosition([pos.coords.latitude, pos.coords.longitude]);
                setGpsActivo(true);
            },
            (err) => console.error("Error GPS:", err),
            { enableHighAccuracy: true, maximumAge: 0 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, [viajeActivo]);

    // 2. 🎧 ESCUCHAR FLETES DISPONIBLES
    useEffect(() => {
        const pathViajes = `artifacts/taxiacimco-app/public/data/viajes`;
        const q = query(
            collection(db, pathViajes),
            where("estado", "==", "BUSCANDO"),
            where("tipoServicio", "==", "motocarga") // Filtro estricto
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fletes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFletesDisponibles(fletes);
        });

        return () => unsubscribe();
    }, []);

    // 3. 💬 ESCUCHAR MENSAJES DEL VIAJE ACTIVO
    useEffect(() => {
        if (!viajeActivo?.id) return;
        const q = query(
            collection(db, `artifacts/taxiacimco-app/public/data/mensajes`),
            where("viajeId", "==", viajeActivo.id),
            orderBy("timestamp", "asc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMensajes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [viajeActivo?.id]);

    // 4. 💎 TRANSACCIÓN ATÓMICA: ACEPTAR Y COBRAR
    const aceptarFlete = async (flete) => {
        try {
            await runTransaction(db, async (transaction) => {
                const walletRef = doc(db, `artifacts/taxiacimco-app/public/data/wallets`, user.uid);
                const viajeRef = doc(db, `artifacts/taxiacimco-app/public/data/viajes`, flete.id);

                const walletDoc = await transaction.get(walletRef);
                const viajeDoc = await transaction.get(viajeRef);

                if (!walletDoc.exists() || (walletDoc.data().balance || 0) < FEE) {
                    throw new Error("SALDO_INSUFICIENTE");
                }
                if (viajeDoc.data().estado !== 'BUSCANDO') {
                    throw new Error("VIAJE_TOMADO");
                }

                transaction.update(walletRef, {
                    balance: walletDoc.data().balance - FEE,
                    updatedAt: serverTimestamp()
                });

                transaction.update(viajeRef, {
                    estado: 'ACEPTADO',
                    conductorId: user.uid,
                    conductorNombre: user.displayName || "Motocarga CIMCO",
                    conductorRol: 'motocarga',
                    conductorUbicacion: { lat: position[0], lng: position[1] }
                });
            });

            alert(`✅ Flete Aceptado. Se descontaron $${FEE} de tu billetera.`);
            setViajeActivo(flete);

        } catch (error) {
            if (error.message === "SALDO_INSUFICIENTE") {
                alert(`⚠️ Tienes menos de $${FEE} en tu billetera. ¡Recarga para trabajar!`);
            } else if (error.message === "VIAJE_TOMADO") {
                alert("⚠️ Lo sentimos, otro Motocarga aceptó este flete hace un segundo.");
            } else {
                console.error("Error:", error);
            }
        }
    };

    // 5. ✉️ ENVIAR MENSAJE AL PASAJERO
    const enviarMensaje = async (e) => {
        e.preventDefault();
        if (!nuevoMensaje.trim()) return;
        await addDoc(collection(db, `artifacts/taxiacimco-app/public/data/mensajes`), {
            viajeId: viajeActivo.id,
            senderId: user.uid,
            texto: nuevoMensaje,
            timestamp: serverTimestamp(),
            rol: 'CONDUCTOR'
        });
        setNuevoMensaje("");
    };

    return (
        <div className="flex flex-col h-screen bg-black font-mono">
            
            {/* CABECERA CIBER-BRUTALISTA */}
            <header className="bg-red-600 text-black border-b-8 border-yellow-400 p-4 z-10 flex justify-between items-center shadow-[0_4px_20px_rgba(255,0,0,0.3)]">
                <div>
                    <h1 className="text-2xl font-black italic uppercase flex items-center gap-2">
                        <Truck strokeWidth={3} /> Motocarga <span className="text-yellow-400">RADAR</span>
                    </h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black">Tasa Op: ${FEE} COP</p>
                </div>
                <div className={`p-2 border-2 border-black font-black text-xs uppercase ${gpsActivo ? 'bg-green-400 text-black' : 'bg-zinc-800 text-white animate-pulse'}`}>
                    {gpsActivo ? 'GPS ACTIVO' : 'Buscando Sat...'}
                </div>
            </header>

            {/* MAPA LEAFLET */}
            <div className="flex-grow relative z-0">
                <MapContainer center={position} zoom={16} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={position} icon={MotocargaIcon}>
                        <Popup>Tu Unidad Motocarga</Popup>
                    </Marker>
                    <RadarView center={position} />

                    {/* Pintar los fletes buscando en el mapa */}
                    {!viajeActivo && fletesDisponibles.map(flete => (
                        <Marker 
                            key={flete.id} 
                            position={[flete.ubicacionRecogida.lat, flete.ubicacionRecogida.lng]} 
                            icon={DefaultIcon}
                        >
                            <Popup>
                                <div className="font-black uppercase text-center">
                                    <p className="text-red-600 text-lg m-0">${flete.pago?.tarifaOfertada}</p>
                                    <p className="text-[10px] m-0">Flete Solicitado</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* PANEL DE OPERACIONES */}
            <div className="bg-zinc-950 p-4 border-t-4 border-zinc-800 z-10 max-h-[50vh] overflow-y-auto">
                
                {/* ESTADO 1: VIAJE ACTIVO */}
                {viajeActivo && (
                    <div className="space-y-4">
                        <div className="bg-yellow-400 p-4 border-4 border-black shadow-[6px_6px_0px_0px_#fff]">
                            <h2 className="text-black font-black uppercase text-xl mb-2 flex items-center gap-2">
                                <Navigation /> RUTA EN CURSO
                            </h2>
                            <div className="bg-black text-white p-3 mb-4 text-xs font-bold uppercase">
                                <p className="text-yellow-400 text-[10px]">RECOGER EN:</p>
                                <p className="mb-2">{viajeActivo.detallesManuales?.recogida}</p>
                                <p className="text-yellow-400 text-[10px]">DESTINO:</p>
                                <p>{viajeActivo.detallesManuales?.destino}</p>
                            </div>
                            <button className="w-full mt-4 bg-red-600 text-black py-4 font-black uppercase border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-y-1 transition-transform">
                                FINALIZAR FLETE
                            </button>
                        </div>

                        {/* 💬 CHAT INTEGRADO */}
                        <div className="bg-zinc-900 border-2 border-zinc-700 p-3">
                            <h3 className="text-white text-[10px] font-black mb-2 flex items-center gap-1">
                                <MessageSquare size={12}/> CHAT CON PASAJERO
                            </h3>
                            <div className="h-32 overflow-y-auto mb-2 flex flex-col gap-2 p-2 bg-black border border-zinc-800">
                                {mensajes.map(m => (
                                    <div key={m.id} className={`max-w-[80%] p-2 text-[10px] font-bold uppercase ${m.senderId === user.uid ? 'bg-zinc-800 text-white self-end border border-zinc-600' : 'bg-yellow-400 text-black self-start border border-black'}`}>
                                        {m.texto}
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={enviarMensaje} className="flex gap-2">
                                <input 
                                    value={nuevoMensaje} 
                                    onChange={(e) => setNuevoMensaje(e.target.value)}
                                    placeholder="Escribir mensaje..."
                                    className="flex-grow bg-black border border-zinc-700 p-2 text-white text-xs outline-none focus:border-yellow-400"
                                />
                                <button type="submit" className="bg-yellow-400 p-2 border-2 border-black"><Send size={16} color="black"/></button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ESTADO 2: ESPERANDO FLETES */}
                {!viajeActivo && (
                    <>
                        <h3 className="text-zinc-500 font-bold uppercase text-xs mb-4 flex items-center gap-2">
                            <Box size={14} /> Fletes en tu zona ({fletesDisponibles.length})
                        </h3>

                        {fletesDisponibles.length === 0 ? (
                            <div className="border-2 border-zinc-800 border-dashed p-8 text-center text-zinc-600 uppercase font-black text-sm">
                                <AlertTriangle className="mx-auto mb-2 opacity-50" size={32} />
                                No hay fletes disponibles
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {fletesDisponibles.map(flete => (
                                    <div key={flete.id} className="bg-zinc-900 border-2 border-zinc-700 p-4 flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(255,0,0,0.5)]">
                                        <div>
                                            <p className="text-white font-black text-lg m-0">${flete.pago?.tarifaOfertada}</p>
                                            <p className="text-[10px] text-yellow-400 uppercase font-bold m-0 mt-1 truncate max-w-[150px]">
                                                {flete.detallesManuales.destino}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => aceptarFlete(flete)}
                                            className="bg-white text-black px-4 py-3 font-black uppercase text-xs hover:bg-yellow-400 transition-colors border-2 border-black"
                                        >
                                            ACEPTAR (-${FEE})
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default HomeMotocarga;