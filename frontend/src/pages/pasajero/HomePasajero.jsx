// Versión Arquitectura: V12.2 - Integración Quirúrgica Rastreo Telemétrico del Conductor en Mapa
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\HomePasajero.jsx
 * Misión: Proveer el nodo central operativo para el pasajero, permitiendo lanzar solicitudes al radar
 * en tiempo real utilizando la nueva colección homologada 'rides' y renderizar dinámicamente la posición del conductor.
 * Integridad: Salvaguardas estrictas Anti-Undefined en el contexto de autenticación y estados reactivos.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism.
 */

import React, { useState, useEffect } from 'react';
import { db, auth as firebaseAuth, FIRESTORE_PATHS } from '@/config/firebase'; 
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Compass, Clock, CheckCircle, Navigation, Bike, Users, Package, Milestone, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModalCalificacion from '@/components/ModalCalificacion';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const iconConductor = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

const iconPasajero = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2984/2984132.png',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

const CambiarCentroMapa = ({ centro }) => {
    const mapa = useMap();
    useEffect(() => {
        if (centro && centro[0] && centro[1]) {
            mapa.setView(centro, 15, { animate: true });
        }
    }, [centro, mapa]);
    return null;
};

const HomePasajero = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // 📡 ESTADOS CORE DE LOCALIZACIÓN Y SERVICIO
    const [origen, setOrigen] = useState('Plaza Principal - La Jagua de Ibirico');
    const [destino, setDestino] = useState('');
    const [latitudOrigen, setLatitudOrigen] = useState(9.5620);
    const [longitudOrigen, setLongitudOrigen] = useState(-73.3333);
    const [latitudDestino, setLatitudDestino] = useState(9.5650);
    const [longitudDestino, setLongitudDestino] = useState(-73.3370);
    
    const [centroMapa, setCentroMapa] = useState([9.5620, -73.3333]);
    const [tipoVehiculo, setTipoVehiculo] = useState('mototaxi'); 
    const [ofertaPasajero, setOfertaPasajero] = useState('');
    
    // ⚙️ ESTADOS OPERATIVOS DE FLUJO
    const [estadoOperativo, setEstadoOperativo] = useState('IDLE'); 
    const [loadingSolicitud, setLoadingSolicitud] = useState(false);
    const [error, setError] = useState('');
    const [rideId, setRideId] = useState(null);
    const [datosConductor, setDatosConductor] = useState(null);
    const [mostrarModalCalificacion, setMostrarModalCalificacion] = useState(false);
    
    // 🛰️ NUEVO ESTADO: Telemetría del Conductor
    const [posicionConductor, setPosicionConductor] = useState(null);

    // 🛡️ GUARDA ANTI-UNDEFINED: Autenticación Anónima de respaldo si no hay sesión activa en Firebase
    useEffect(() => {
        if (!firebaseAuth.currentUser) {
            signInAnonymously(firebaseAuth).catch((err) => console.error("⚠️ Falla de handshake anónimo:", err));
        }
    }, []);

    // 🔄 SUSCRIPCIÓN EN TIEMPO REAL AL RADAR DE LA SOLICITUD ACTIVA (Colección 'rides')
    useEffect(() => {
        if (!rideId || !FIRESTORE_PATHS.rides) return;

        const docRef = doc(db, FIRESTORE_PATHS.rides, rideId);
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                
                // Blindaje de seguridad Anti-Undefined ante lecturas de cambios de estado
                if (data && data.status) {
                    if (data.status === 'accepted') {
                        setEstadoOperativo('CONFIRMADO');
                        setDatosConductor(data.conductor || { nombre: 'Unidad Asignada', telefono: '3000000000', placa: 'X-000' });
                    } else if (data.status === 'completed') {
                        setEstadoOperativo('FINALIZADO');
                        setMostrarModalCalificacion(true);
                    } else if (data.status === 'cancelled') {
                        resetearConsola();
                        setError('El servicio fue cancelado o rechazado por el sistema.');
                    }

                    // 🛡️ TELEMETRÍA DINÁMICA: Lectura atómica de coordenadas del conductor
                    if (data.conductorLocation && typeof data.conductorLocation.latitude === 'number' && typeof data.conductorLocation.longitude === 'number') {
                        setPosicionConductor([data.conductorLocation.latitude, data.conductorLocation.longitude]);
                    }
                }
            }
        }, (err) => {
            console.error("❌ Error en telemetría de suscripción:", err);
        });

        return () => unsubscribe();
    }, [rideId]);

    // 🚀 LANZAR SOLICITUD AL RADAR CENTRAL
    const handleLanzarRadar = async (e) => {
        e.preventDefault();
        setError('');
        
        // Blindaje Anti-Undefined: Validar existencia de usuario antes de operar
        if (!user || !user.uid) {
            setError('Error de Identidad: Usuario no autenticado o sesión expirada.');
            return;
        }

        if (!destino.trim()) {
            setError('Debe especificar un destino válido para indexar el trazo.');
            return;
        }

        setLoadingSolicitud(true);

        try {
            // Regla de Gobernanza de Rutas: Consumir exclusivamente el objeto global homologado
            const coleccionRides = FIRESTORE_PATHS.rides || 'rides';

            // 🏛️ INYECCIÓN QUIRÚRGICA: Estructura de coordenadas basada en mapas con Doubles numéricos
            const payloadRide = {
                usuarioId: user.uid,
                origenNombre: origen,
                destinoNombre: destino,
                tipoVehiculo: tipoVehiculo,
                oferta: parseFloat(ofertaPasajero) || 2000,
                startLocation: {
                    latitude: parseFloat(latitudOrigen),
                    longitude: parseFloat(longitudOrigen)
                },
                endLocation: {
                    latitude: parseFloat(latitudDestino),
                    longitude: parseFloat(longitudDestino)
                },
                status: "pending",
                timestamp: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, coleccionRides), payloadRide);
            setRideId(docRef.id);
            setEstadoOperativo('BUSCANDO');
        } catch (err) {
            console.error("❌ Error crítico en lanzamiento de servicio:", err);
            setError("Error de red con el clúster: " + err.message);
        } finally {
            setLoadingSolicitud(false);
        }
    };

    // 🔄 CANCELAR O RESETEAR CONSOLA OPERATIVA
    const resetearConsola = async () => {
        if (rideId && estadoOperativo === 'BUSCANDO') {
            try {
                const docRef = doc(db, FIRESTORE_PATHS.rides || 'rides', rideId);
                await updateDoc(docRef, { status: 'cancelled' });
            } catch (err) {
                console.error("No se pudo dar de baja el servicio remoto:", err);
            }
        }
        setRideId(null);
        setEstadoOperativo('IDLE');
        setDatosConductor(null);
        setPosicionConductor(null); // Limpieza de telemetría en memoria
        setError('');
    };

    const handleCierreCalificacion = () => {
        setMostrarModalCalificacion(false);
        setEstadoOperativo('IDLE');
        setRideId(null);
        setDestino('');
        setOfertaPasajero('');
        setPosicionConductor(null); // Limpieza de telemetría tras finalizar servicio
    };

    return (
        <div className="relative min-h-screen bg-[#09090b] text-zinc-100 flex flex-col md:flex-row overflow-hidden">
            {/* VISUALIZADOR CARTOGRÁFICO INTERACTIVO */}
            <div className="flex-1 h-[50vh] md:h-screen relative z-0">
                <MapContainer 
                    center={centroMapa} 
                    zoom={15} 
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <CambiarCentroMapa centro={centroMapa} />
                    
                    <Marker position={[latitudOrigen, longitudOrigen]} icon={iconPasajero}>
                        <Popup>
                            <span className="font-mono text-xs text-zinc-900">Punto de Origen</span>
                        </Popup>
                    </Marker>

                    {/* 🛰️ RENDERIZADO DINÁMICO DE TELEMETRÍA DEL CONDUCTOR */}
                    {posicionConductor && (
                        <Marker position={posicionConductor} icon={iconConductor}>
                            <Popup>
                                <span className="font-mono text-xs text-zinc-900 font-bold uppercase">Unidad en Camino</span>
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>

            {/* PANEL DE CONTROL DE OPERACIONES (GLASSMORPHISM PREMIUM) */}
            <div className="w-full md:w-[420px] backdrop-blur-md bg-[#121214]/80 border-l border-white/5 p-6 flex flex-col justify-between z-10 shrink-0 shadow-2xl overflow-y-auto">
                <div className="space-y-6">
                    {/* ENCABEZADO TÁCTICO */}
                    <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
                                <Compass className="animate-spin-slow" size={20} />
                            </div>
                            <div>
                                <h1 className="text-sm font-mono font-bold uppercase tracking-wider text-white">TAXIA CIMCO</h1>
                                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Consola Pasajero</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => logout ? logout() : navigate('/login')}
                            className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                            title="Desconectar Terminal"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>

                    {/* MENSAJES DE ERROR DE COMUNICACIÓN */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] font-mono text-red-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                            <p>{error}</p>
                        </div>
                    )}

                    {/* NÚCLEO DINÁMICO DE ESTADOS DE RENDERIZADO */}
                    <div className="space-y-4">
                        {estadoOperativo === 'IDLE' && (
                            <form onSubmit={handleLanzarRadar} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                                        <MapPin size={12} className="text-emerald-400" /> Punto de Abordaje
                                    </label>
                                    <input 
                                        type="text" 
                                        value={origen}
                                        onChange={(e) => setOrigen(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 p-3.5 rounded-xl text-zinc-100 text-xs focus:border-cyan-500/40 outline-none font-mono transition-all"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                                        <Navigation size={12} className="text-cyan-400" /> Punto de Destino
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="¿A dónde se dirige?"
                                        value={destino}
                                        onChange={(e) => setDestino(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 p-3.5 rounded-xl text-zinc-100 text-xs focus:border-cyan-500/40 outline-none font-mono transition-all"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'mototaxi', label: 'Moto', icon: Bike },
                                        { id: 'taxi', label: 'Taxi', icon: Users },
                                        { id: 'intermunicipal', label: 'Ruta', icon: Package }
                                    ].map((veh) => {
                                        const IconComp = veh.icon;
                                        return (
                                            <button
                                                key={veh.id}
                                                type="button"
                                                onClick={() => setTipoVehiculo(veh.id)}
                                                className={`p-3 border rounded-xl flex flex-col items-center gap-1 transition-all ${
                                                    tipoVehiculo === veh.id 
                                                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' 
                                                        : 'bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-300'
                                                }`}
                                            >
                                                <IconComp size={16} />
                                                <span className="text-[9px] font-mono font-bold uppercase">{veh.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                                        <Milestone size={12} className="text-yellow-500" /> Oferta en COP
                                    </label>
                                    <input 
                                        type="number" 
                                        placeholder="Ej. 2000"
                                        value={ofertaPasajero}
                                        onChange={(e) => setOfertaPasajero(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 p-3.5 rounded-xl text-zinc-100 text-xs focus:border-cyan-500/40 outline-none font-mono transition-all"
                                    />
                                </div>

                                <button type="submit" disabled={loadingSolicitud} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all mt-2 disabled:opacity-50">Lanzar al Radar</button>
                            </form>
                        )}
                        {estadoOperativo === 'BUSCANDO' && (
                            <div className="text-center py-6 space-y-3">
                                <Clock size={24} className="mx-auto text-cyan-400 animate-spin" />
                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest animate-pulse">Buscando Unidad...</h3>
                                <button onClick={resetearConsola} className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[9px] py-2 px-4 rounded-md uppercase">Cancelar</button>
                            </div>
                        )}
                        {estadoOperativo === 'CONFIRMADO' && (
                            <div className="text-center py-6 space-y-3">
                                <CheckCircle size={32} className="mx-auto text-emerald-400" />
                                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">¡Servicio Confirmado!</h3>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* INCLUSIÓN DE MODAL DE CALIFICACIÓN AL FINALIZAR TRAYECTOS */}
            {mostrarModalCalificacion && (
                <ModalCalificacion 
                    isOpen={mostrarModalCalificacion}
                    onClose={handleCierreCalificacion}
                    rideId={rideId}
                    datosConductor={datosConductor}
                />
            )}
        </div>
    );
};

export default HomePasajero;