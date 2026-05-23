// Versión Arquitectura: V9.7 - Sanitización de Sintaxis JSX, Enrutamiento de Hooks y Estética CIMCO-UI Premium
/**
 * Ubicación: frontend/src/pages/pasajero/HomePasajero.jsx
 * Misión: Panel de interacción táctica del Pasajero con mapas interactivos oscuros y cálculo matemático reactivo.
 * UI Standard: Minimalismo Moderno - Glassmorphism sutil y grises zinc fluidos sin trazos pesados.
 */

import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase'; 
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    doc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    updateDoc 
} from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
    MapPin, 
    DollarSign, 
    Loader, 
    CheckCircle, 
    Send, 
    MessageSquare,
    Star,
    Building2,
    Car
} from 'lucide-react';

const iconPasajero = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png',
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

const iconConductor = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2855/2855544.png',
    iconSize: [26, 26],
    iconAnchor: [13, 26]
});

const HomePasajero = () => {
    const { user } = useAuth();
    const [coordenadas, setCoordenadas] = useState([9.3245, -73.3321]); // La Jagua de Ibirico
    const [destino, setDestino] = useState('');
    const [coordenadasDestinoSimuladas, setCoordenadasDestinoSimuladas] = useState([9.3300, -73.3250]);
    const [estadoViaje, setEstadoViaje] = useState('idle'); // idle, buscando, aceptado, en_curso, completado
    const [viajeId, setViajeId] = useState(null);
    const [datosViaje, setDatosViaje] = useState(null);
    const [conductoresEnLinea, setConductoresEnLinea] = useState([]);
    const [chatMensajes, setChatMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    const [calificacion, setCalificacion] = useState(5);
    const [tarifaEstimada, setTarifaEstimada] = useState(3000);
    const [distanciaEstimada, setDistanciaEstimada] = useState(0);
    
    // 🚀 CONTROL DE ESTADO DE NEGOCIO CIMCO
    const [servicioSeleccionado, setServicioSeleccionado] = useState('MOTOTAXI');

    // Listado simulado de Cooperativas registradas
    const cooperativasRegistradas = [
        { id: 'COOTRANSJAGUA', name: 'COOTRANSJAGUA S.A.', detail: 'Flota centralizada con salidas cada 15 minutos desde Terminal de La Jagua.' },
        { id: 'COOTRAGAL', name: 'COOTRAGAL Cooperativa', detail: 'Rutas intermunicipales exprés con aire acondicionado y monitoreo satelital.' }
    ];
    const [cooperativaSeleccionada, setCooperativaSeleccionada] = useState(cooperativasRegistradas[0]);

    // Tracking interactivo de geolocalización inicial
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCoordenadas([position.coords.latitude, position.coords.longitude]);
                },
                () => console.log("⚠️ Usando coordenadas base homologadas por el operador central.")
            );
        }
    }, []);

    // Radar de Conductores en Tiempo Real acoplado a la Estructura de Datos Sagrada
    useEffect(() => {
        const pathSagradoUsuarios = "artifacts/taxiacimco-app/public/data/usuarios";
        const qConductores = query(
            collection(db, pathSagradoUsuarios),
            where("isOnline", "==", true)
        );

        const unsubscribe = onSnapshot(qConductores, (snapshot) => {
            const lista = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.lastLocation && data.lastLocation.lat && data.lastLocation.lng) {
                    lista.push({
                        id: docSnap.id,
                        ...data
                    });
                }
            });
            setConductoresEnLinea(lista);
        }, (error) => {
            console.error("❌ Error escuchando radar de telemetría:", error);
        });

        return () => unsubscribe();
    }, []);

    // Monitoreo Transaccional del Viaje Activo
    useEffect(() => {
        if (!viajeId) return;

        const pathSagradoViajes = `artifacts/taxiacimco-app/public/data/viajes/${viajeId}`;
        const unsubscribe = onSnapshot(doc(db, pathSagradoViajes), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setDatosViaje(data);
                if (data.status) {
                    setEstadoViaje(data.status);
                }
            }
        });

        return () => unsubscribe();
    }, [viajeId]);

    // Canal de Comunicación por Chat en Tiempo Real
    useEffect(() => {
        if (!viajeId || (estadoViaje !== 'aceptado' && estadoViaje !== 'en_curso')) return;

        const pathSagradoChat = `artifacts/taxiacimco-app/public/data/viajes/${viajeId}/chats`;
        const qChat = query(collection(db, pathSagradoChat), orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(qChat, (snapshot) => {
            const msgs = [];
            snapshot.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
            setChatMensajes(msgs);
        });

        return () => unsubscribe();
    }, [viajeId, estadoViaje]);

    // Algoritmo predictivo de cálculo de costos
    useEffect(() => {
        if (!destino) {
            setTarifaEstimada(3000);
            setDistanciaEstimada(0);
            return;
        }
        const randomDist = Math.random() * (5.8 - 1.2) + 1.2;
        setDistanciaEstimada(randomDist);
        const calculo = Math.round(randomDist * 2200 + 2500);
        setTarifaEstimada(Math.ceil(calculo / 100) * 100);
    }, [destino]);

    // Manejador Transaccional de Solicitud de Viajes
    const solicitarViaje = async (e) => {
        e.preventDefault();
        
        // 🛡️ GUARDA DE SEGURIDAD OBLIGATORIA
        if (!user || !user.uid) {
            console.error("⚠️ Error: Terminal de usuario no autenticada legalmente.");
            return;
        }

        if (!destino && servicioSeleccionado !== 'INTERMUNICIPAL') return;

        try {
            setEstadoViaje('buscando');
            
            const payload = {
                pasajeroId: user.uid,
                origenTexto: "Ubicación Actual Detectada",
                destinoTexto: servicioSeleccionado === 'INTERMUNICIPAL' ? `Ruta Cooperativa: ${cooperativaSeleccionada.name}` : destino,
                coordenadasOrigen: coordenadas,
                coordenadasDestino: coordenadasDestinoSimuladas,
                sub_role: servicioSeleccionado
            };

            const respuesta = await axios.post('http://localhost:3000/api/viajes/solicitar', payload);

            if (respuesta.data && respuesta.data.success) {
                setViajeId(respuesta.data.viajeId);
            } else {
                setEstadoViaje('idle');
                alert("Error en pasarela operativa: " + respuesta.data.message);
            }
        } catch (error) {
            console.error("❌ Fallo en la transmisión telemática del viaje:", error);
            setEstadoViaje('idle');
        }
    };

    const enviarMensajeChat = async (e) => {
        e.preventDefault();
        if (!user || !user.uid || !nuevoMensaje.trim() || !viajeId) return;

        const pathSagradoChat = `artifacts/taxiacimco-app/public/data/viajes/${viajeId}/chats`;
        try {
            await addDoc(collection(db, pathSagradoChat), {
                senderId: user.uid,
                texto: nuevoMensaje,
                timestamp: serverTimestamp()
            });
            setNuevoMensaje('');
        } catch (err) {
            console.error("Error al inyectar mensaje en chat:", err);
        }
    };

    const procesarCalificacion = async () => {
        if (!viajeId) return;
        const pathSagradoViajes = `artifacts/taxiacimco-app/public/data/viajes/${viajeId}`;
        try {
            await updateDoc(doc(db, pathSagradoViajes), {
                calificacionPasajero: calificacion,
                status: 'finalizado_ok'
            });
            setEstadoViaje('idle');
            setViajeId(null);
            setDestino('');
            setDatosViaje(null);
        } catch (err) {
            console.error("Error al guardar auditoría de cierre:", err);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex flex-col relative overflow-hidden">
            
            <header className="z-[1000] bg-[#121214]/80 border-b border-zinc-800/50 p-4 sticky top-0 flex justify-between items-center px-6 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                    <h1 className="text-sm font-bold tracking-widest uppercase font-mono text-zinc-200">
                        TAXIA-CIMCO <span className="text-yellow-500">CLIENT</span>
                    </h1>
                </div>
                <div className="bg-zinc-900/60 px-3 py-1.5 border border-zinc-800/40 rounded-lg flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                        {user?.email || "Anónimo"}
                    </span>
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row relative">
                
                <div className="w-full md:w-[380px] bg-[#121214]/60 border-b md:border-b-0 md:border-r border-zinc-800/40 p-4 md:p-6 z-50 flex flex-col gap-4 backdrop-blur-md overflow-y-auto max-h-[calc(100vh-120px)]">
                    
                    <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-4">
                        <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block mb-1">Módulo de Geolocalización</span>
                        <p className="text-[11px] text-zinc-500 font-mono">La Jagua de Ibirico (Cesar, Colombia)</p>
                    </div>

                    {estadoViaje === 'idle' && (
                        <form onSubmit={solicitarViaje} className="space-y-4">
                            
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Seleccionar Tipo de Servicio</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'MOTOTAXI', label: '🚖 Mototaxi', desc: 'Directo P2P' },
                                        { id: 'PARRILLERO', label: '🛵 Parrillero', desc: 'Directo P2P' },
                                        { id: 'MOTOCARGA', label: '📦 Motocarga', desc: 'Directo P2P' },
                                        { id: 'INTERMUNICIPAL', label: '🏢 Intermunicipal', desc: 'Flota/Despacho' }
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setServicioSeleccionado(item.id)}
                                            className={`p-3 rounded-xl border text-left transition-all duration-200 outline-none ${
                                                servicioSeleccionado === item.id
                                                    ? 'bg-zinc-100 text-[#09090b] border-zinc-100 shadow-md shadow-zinc-100/10 font-bold'
                                                    : 'bg-[#09090b]/80 text-zinc-300 border-zinc-800/60 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className="text-xs">{item.label}</div>
                                            <div className={`text-[8px] uppercase tracking-wider mt-0.5 ${
                                                servicioSeleccionado === item.id ? 'text-[#09090b]/80 font-semibold' : 'text-zinc-500'
                                            }`}>{item.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {servicioSeleccionado === 'INTERMUNICIPAL' ? (
                                <div className="space-y-2.5">
                                    <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">Cooperativas Disponibles</label>
                                    <div className="flex flex-col gap-2">
                                        {cooperativasRegistradas.map((coop) => (
                                            <div 
                                                key={coop.id}
                                                onClick={() => setCooperativaSeleccionada(coop)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                                    cooperativaSeleccionada.id === coop.id 
                                                        ? 'bg-zinc-900 border-yellow-500/80' 
                                                        : 'bg-[#09090b] border-zinc-800/40 hover:border-zinc-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Building2 size={12} className={cooperativaSeleccionada.id === coop.id ? 'text-yellow-500' : 'text-zinc-500'} />
                                                    <span className="text-xs font-bold text-zinc-200">{coop.name}</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 mt-1 font-sans leading-relaxed">{coop.detail}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Especificar Destino del Viaje</label>
                                    <div className="relative flex items-center">
                                        <MapPin size={13} className="absolute left-3 text-zinc-500" />
                                        <input 
                                            type="text" 
                                            placeholder={`¿A dónde se dirige en ${servicioSeleccionado.toLowerCase()}?`}
                                            value={destino}
                                            onChange={(e) => setDestino(e.target.value)}
                                            className="w-full bg-[#09090b] border border-zinc-800/50 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors" 
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center bg-[#09090b] border border-zinc-800/40 rounded-xl p-3.5">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                        <DollarSign size={13} className="text-yellow-500" />
                                        <span className="text-[11px]">Tarifa Estimada Base</span>
                                    </div>
                                    <span className="text-[9px] text-zinc-500 font-mono">Métrica: {distanciaEstimada.toFixed(2)} KM</span>
                                </div>
                                <span className="text-sm font-bold font-mono text-yellow-500">${tarifaEstimada} COP</span>
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-zinc-100 text-[#09090b] font-bold text-xs uppercase tracking-widest py-3 rounded-xl hover:bg-zinc-200 shadow-lg shadow-zinc-950/50 transition-all"
                            >
                                SOLICITAR {servicioSeleccionado}
                            </button>
                        </form>
                    )}

                    {estadoViaje === 'buscando' && (
                        <div className="text-center py-8 bg-[#09090b]/50 border border-zinc-800/40 rounded-xl p-6 flex flex-col items-center gap-4">
                            <Loader size={28} className="text-yellow-500 animate-spin" />
                            <div className="space-y-1">
                                <p className="font-bold text-xs uppercase tracking-wider text-zinc-300">Buscando {servicioSeleccionado} Disponible</p>
                                <p className="text-[10px] text-zinc-500">Transmitiendo ráfagas de geolocalización a las unidades en rango...</p>
                            </div>
                            <div className="w-full bg-zinc-900 border border-zinc-800/30 p-3 rounded-lg text-left">
                                <span className="text-[8px] font-bold uppercase text-yellow-500 font-mono tracking-wider block mb-1">Traza Telemática</span>
                                <p className="text-[10px] font-mono text-zinc-400 truncate">Pasajero UID: {user?.uid}</p>
                                <p className="text-[10px] font-mono text-zinc-400">Servicio: {servicioSeleccionado}</p>
                            </div>
                        </div>
                    )}

                    {(estadoViaje === 'aceptado' || estadoViaje === 'en_curso') && datosViaje && (
                        <div className="space-y-4">
                            <div className="bg-zinc-900/60 border border-zinc-800/40 p-4 rounded-xl space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] uppercase font-bold px-2 py-0.5 rounded">
                                        {estadoViaje === 'aceptado' ? 'Unidad Asignada' : 'Viaje en Curso'}
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-500">ID: {viajeId?.substring(0,6)}</span>
                                </div>
                                <div className="flex items-center gap-3 border-t border-b border-zinc-800/40 py-2.5">
                                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                                        <Car size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-zinc-300">Conductor Asignado</p>
                                        <p className="text-[10px] text-zinc-500 font-mono truncate">{datosViaje.conductorId || "Asignando ID de nómina..."}</p>
                                    </div>
                                </div>
                                <div className="text-[11px] space-y-1 text-zinc-400">
                                    <p><span className="text-zinc-600">Destino:</span> {datosViaje.destinoTexto}</p>
                                </div>
                            </div>

                            <div className="bg-[#09090b] border border-zinc-800/50 rounded-xl p-3 flex flex-col h-[220px]">
                                <div className="flex items-center gap-1.5 border-b border-zinc-800/40 pb-2 mb-2">
                                    <MessageSquare size={12} className="text-yellow-500" />
                                    <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Canal de Coordinación</span>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[11px]">
                                    {chatMensajes.map((m) => (
                                        <div key={m.id} className={`p-2 rounded-lg max-w-[85%] ${m.senderId === user?.uid ? 'bg-zinc-800 text-zinc-100 ml-auto' : 'bg-zinc-900 text-zinc-300'}`}>
                                            <p className="leading-relaxed">{m.texto}</p>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={enviarMensajeChat} className="mt-2 flex gap-1.5">
                                    <input 
                                        type="text" 
                                        className="flex-1 bg-zinc-900 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-zinc-700" 
                                        value={nuevoMensaje} 
                                        onChange={(e) => setNuevoMensaje(e.target.value)} 
                                        placeholder="Enviar mensaje a la unidad..." 
                                    />
                                    <button type="submit" className="bg-zinc-100 text-[#09090b] px-2.5 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center">
                                        <Send size={12} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {estadoViaje === 'completado' && (
                        <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-4 text-center space-y-4">
                            <div className="w-10 h-10 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                                <CheckCircle size={20} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xs font-bold uppercase text-zinc-300 tracking-wider">Destino Alcanzado</h3>
                                <p className="text-[11px] text-zinc-500">El viaje se ha completado con éxito. Califique el servicio para cerrar la bitácora.</p>
                            </div>
                            <div className="flex justify-center gap-1.5 py-2">
                                {[1, 2, 3, 4, 5].map((num) => (
                                    <Star 
                                        key={num} 
                                        size={18} 
                                        className={`cursor-pointer transition-colors ${num <= calificacion ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-700'}`}
                                        onClick={() => setCalificacion(num)}
                                    />
                                ))}
                            </div>
                            <button 
                                onClick={procesarCalificacion}
                                className="w-full bg-zinc-100 text-[#09090b] font-bold text-xs uppercase py-2.5 rounded-xl hover:bg-zinc-200 transition-colors" 
                            >
                                Finalizar y Guardar Auditoría
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 h-[300px] md:h-auto w-full z-10 relative">
                    <MapContainer center={coordenadas} zoom={15} className="w-full h-full">
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />
                        <Marker position={coordenadas} icon={iconPasajero}>
                            <Popup><span className="text-xs font-bold font-mono">Mi Terminal Activa</span></Popup>
                        </Marker>

                        {conductoresEnLinea.map((cond) => (
                            <Marker 
                                key={cond.id} 
                                position={[cond.lastLocation.lat, cond.lastLocation.lng]} 
                                icon={iconConductor}
                            >
                                <Popup>
                                    <div className="p-1 font-mono text-[10px] text-zinc-800">
                                        <p className="font-bold">ID UNIDAD: {cond.id.substring(0, 8)}</p>
                                        <p className="uppercase text-yellow-600">ROL: {cond.sub_role || cond.rol || 'CONDUCTOR'}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>

            <footer className="z-[1000] bg-[#121214]/90 border-t border-zinc-800/40 p-3 flex justify-between items-center text-[9px] text-zinc-500 uppercase tracking-wider px-6 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
                        <span>OPERADOR ID: {user?.uid?.substring(0, 8) || "DESCONECTADO"}</span>
                    </div>
                    <div className="h-3 w-[1px] bg-zinc-800" />
                    <span className="text-zinc-400">MODO: HÍBRIDO (ATLAS / FIRESTORE SPARK)</span>
                </div>
                <div className="font-mono text-zinc-600">
                    CIMCO-UI V9.7 • LOCALPORT: 5173
                </div>
            </footer>
        </div>
    );
};

export default HomePasajero;