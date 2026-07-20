// Versión Arquitectura: V12.4 - Integración Quirúrgica de Eventos de Radar GPS e Interfaz de Mutación de Perfil/Vehículo Flota
import React, { useState, useEffect, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { API_FUNCTIONS_URL } from '@/config/api'; 
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { io } from 'socket.io-client'; 
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Bus, MapPin, Clock, CheckCircle, AlertTriangle, XCircle, Bell, User, Phone, FileText } from 'lucide-react';

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
    
    // 👤 ESTADOS DE IDENTIDAD Y MUTACIÓN DE PERFIL
    const nombreInicialFallback = user?.email ? user.email.split('@')[0].toUpperCase() : "OPERADOR FLOTA";
    const [nombreConductor, setNombreConductor] = useState(nombreInicialFallback);
    const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);
    const [datosPerfil, setDatosPerfil] = useState({
        nombre: '',
        telefono: '',
        placaVehiculo: '',
        numeroInterno: ''
    });

    // 📡 ESTADOS DE TELEMETRÍA (Alineado con el nodo operativo de la Terminal de La Jagua)
    const [posicionActual, setPosicionActual] = useState([9.3244, -73.3321]);
    const [gpsActivo, setGpsActivo] = useState(false);

    // 🔔 ESTADO PARA NOTIFICACIONES FLUIDAS (No Bloqueantes)
    const [notificacionUI, setNotificacionUI] = useState(null);

    // 🛡️ REFERENCIAS MUTABLES: Rompen el bucle infinito de reinicios del GPS y guardan canales activos
    const viajesAsignadosRef = useRef(viajesAsignados);
    const socketRef = useRef(null);

    useEffect(() => {
        viajesAsignadosRef.current = viajesAsignados;
    }, [viajesAsignados]);

    // ⚡ CONTROL DE TIEMPO DE ENFRIAMIENTO (Throttling Nativo Anti-Lock)
    const ultimaActualizacionGpsRef = useRef(0);
    const ENFRIAMIENTO_GPS_MS = 10000; // 10 segundos mínimos entre escrituras a Firestore

    // ==================================================================
    // 1. ESCUCHA REACTIVA DE IDENTIDAD DEL CONDUCTOR EN FIRESTORE
    // ==================================================================
    useEffect(() => {
        if (!user?.uid) return;

        const pathUsuarios = FIRESTORE_PATHS.usuarios || 'usuarios';
        const conductorRef = doc(db, pathUsuarios, user.uid);

        const unsubscribe = onSnapshot(conductorRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const nombreCompleto = data?.nombre || data?.displayName || data?.nombreCompleto;
                if (nombreCompleto) {
                    setNombreConductor(nombreCompleto.toUpperCase());
                }

                // Sincronizar datos locales de conductor y su vehículo asignado
                setDatosPerfil({
                    nombre: nombreCompleto || '',
                    telefono: data?.telefono || '',
                    placaVehiculo: data?.placaVehiculo || data?.vehiculo?.placa || '',
                    numeroInterno: data?.numeroInterno || data?.vehiculo?.interno || ''
                });
            }
        }, (error) => {
            console.error("🚨 [CIMCO-INTERMUNICIPAL-IDENTITY-ERROR] Fallo en lectura de perfil:", error);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // ==================================================================
    // 2. ACTUALIZACIÓN MUTABLE DE DATOS EN CALIENTE (FIRESTORE)
    // ==================================================================
    const handleGuardarPerfil = async (e) => {
        e.preventDefault();
        if (!user?.uid) return;
        setGuardandoPerfil(true);

        try {
            const pathUsuarios = FIRESTORE_PATHS.usuarios || 'usuarios';
            const conductorRef = doc(db, pathUsuarios, user.uid);

            await updateDoc(conductorRef, {
                nombre: datosPerfil.nombre,
                nombreCompleto: datosPerfil.nombre,
                telefono: datosPerfil.telefono,
                placaVehiculo: datosPerfil.placaVehiculo.toUpperCase(),
                numeroInterno: datosPerfil.numeroInterno,
                fechaActualizacionPerfil: serverTimestamp()
            });

            setMostrarModalPerfil(false);
            alert("✅ DATOS DE OPERADOR Y VEHÍCULO INTERMUNICIPAL SINCRONIZADOS");
        } catch (error) {
            console.error("🚨 [CIMCO-INTER-PROFILE-ERR] Error al actualizar datos:", error);
            alert("Error al salvar las modificaciones en el servidor central.");
        } finally {
            setGuardandoPerfil(false);
        }
    };

    // ⚡ CANAL DE EVENTOS DE SOCKETS (Sincronización fluida con el Despachador)
    useEffect(() => {
        if (!user?.uid) return;

        // Guardar en la referencia mutable para acceso global en el componente sin provocar re-renders
        socketRef.current = io(API_FUNCTIONS_URL, {
            transports: ['websocket'],
            upgrade: false
        });

        // Escuchador táctico alineador con las ráfagas emitidas por el despachador
        socketRef.current.on('servidor:nueva_solicitud', (data) => {
            console.log("🔔 Despacho capturado en segmento Cooperativa:", data);

            // Filtrar inteligentemente si la solicitud va dirigida específicamente a este conductor
            if (data?.conductorId && String(data.conductorId) !== String(user.uid)) {
                return; // Ignorar si pertenece a otro compañero de la flota
            }

            const origen = data?.origenNombre || data?.origen?.direccion || 'Terminal Central';
            const destino = data?.destinoNombre || data?.destino?.direccion || 'Dársena de Destino';
            const valorRuta = data?.tarifa || data?.oferta 
                ? `$${Number(data.tarifa || data.oferta).toLocaleString('es-CO')}` 
                : 'Tarifa Estándar Cooperativa';

            // Inyectar alerta fluida en UI sin congelar hilos de red
            setNotificacionUI({
                origen,
                destino,
                tarifa: valorRuta,
                viajeId: data?.viajeId || 'N/A'
            });
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [user]);

    // 🛰️ MOTOR DE RASTREO LOGÍSTICO (Con Acelerador de Flujo Embebido Anti-Saturación)
    useEffect(() => {
        if (!user?.uid) return;
    
        const watchId = navigator.geolocation.watchPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                
                // Actualización inmediata del estado de renderizado visual (0ms Lag UI)
                setPosicionActual([lat, lng]);
                setGpsActivo(true);
    
                // Implementación estricta de Throttling Nativo para preservar base de datos y batería
                const ahora = Date.now();
                if (ahora - ultimaActualizacionGpsRef.current < ENFRIAMIENTO_GPS_MS) {
                    return; // Mitigación atómica: omitir envío si no ha pasado el intervalo de cortesía
                }
                
                // Bloqueo inmediato del temporizador antes del await para prevenir solicitudes concurrentes paralelas
                ultimaActualizacionGpsRef.current = ahora;

                try {
                    // 1. Actualización en caliente del Core del Conductor
                    const conductorRef = doc(db, FIRESTORE_PATHS.usuarios || 'usuarios', user.uid);
                    await updateDoc(conductorRef, {
                        location: { latitude: lat, longitude: lng },
                        ultimaConexion: serverTimestamp(),
                        estadoRadar: 'INTERMUNICIPAL_ACTIVE'
                    });
    
                    // 📡 MIGRACIÓN UNIFICADA: Espejo de transmisión en tiempo real vía WebSockets hacia el despachador
                    if (socketRef.current && socketRef.current.connected) {
                        socketRef.current.emit('actualizar_radar_gps', {
                            conductorId: user.uid,
                            latitude: lat,
                            longitude: lng,
                            estadoRadar: 'INTERMUNICIPAL_ACTIVE'
                        });
                    }

                    // 2. Sincronización segura del tramo del viaje usando la referencia mutable (.current)
                    const viajeActivo = viajesAsignadosRef.current?.[0];
                    
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
                console.error("⚠️ Señal GPS perdida de antenas locales:", err);
                setGpsActivo(false);
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 7000 }
        );

        // Limpieza controlada: se ejecuta estrictamente al desmontar el Home
        return () => navigator.geolocation.clearWatch(watchId);
    }, [user?.uid]); // 🚀 Optimizado: Solo depende del ID del usuario para evitar desbastes de suscripción

    // 📋 SUSCRIPCIÓN REACTIVA A VIAJES ASIGNADOS POR EL DESPACHADOR
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
            await updateDoc(viajeRef, { 
                estado: 'EN_RUTA', 
                inicioOperativo: serverTimestamp() 
            });
            // Limpiar notificaciones si existiesen para ese viaje
            setNotificacionUI(null);
        } catch (err) {
            console.error("Error al confirmar salida en dársena:", err);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-mono antialiased relative selection:bg-yellow-500/20 selection:text-yellow-400">
            
            {/* 🔝 ENCABEZADO SUPERIOR DE CONTROL DE IDENTIDAD */}
            <div className="w-full bg-[#121214]/90 border-b border-white/5 sticky top-0 z-[50] backdrop-blur-md px-6 py-3 flex justify-between items-center">
                <div 
                    onClick={() => setMostrarModalPerfil(true)}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 group-hover:bg-yellow-500/20 transition-all">
                        <User size={15} />
                    </div>
                    <div>
                        <h2 className="text-xs font-black text-white tracking-wider uppercase flex items-center gap-1.5">
                            {nombreConductor}
                            <span className="text-[10px] text-yellow-500/70 font-normal underline lowercase group-hover:text-yellow-400">(editar)</span>
                        </h2>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">Control de Conductor y Vehículo</p>
                    </div>
                </div>

                <div className="text-[9px] uppercase tracking-wider bg-zinc-900/60 border border-white/5 px-2.5 py-1 rounded-lg text-zinc-400 font-bold">
                    Interno: {datosPerfil.numeroInterno || 'N/A'}
                </div>
            </div>

            {/* 🚨 TOAST NOTIFICACIÓN NO BLOQUEANTE (REEMPLAZO DE ALERT) */}
            {notificacionUI && (
                <div className="fixed top-24 left-4 right-4 md:left-auto md:right-6 md:w-[420px] backdrop-blur-xl bg-[#121214]/95 border-2 border-yellow-500/30 rounded-2xl p-5 shadow-[0_10px_40px_rgba(234,179,8,0.15)] z-[9999] animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                        <div className="flex items-center gap-2 text-yellow-400 font-black text-xs uppercase tracking-widest">
                            <Bell size={14} className="animate-bounce" />
                            <span>¡Nuevo Despacho Asignado!</span>
                        </div>
                        <button onClick={() => setNotificacionUI(null)} className="text-zinc-500 hover:text-white transition-colors">
                            <XCircle size={16} />
                        </button>
                    </div>
                    <div className="space-y-2 text-xs uppercase text-zinc-300">
                        <p><strong className="text-zinc-500">Origen:</strong> {notificacionUI.origen}</p>
                        <p><strong className="text-zinc-500">Destino:</strong> {notificacionUI.destino}</p>
                        <p className="pt-1"><strong className="text-zinc-500">Valor Asegurado:</strong> <span className="text-emerald-400 font-black">{notificacionUI.tarifa}</span></p>
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-3 font-sans lowercase">Sincronizado de forma atómica con la base de datos de la terminal.</p>
                </div>
            )}

            {/* 🗺️ PANEL DE CONTROL VISUAL - VISOR MAPA */}
            <div className="h-72 w-full relative z-0 border-b border-white/5">
                <MapContainer center={posicionActual} zoom={13} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <AutoCenter position={posicionActual} />
                    <Marker position={posicionActual} icon={DefaultIcon} />
                </MapContainer>
                
                <div className="absolute top-4 right-4 z-[1000] backdrop-blur-md bg-[#121214]/80 px-4 py-1.5 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl">
                    <div className={`w-2 h-2 rounded-full ${gpsActivo ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    {gpsActivo ? 'Rastreo Satelital Activo' : 'Señal GPS Perdida'}
                </div>
            </div>

            {/* 📦 CUERPO DE OPERACIONES INTERMUNICIPALES */}
            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-lg font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2.5">
                    <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-yellow-400">
                        <Bus size={20} />
                    </div>
                    <span>Consola de Flota Intermunicipal</span>
                </h1>

                <div className="space-y-4">
                    {loading ? (
                        <div className="backdrop-blur-md bg-[#121214]/40 p-8 text-center border border-white/5 rounded-2xl flex flex-col items-center gap-2">
                            <div className="w-5 h-5 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
                            <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Leyendo Dársenas...</p>
                        </div>
                    ) : viajesAsignados.length === 0 ? (
                        <div className="backdrop-blur-md bg-[#121214]/20 p-10 text-center border border-dashed border-white/5 rounded-2xl shadow-inner">
                            <AlertTriangle size={24} className="text-zinc-600 mx-auto mb-2" />
                            <p className="text-xs uppercase text-zinc-500 tracking-widest font-bold">Esperando Despacho Central</p>
                            <p className="text-[9px] text-zinc-600 max-w-sm mx-auto mt-1 uppercase font-sans">Mantén la aplicación abierta. Tu cooperativa asignará tu ruta basándose en tu orden de llegada en la terminal.</p>
                        </div>
                    ) : (
                        viajesAsignados.map(viaje => (
                            <div key={viaje.id} className="backdrop-blur-md bg-[#121214]/70 border border-white/5 p-6 rounded-2xl shadow-2xl hover:border-white/10 transition-all duration-300 animate-fadeIn">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-between items-start mb-6 border-b border-white/5 pb-4">
                                    <div>
                                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Ruta y Destino Autorizado</p>
                                        <p className="text-sm font-black text-white flex items-center gap-2">
                                            <MapPin size={15} className="text-yellow-500 shrink-0" /> {viaje.destino || 'N/A'}
                                        </p>
                                        <p className="text-[9px] text-zinc-400 font-sans mt-1">ID Contable: {viaje.id}</p>
                                    </div>
                                    <div className="sm:text-right">
                                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Liquidación de Tarifa</p>
                                        <p className="text-base font-black text-emerald-400">${(parseFloat(viaje.tarifa) || 0).toLocaleString('es-CO')} COP</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => confirmarViaje(viaje.id)}
                                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[11px] tracking-widest py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.15)] flex items-center justify-center gap-2 active:scale-[0.98] border border-yellow-300"
                                >
                                    <CheckCircle size={15} /> Confirmar Salida de Terminal
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 🛠️ MODAL DE EDICIÓN FLUIDO - DATOS COMPAÑÍA Y VEHÍCULO */}
            {mostrarModalPerfil && (
                <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-[#121214] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2 text-xs font-black text-yellow-400 uppercase tracking-widest">
                                <Bus size={16} />
                                <span>Ajustar Datos de Ruta</span>
                            </div>
                            <button 
                                onClick={() => setMostrarModalPerfil(false)}
                                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2.5 py-1 rounded-md uppercase transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>

                        <form onSubmit={handleGuardarPerfil} className="space-y-4 text-xs uppercase">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-zinc-500 tracking-wider flex items-center gap-1"><User size={11} /> Nombre del Conductor</label>
                                <input 
                                    type="text" 
                                    required
                                    value={datosPerfil.nombre}
                                    onChange={(e) => setDatosPerfil({...datosPerfil, nombre: e.target.value})}
                                    className="w-full bg-zinc-950 text-white border border-white/5 rounded-xl p-3 font-bold focus:outline-none focus:border-yellow-500 transition-colors uppercase"
                                    placeholder="Nombre completo"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-zinc-500 tracking-wider flex items-center gap-1"><Phone size={11} /> Teléfono Móvil</label>
                                <input 
                                    type="tel" 
                                    required
                                    value={datosPerfil.telefono}
                                    onChange={(e) => setDatosPerfil({...datosPerfil, telefono: e.target.value})}
                                    className="w-full bg-zinc-950 text-white border border-white/5 rounded-xl p-3 font-bold focus:outline-none focus:border-yellow-500 transition-colors"
                                    placeholder="Número de celular"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-500 tracking-wider flex items-center gap-1"><FileText size={11} /> Placa de Vehículo</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={datosPerfil.placaVehiculo}
                                        onChange={(e) => setDatosPerfil({...datosPerfil, placaVehiculo: e.target.value})}
                                        className="w-full bg-zinc-950 text-white border border-white/5 rounded-xl p-3 font-bold focus:outline-none focus:border-yellow-500 transition-colors uppercase"
                                        placeholder="Ej: STR543"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-500 tracking-wider flex items-center gap-1"><Bus size={11} /> Número Interno</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={datosPerfil.numeroInterno}
                                        onChange={(e) => setDatosPerfil({...datosPerfil, numeroInterno: e.target.value})}
                                        className="w-full bg-zinc-950 text-white border border-white/5 rounded-xl p-3 font-bold focus:outline-none focus:border-yellow-500 transition-colors"
                                        placeholder="Ej: 045"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={guardandoPerfil}
                                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[11px] tracking-widest py-3.5 rounded-xl transition-all shadow-[0_4px_12px_rgba(234,179,8,0.2)] disabled:opacity-50"
                                >
                                    {guardandoPerfil ? 'Sincronizando...' : 'Actualizar Datos de Flota'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeIntermunicipal;