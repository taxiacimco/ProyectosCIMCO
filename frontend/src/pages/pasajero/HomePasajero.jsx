// Versión Arquitectura: V11.5 - Puente Híbrido Firebase y Manejo de Excepciones de Seguridad (Anti-Crash)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\HomePasajero.jsx
 * Misión: Proveer la consola de despacho de servicios civiles e intermunicipales con micro-interacciones de selección.
 * Estilo: Glassmorphism Premium, fondos oscuros desinfectados de rasgos brutalistas.
 * Integración: Puente Híbrido de Autenticación para lectura de Firestore y evasión de bloqueos.
 */

import React, { useState, useEffect } from 'react';
import { db, auth as firebaseAuth } from '../../config/firebase'; 
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Compass, ShieldCheck, Clock, CheckCircle, Navigation, DollarSign, Bike, Users, Package, Milestone, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const iconConductor = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

const CambiarCentroMapa = ({ centro }) => {
    const mapa = useMap();
    useEffect(() => {
        if (centro) mapa.setView(centro, 15, { animate: true });
    }, [centro, mapa]);
    return null;
};

const HomePasajero = () => {
    const navigate = useNavigate();
    const auth = useAuth();
    const user = auth ? auth.user : null;

    const [conductores, setConductores] = useState([]);
    const [origenTexto, setOrigenTexto] = useState('');
    const [destinoTexto, setDestinoTexto] = useState('');
    const [tarifaPropuesta, setTarifaPropuesta] = useState('');
    const [loadingSolicitud, setLoadingSolicitud] = useState(false);
    
    const [estadoOperativo, setEstadoOperativo] = useState('IDLE');
    const [viajeActivoId, setViajeActivoId] = useState(null);
    const [datosViaje, setDatosViaje] = useState(null);
    const [posicionMapa, setPosicionMapa] = useState([9.5740, -73.3421]); 

    useEffect(() => {
        // 🛡️ GUARDA DE SEGURIDAD: Puente Híbrido Firebase
        const habilitarLecturaFirebase = async () => {
            try {
                if (!firebaseAuth.currentUser) {
                    await signInAnonymously(firebaseAuth);
                    console.log("🔥 [CIMCO-BRIDGE] Autenticación anónima establecida con Firebase para lectura de radar.");
                }
            } catch (error) {
                console.warn("⚠️ [CIMCO-BRIDGE] Fallo en puente híbrido. Las reglas de Firestore podrían bloquear la lectura:", error.message);
            }
        };

        habilitarLecturaFirebase();

        const q = query(collection(db, "conductores"), where("estado", "==", "active"));
        
        // 🛡️ BLINDAJE ANTI-CRASH: Captura del error de Firestore
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return { 
                    id: doc.id, 
                    ...docData,
                    lastLocation: docData.coordenadas?.coordinates ? {
                        lat: docData.coordenadas.coordinates[1],
                        lng: docData.coordenadas.coordinates[0]
                    } : null
                };
            }).filter(c => c.lastLocation !== null); 
            setConductores(data);
        }, (error) => {
            console.error("❌ [CIMCO-FIRESTORE] Permiso denegado al leer conductores de la flota. Verifique Reglas en Firebase Console.", error.message);
        });

        return () => unsubscribe();
    }, []);

    const manejarSolicitudViaje = async (e) => {
        e.preventDefault();
        if (!origenTexto || !destinoTexto || !tarifaPropuesta) return;
        setLoadingSolicitud(true);
        setEstadoOperativo('BUSCANDO');

        try {
            const payloadViaje = {
                pasajeroId: user?.uid || user?.id || 'ANÓNIMO',
                pasajeroNombre: user?.nombre || 'Pasajero CIMCO',
                origenTexto,
                destinoTexto,
                origen: { lat: 9.5740, lng: -73.3421 },
                destino: { lat: 9.5710, lng: -73.3421 },
                tarifa: Number(tarifaPropuesta),
                estadoViaje: 'solicitado',
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "viajes"), payloadViaje);
            setViajeActivoId(docRef.id);
            
            const viajeRef = doc(db, "viajes", docRef.id);
            
            // 🛡️ BLINDAJE ANTI-CRASH
            const unsubViaje = onSnapshot(viajeRef, (docSnap) => {
                if (docSnap.exists()) {
                    const currentViaje = docSnap.data();
                    setDatosViaje(currentViaje);
                    if (currentViaje.estadoViaje === 'aceptado') setEstadoOperativo('CONFIRMADO');
                    else if (currentViaje.estadoViaje === 'en_viaje') setEstadoOperativo('EN_VIAJE');
                    else if (currentViaje.estadoViaje === 'finalizado') {
                        setEstadoOperativo('COMPLETADO');
                        unsubViaje();
                    }
                }
            }, (error) => {
                console.error("❌ [CIMCO-FIRESTORE] Pérdida de telemetría en el viaje activo:", error.message);
            });
        } catch (error) {
            console.error("❌ [CIMCO-CORE] Error al despachar la solicitud:", error);
            setEstadoOperativo('IDLE');
        } finally {
            setLoadingSolicitud(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('cimco_token'); // Homologado a la V16
        localStorage.removeItem('userRole');
        if (auth && auth.setUser) auth.setUser(null);
        navigate('/login');
    };

    const resetearConsola = () => {
        setEstadoOperativo('IDLE');
        setViajeActivoId(null);
        setDatosViaje(null);
        setOrigenTexto('');
        setDestinoTexto('');
        setTarifaPropuesta('');
    };

    const servicios = [
        { id: 'mototaxi', titulo: 'MOTOTAXI', subtitulo: 'FLOTA PANTERA', icon: Bike, color: 'text-yellow-500', border: 'hover:border-yellow-500/40' },
        { id: 'motoparrillero', titulo: 'MOTOPARRILLERO', subtitulo: 'ACOMPAÑANTE SEGURO', icon: Users, color: 'text-cyan-400', border: 'hover:border-cyan-500/40' },
        { id: 'motocarga', titulo: 'MOTOCARGA', subtitulo: 'LOGÍSTICA INTERNA', icon: Package, color: 'text-emerald-400', border: 'hover:border-emerald-500/40' },
        { id: 'intermunicipal', titulo: 'INTERMUNICIPAL', subtitulo: 'RUTAS TERMINAL', icon: Milestone, color: 'text-purple-400', border: 'hover:border-purple-500/40' }
    ];

    return (
        <div className="h-screen w-full flex flex-col bg-[#121214] font-mono text-zinc-100 overflow-hidden relative">
            <header className="w-full bg-[#121214]/80 backdrop-blur-md border-b border-zinc-800/50 px-6 py-4 flex items-center justify-between z-50 shadow-md">
                <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    <div><h1 className="text-xs font-bold uppercase tracking-widest text-zinc-100">TAXIA CIMCO</h1><p className="text-[9px] text-zinc-500 uppercase tracking-wider">La Jagua de Ibirico</p></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 bg-zinc-950/40 border border-zinc-800 px-3 py-1.5 rounded-xl"><UserIcon size={12} className="text-zinc-500" /><span className="text-[10px] uppercase text-zinc-400 tracking-wider font-bold">{user ? (user.nombre || 'Pasajero Activo') : 'Pasajero Civil'}</span></div>
                    <button onClick={handleLogout} className="p-2 bg-red-950/20 border border-red-500/30 hover:border-red-500/60 rounded-xl text-red-400 transition-all"><LogOut size={13} /></button>
                </div>
            </header>

            <div className="flex-1 w-full relative z-10">
                <MapContainer center={posicionMapa} zoom={14} className="h-full w-full" zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    <CambiarCentroMapa centro={posicionMapa} />
                    {conductores.map((cond) => (
                        <Marker key={cond.id} position={[cond.lastLocation.lat, cond.lastLocation.lng]} icon={iconConductor}>
                            <Popup className="custom-popup"><div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-[10px]"><p className="font-bold text-white">MOTO: {cond.nombre}</p></div></Popup>
                        </Marker>
                    ))}
                </MapContainer>
                <button onClick={() => setPosicionMapa([9.5740, -73.3421])} className="absolute bottom-6 right-6 z-[500] p-3 rounded-full bg-zinc-900/90 border border-zinc-800 text-cyan-500 backdrop-blur-md shadow-lg active:scale-95 transition-transform"><Compass size={20} className="animate-pulse" /></button>
            </div>

            <div className="w-full max-h-[55vh] bg-[#121214]/90 backdrop-blur-xl border-t border-zinc-800/80 z-20 shadow-2xl overflow-y-auto px-6 py-5 rounded-t-3xl">
                <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-6">
                    {/* MÁQUINA DE SERVICIOS */}
                    <div className="flex-1">
                        <div className="mb-4"><h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Selección de Flota</h2></div>
                        <div className="grid grid-cols-2 gap-3">
                            {servicios.map((srv) => {
                                const IconComp = srv.icon;
                                return (
                                    <div key={srv.id} className={`bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${srv.border} hover:bg-zinc-800/40`}>
                                        <IconComp size={20} className={`mb-2 ${srv.color}`} />
                                        <h3 className="text-[10px] font-bold tracking-widest text-zinc-200">{srv.titulo}</h3>
                                        <span className="text-[8px] text-zinc-500 tracking-wider mt-1">{srv.subtitulo}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* PANEL DE SOLICITUD */}
                    <div className="flex-1 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
                        {estadoOperativo === 'IDLE' && (
                            <form onSubmit={manejarSolicitudViaje} className="space-y-3">
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500 flex items-center gap-2 mb-4"><Navigation size={12}/> Despachar Solicitud</h2>
                                <input type="text" required value={origenTexto} onChange={(e) => setOrigenTexto(e.target.value)} placeholder="📍 Punto de Recogida" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 text-[10px] focus:border-cyan-500 outline-none placeholder-zinc-600" />
                                <input type="text" required value={destinoTexto} onChange={(e) => setDestinoTexto(e.target.value)} placeholder="🏁 Destino" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 text-[10px] focus:border-cyan-500 outline-none placeholder-zinc-600" />
                                <input type="number" required min="2000" step="500" value={tarifaPropuesta} onChange={(e) => setTarifaPropuesta(e.target.value)} placeholder="💲 Tarifa Mínima $2000" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 text-[10px] text-yellow-500 font-bold focus:border-cyan-500 outline-none placeholder-zinc-600" />
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
        </div>
    );
};
export default HomePasajero;