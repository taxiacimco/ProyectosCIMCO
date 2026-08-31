// Versión Arquitectura: V20.2 - Migración de Proveedor de Mapa a OpenStreetMap Público
/**
 * Ubicación: frontend\src\pages\intermunicipal\HomeIntermunicipal.jsx
 * Misión: Consola operativa del Conductor Intermunicipal conectada a la central de despachos.
 * Ajuste V20.2: Reemplazo de la capa de tiles de carto.com por el tile layer público de OpenStreetMap.
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { authService } from '@/services/authService';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Bus, MapPin, CheckCircle, AlertTriangle, XCircle, Bell, User, Phone, FileText, Building2, Send, DollarSign, Flag } from 'lucide-react';

// Corrección de Iconos Leaflet para despliegue intermunicipal
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

// Componente para centrado dinámico del mapa
const AutoCenter = ({ position }) => {
    const map = useMap();
    useEffect(() => { 
        if (position && Array.isArray(position) && position.length === 2 && !isNaN(position[0]) && !isNaN(position[1])) {
            map.setView(position, 13); 
        }
    }, [position, map]);
    return null;
};

export default function HomeIntermunicipal() {
    // 🛡️ Guardas de Seguridad y Contextos Centralizados
    const authContext = useAuth ? useAuth() : {};
    const user = authContext?.user || null;
    const token = authContext?.token || localStorage.getItem('token') || user?.token || "";
    
    // 📡 Consumo Resiliente del Socket Centralizado (Canal de Empresa y Pujas)
    const socketContext = useSocket ? useSocket() : {};
    const socket = socketContext?.socket || null;
    const isConnected = socketContext?.isConnected ?? Boolean(socket?.connected);
    const enviarOfertaSocket = socketContext?.enviarOferta || null;

    const idConductor = user?.id || user?._id || user?.uid || "";

    const [viajesAsignados, setViajesAsignados] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 👤 ESTADOS DE IDENTIDAD Y MUTACIÓN DE PERFIL CON PARÁMETROS OPERATIVOS
    const nombreInicialFallback = user?.email ? user.email.split('@')[0].toUpperCase() : "OPERADOR FLOTA";
    const [nombreConductor, setNombreConductor] = useState(nombreInicialFallback);
    const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);
    const [datosPerfil, setDatosPerfil] = useState({
        nombre: '',
        telefono: '',
        empresa: '',
        empresaId: '',
        terminal: '',
        placaVehiculo: '',
        numeroInterno: ''
    });

    // 📡 ESTADOS DE TELEMETRÍA (Alineado con el nodo operativo de la Terminal)
    const [posicionActual, setPosicionActual] = useState([9.3244, -73.3321]);
    const [gpsActivo, setGpsActivo] = useState(false);

    // 🔔 ESTADOS PARA NOTIFICACIONES FLUIDAS Y PUJAS / CONTRAOFERTAS
    const [notificacionUI, setNotificacionUI] = useState(null);
    const [montoOfertaInput, setMontoOfertaInput] = useState("");
    const [enviandoOferta, setEnviandoOferta] = useState(false);

    // 🛡️ REFERENCIAS MUTABLES Anti-Bucle y Throttling de Socket Telemetría
    const viajesAsignadosRef = useRef(viajesAsignados);
    useEffect(() => {
        viajesAsignadosRef.current = viajesAsignados;
    }, [viajesAsignados]);

    const ultimaActualizacionGpsRef = useRef(0);
    const ENFRIAMIENTO_SOCKET_GPS_MS = 5000; // Throttling controlled de 5s para emisión de sockets

    // Auto-completar el monto con el valor sugerido cuando se dispara una notificación nueva
    useEffect(() => {
        if (notificacionUI?.valorBase) {
            setMontoOfertaInput(String(notificacionUI.valorBase));
        } else {
            setMontoOfertaInput("");
        }
    }, [notificacionUI]);

    // ==================================================================
    // 1. ESCUCHA REACTIVA DE IDENTIDAD DEL CONDUCTOR EN FIRESTORE / REST
    // ==================================================================
    useEffect(() => {
        if (!user?.uid) return;

        const pathUsuarios = FIRESTORE_PATHS?.usuarios || FIRESTORE_PATHS?.users || 'usuarios';
        const conductorRef = doc(db, pathUsuarios, user.uid);

        const unsubscribe = onSnapshot(conductorRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const nombreCompleto = data?.nombre || data?.displayName || data?.fullName || data?.nombreCompleto;
                if (nombreCompleto) {
                    setNombreConductor(nombreCompleto.toUpperCase());
                }

                setDatosPerfil({
                    nombre: nombreCompleto || user?.nombre || '',
                    telefono: data?.telefonoMovil || data?.telefono || user?.telefonoMovil || user?.telefono || '',
                    empresa: data?.empresa || data?.empresaTransporte || data?.cooperativa || user?.empresa || user?.cooperativa || '',
                    empresaId: data?.empresaId || data?.empresa_id || user?.empresaId || user?.empresa_id || '',
                    terminal: data?.terminal || data?.terminalOrigen || user?.terminal || '',
                    placaVehiculo: data?.placaVehiculo || data?.placa || data?.vehiculo?.placa || user?.placaVehiculo || '',
                    numeroInterno: data?.numeroInterno || data?.vehiculo?.interno || user?.numeroInterno || ''
                });
            }
        }, (error) => {
            console.error("🚨 [CIMCO-INTERMUNICIPAL-IDENTITY-ERROR] Fallo en lectura de perfil:", error);
        });

        return () => unsubscribe();
    }, [user]);

    // ==================================================================
    // 2. ACTUALIZACIÓN MUTABLE DE DATOS MEDIANTE authService CENTRALIZADO
    // ==================================================================
    const handleGuardarPerfil = async (e) => {
        e.preventDefault();
        if (!idConductor) return;
        setGuardandoPerfil(true);

        try {
            // Esquema estandarizado obligatorio (telefonoMovil, nombre, foto_perfil)
            const payloadPerfil = {
                nombre: datosPerfil.nombre,
                telefonoMovil: datosPerfil.telefono,
                foto_perfil: user?.foto_perfil || user?.photoURL || '',
                empresa: datosPerfil.empresa,
                empresaTransporte: datosPerfil.empresa,
                empresaId: datosPerfil.empresaId,
                terminal: datosPerfil.terminal,
                terminalOrigen: datosPerfil.terminal,
                placaVehiculo: datosPerfil.placaVehiculo.toUpperCase(),
                numeroInterno: datosPerfil.numeroInterno
            };

            // Invocación estandarizada y centralizada a través de authService.updateProfile
            if (typeof authService?.updateProfile === 'function') {
                await authService.updateProfile(payloadPerfil);
            } else if (typeof authContext?.updateProfile === 'function') {
                await authContext.updateProfile(payloadPerfil);
            } else {
                console.warn("⚠️ Servicio updateProfile no disponible, aplicando respaldo en Firestore.");
            }

            // Sincronización secundaria en Firestore usando FIRESTORE_PATHS
            if (user?.uid) {
                const pathUsuarios = FIRESTORE_PATHS?.usuarios || FIRESTORE_PATHS?.users || 'usuarios';
                const conductorRef = doc(db, pathUsuarios, user.uid);
                await updateDoc(conductorRef, {
                    ...payloadPerfil,
                    fechaActualizacionPerfil: serverTimestamp()
                });
            }

            setMostrarModalPerfil(false);
            alert("✅ PARÁMETROS OPERATIVOS Y DATOS DE VEHÍCULO INTERMUNICIPAL SINCRONIZADOS");
        } catch (error) {
            console.error("🚨 [CIMCO-INTER-PROFILE-ERR] Error al actualizar datos:", error);
            alert("Error al salvar las modificaciones en el servidor central.");
        } finally {
            setGuardandoPerfil(false);
        }
    };

    // ==================================================================
    // 3. EVENTOS DE SOCKETS Y SUSCRIPCIÓN CON FILTRO POR EMPRESA
    // ==================================================================
    useEffect(() => {
        if (!socket) return;

        // Suscripción a salas intermunicipales sin forzar reconexiones del cliente
        if (isConnected) {
            socket.emit('unirse_sala', 'intermunicipal');
            if (idConductor) {
                socket.emit('unirse_sala', `conductor_${idConductor}`);
            }
        }

        const handleNuevoViaje = (data) => {
            console.log("🔔 Despacho/Servicio capturado:", data);

            const payloadData = data?.payload || data?.viaje || data?.solicitud || data;
            if (!payloadData) return;

            // 🛡️ REGLA CRÍTICA DE FILTRADO POR EMPRESA_ID / COOPERATIVA
            const targetEmpresaId = String(payloadData?.empresaId || payloadData?.empresa_id || "").trim();
            const targetEmpresaNombre = String(payloadData?.empresa || payloadData?.cooperativa || "").trim().toUpperCase();
            
            const miEmpresaId = String(user?.empresaId || user?.empresa_id || datosPerfil.empresaId || "").trim();
            const miEmpresaNombre = String(datosPerfil.empresa || user?.empresa || user?.cooperativa || "").trim().toUpperCase();

            // Si la solicitud incluye identificadores de empresa, verificar que coincidan
            const coincideId = targetEmpresaId && miEmpresaId && targetEmpresaId === miEmpresaId;
            const coincideNombre = targetEmpresaNombre && miEmpresaNombre && targetEmpresaNombre === miEmpresaNombre;

            // Si la solicitud especifica una empresa y NO coincide ni por ID ni por Nombre, descartar la alerta
            if ((targetEmpresaId || targetEmpresaNombre) && !coincideId && !coincideNombre) {
                console.warn("⛔ [SOLICITUD DESCARTADA] Pertenece a otra cooperativa o flota:", {
                    solicitudEmpresaId: targetEmpresaId,
                    solicitudEmpresa: targetEmpresaNombre,
                    conductorEmpresaId: miEmpresaId,
                    conductorEmpresa: miEmpresaNombre
                });
                return;
            }

            const targetConductorId = payloadData?.conductorId || payloadData?.conductor;

            // Filtrar si la solicitud va dirigida explícitamente a otro conductor determinado
            if (targetConductorId && String(targetConductorId) !== String(idConductor) && String(targetConductorId) !== String(user?.uid)) {
                return;
            }

            const origen = payloadData?.origen || payloadData?.origenNombre || 'Terminal Central';
            const destino = payloadData?.destino || payloadData?.destinoNombre || 'Dársena de Destino';
            const valorRuta = payloadData?.valorPasaje || payloadData?.tarifa || payloadData?.valor || 0;
            const viajeId = payloadData?.viajeId || payloadData?.solicitudId || payloadData?._id || payloadData?.id || 'N/A';

            setNotificacionUI({
                origen,
                destino,
                tarifa: valorRuta ? `$${Number(valorRuta).toLocaleString('es-CO')}` : 'Tarifa Estándar Cooperativa',
                valorBase: Number(valorRuta) || 0,
                viajeId,
                empresaId: targetEmpresaId || miEmpresaId,
                payloadRaw: payloadData
            });
        };

        socket.on('nuevo_viaje', handleNuevoViaje);
        socket.on('servidor:nueva_solicitud', handleNuevoViaje);
        socket.on('nuevo_servicio_disponible', handleNuevoViaje);

        return () => {
            socket.off('nuevo_viaje', handleNuevoViaje);
            socket.off('servidor:nueva_solicitud', handleNuevoViaje);
            socket.off('nuevo_servicio_disponible', handleNuevoViaje);
        };
    }, [socket, isConnected, idConductor, user, datosPerfil.empresa, datosPerfil.empresaId]);

    // ==================================================================
    // 4. EMISIÓN DE CONTRAOFERTA EN TIEMPO REAL
    // ==================================================================
    const handleEnviarOferta = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        if (!notificacionUI || !montoOfertaInput || Number(montoOfertaInput) <= 0) {
            alert("Por favor ingrese un valor de contraoferta válido.");
            return;
        }

        setEnviandoOferta(true);
        const montoNumerico = Number(montoOfertaInput);

        const payloadOferta = {
            viajeId: notificacionUI.viajeId,
            solicitudId: notificacionUI.viajeId,
            conductorId: idConductor,
            conductor: idConductor,
            nombreConductor: nombreConductor,
            placaVehiculo: datosPerfil.placaVehiculo,
            placa: datosPerfil.placaVehiculo,
            numeroInterno: datosPerfil.numeroInterno,
            monto: montoNumerico,
            valor: montoNumerico,
            tarifa: montoNumerico,
            empresaId: String(user?.empresaId || user?.empresa_id || datosPerfil.empresaId || ""),
            empresa: datosPerfil.empresa || user?.empresa || "",
            origen: notificacionUI.origen,
            destino: notificacionUI.destino,
            timestamp: new Date().toISOString()
        };

        try {
            // Invocar método del contexto de sockets si existe
            if (typeof enviarOfertaSocket === 'function') {
                enviarOfertaSocket(payloadOferta);
            } else if (socket && isConnected) {
                socket.emit('enviar_oferta', payloadOferta);
                socket.emit('oferta_servicio', payloadOferta);
            }

            alert(`✅ Contraoferta de $${montoNumerico.toLocaleString('es-CO')} COP transmitida a la central.`);
            setNotificacionUI(null);
            setMontoOfertaInput("");
        } catch (err) {
            console.error("🚨 Error al transmitir la propuesta de tarifa:", err);
            alert("No se pudo enviar la propuesta. Compruebe la conexión.");
        } finally {
            setEnviandoOferta(false);
        }
    };

    // ==================================================================
    // 5. MOTOR DE RASTREO SATELITAL (SOCKET TELEMETRÍA EXCLUSIVO - CERO WRITES EN FIRESTORE)
    // ==================================================================
    useEffect(() => {
        if (!idConductor) return;
    
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                
                setPosicionActual([lat, lng]);
                setGpsActivo(true);
    
                const ahora = Date.now();
                if (ahora - ultimaActualizacionGpsRef.current < ENFRIAMIENTO_SOCKET_GPS_MS) {
                    return;
                }
                
                ultimaActualizacionGpsRef.current = ahora;

                // Transmisión WebSocket en tiempo real hacia la central de despachos
                if (socket && isConnected) {
                    socket.emit('actualizar_radar_gps', {
                        conductorId: idConductor,
                        latitude: lat,
                        longitude: lng,
                        estadoRadar: 'INTERMUNICIPAL_ACTIVE'
                    });
                }
            },
            (err) => {
                console.error("⚠️ Señal GPS perdida de antenas locales:", err);
                setGpsActivo(false);
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 7000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [idConductor, socket, isConnected]);

    // ==================================================================
    // 6. SUSCRIPCIÓN REACTIVA A VIAJES ASIGNADOS EN RAMPA DE SALIDA Y EN RUTA
    // ==================================================================
    useEffect(() => {
        if (!user?.uid && !idConductor) return;

        const pathColeccion = FIRESTORE_PATHS?.viajesIntermunicipales || 'viajes_intermunicipales';
        const q = query(
            collection(db, pathColeccion),
            where('conductorId', 'in', [user?.uid, idConductor].filter(Boolean)),
            where('estado', 'in', ['ASIGNADO', 'asignado', 'EN_RUTA', 'en_ruta'])
        );

        const unsub = onSnapshot(q, (snapshot) => {
            setViajesAsignados(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (err) => {
            console.error("🚨 Error consultando viajes asignados en rampa:", err);
            setLoading(false);
        });

        return () => unsub();
    }, [user?.uid, idConductor]);

    // ==================================================================
    // 7. CONFIRMACIÓN DE SALIDA DE TERMINAL / EN RUTA Y FINALIZACIÓN DE CICLO
    // ==================================================================
    const cambiarEstadoViaje = async (idViaje, nuevoEstado) => {
        if (!idViaje || !nuevoEstado) return;

        try {
            const pathViajes = FIRESTORE_PATHS?.viajesIntermunicipales || 'viajes_intermunicipales';
            const viajeRef = doc(db, pathViajes, idViaje);
            
            const actualizacionDoc = {
                estado: nuevoEstado,
                ...(nuevoEstado === 'EN_RUTA' ? { inicioOperativo: serverTimestamp() } : {}),
                ...(nuevoEstado === 'FINALIZADO' ? { finOperativo: serverTimestamp() } : {})
            };

            await updateDoc(viajeRef, actualizacionDoc);

            if (socket && isConnected) {
                socket.emit('cambio_estado_viaje', {
                    viajeId: idViaje,
                    conductorId: idConductor,
                    estado: nuevoEstado
                });
            }

            setNotificacionUI(null);
        } catch (err) {
            console.error(`🚨 Error al cambiar estado a ${nuevoEstado}:`, err);
            alert(`No se pudo actualizar el estado del viaje a ${nuevoEstado}.`);
        }
    };

    const confirmarViaje = (idViaje) => cambiarEstadoViaje(idViaje, 'EN_RUTA');
    const finalizarViaje = (idViaje) => cambiarEstadoViaje(idViaje, 'FINALIZADO');

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-mono antialiased relative selection:bg-yellow-500/20 selection:text-yellow-400">
            
            {/* 🔝 ENCABEZADO SUPERIOR DE CONTROL DE IDENTIDAD Y PARÁMETROS OPERATIVOS */}
            <div className="w-full bg-[#121214]/90 border-b border-white/5 sticky top-0 z-[50] backdrop-blur-md px-6 py-3 flex justify-between items-center flex-wrap gap-2">
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

                <div className="flex items-center gap-2 flex-wrap text-[9px] uppercase tracking-wider font-bold">
                    <div className="bg-zinc-900/60 border border-white/5 px-2.5 py-1 rounded-lg text-zinc-400">
                        Empresa: <span className="text-yellow-400 font-black">{datosPerfil.empresa || 'N/A'}</span>
                    </div>
                    <div className="bg-zinc-900/60 border border-white/5 px-2.5 py-1 rounded-lg text-zinc-400">
                        Terminal: <span className="text-yellow-400 font-black">{datosPerfil.terminal || 'N/A'}</span>
                    </div>
                    <div className="bg-zinc-900/60 border border-white/5 px-2.5 py-1 rounded-lg text-zinc-400">
                        Interno: <span className="text-yellow-400 font-black">{datosPerfil.numeroInterno || 'N/A'}</span>
                    </div>
                </div>
            </div>

            {/* 🚨 TOAST NOTIFICACIÓN DE NUEVO SERVICIO / DESPACHO CON CONTRAOFERTA */}
            {notificacionUI && (
                <div className="fixed top-24 left-4 right-4 md:left-auto md:right-6 md:w-[420px] backdrop-blur-xl bg-[#121214]/95 border-2 border-yellow-500/30 rounded-2xl p-5 shadow-[0_10px_40px_rgba(234,179,8,0.15)] z-[9999] animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                        <div className="flex items-center gap-2 text-yellow-400 font-black text-xs uppercase tracking-widest">
                            <Bell size={14} className="animate-bounce" />
                            <span>¡Nuevo Servicio Disponible!</span>
                        </div>
                        <button onClick={() => setNotificacionUI(null)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                            <XCircle size={16} />
                        </button>
                    </div>
                    
                    <div className="space-y-1.5 text-xs uppercase text-zinc-300">
                        <p><strong className="text-zinc-500">Origen:</strong> {notificacionUI.origen}</p>
                        <p><strong className="text-zinc-500">Destino:</strong> {notificacionUI.destino}</p>
                        <p className="pt-0.5"><strong className="text-zinc-500">Tarifa Sugerida:</strong> <span className="text-emerald-400 font-black">{notificacionUI.tarifa}</span></p>
                    </div>

                    {/* 💵 CAJA DE CONTRAOFERTA Y ACCIONES DE PUJA */}
                    <form onSubmit={handleEnviarOferta} className="mt-4 pt-3 border-t border-white/5 space-y-3">
                        <div>
                            <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                                Propuesta de Tarifas / Contraoferta (COP)
                            </label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3 text-emerald-400 font-black text-xs">$</span>
                                <input 
                                    type="number"
                                    required
                                    min="1000"
                                    step="500"
                                    value={montoOfertaInput}
                                    onChange={(e) => setMontoOfertaInput(e.target.value)}
                                    placeholder="Ej. 25000"
                                    className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:border-yellow-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={enviandoOferta || !montoOfertaInput || Number(montoOfertaInput) <= 0}
                                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-black uppercase text-[10px] tracking-wider py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Send size={12} />
                                {enviandoOferta ? "Transmitiendo..." : "Enviar Oferta"}
                            </button>
                            {notificacionUI.viajeId && (
                                <button
                                    type="button"
                                    onClick={() => confirmarViaje(notificacionUI.viajeId)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-wider px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    title="Aceptar viaje tarifa directa"
                                >
                                    <CheckCircle size={12} />
                                    Aceptar
                                </button>
                            )}
                        </div>
                    </form>

                    <p className="text-[9px] text-zinc-500 mt-3 font-sans lowercase">Sincronizado de forma atómica con la central de despachos.</p>
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
                            <p className="text-[9px] text-zinc-600 max-w-sm mx-auto mt-1 uppercase font-sans">Mantén la aplicación abierta. El despachador de terminal te asignará la ruta directamente a la unidad.</p>
                        </div>
                    ) : (
                        viajesAsignados.map(viaje => {
                            const tarifaCalculada = Number(viaje.tarifa || viaje.valorPasaje || 0);
                            const estadoNormalizado = String(viaje.estado || '').toUpperCase();
                            const esEnRuta = estadoNormalizado === 'EN_RUTA';

                            return (
                                <div key={viaje.id} className="backdrop-blur-md bg-[#121214]/70 border border-white/5 p-6 rounded-2xl shadow-2xl hover:border-white/10 transition-all duration-300">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-between items-start mb-6 border-b border-white/5 pb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Ruta y Destino Autorizado</p>
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase border ${
                                                    esEnRuta ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                                }`}>
                                                    {esEnRuta ? 'En Ruta' : 'Asignado en Dársena'}
                                                </span>
                                            </div>
                                            <p className="text-sm font-black text-white flex items-center gap-2">
                                                <MapPin size={15} className="text-yellow-500 shrink-0" /> {viaje.origen ? `${viaje.origen} ➔ ` : ''}{viaje.destino || 'N/A'}
                                            </p>
                                            <p className="text-[9px] text-zinc-400 font-sans mt-1">ID Contable: {viaje.id}</p>
                                        </div>
                                        <div className="sm:text-right">
                                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Liquidación de Tarifa</p>
                                            <p className="text-base font-black text-emerald-400">${tarifaCalculada.toLocaleString('es-CO')} COP</p>
                                        </div>
                                    </div>

                                    {!esEnRuta ? (
                                        <button 
                                            onClick={() => confirmarViaje(viaje.id)}
                                            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[11px] tracking-widest py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.15)] flex items-center justify-center gap-2 active:scale-[0.98] border border-yellow-300 cursor-pointer"
                                        >
                                            <CheckCircle size={15} /> Confirmar Salida de Terminal (En Ruta)
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => finalizarViaje(viaje.id)}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[11px] tracking-widest py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 active:scale-[0.98] border border-emerald-400 cursor-pointer"
                                        >
                                            <Flag size={15} /> Finalizar Servicio Intermunicipal
                                        </button>
                                    )}
                                </div>
                            );
                        })
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
                                <span>Ajustar Datos de Ruta y Operación</span>
                            </div>
                            <button 
                                onClick={() => setMostrarModalPerfil(false)}
                                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2.5 py-1 rounded-md uppercase transition-colors cursor-pointer"
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
                                    <label className="text-[9px] font-black text-zinc-500 tracking-wider flex items-center gap-1"><Building2 size={11} /> Empresa / Cooperativa</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={datosPerfil.empresa}
                                        onChange={(e) => setDatosPerfil({...datosPerfil, empresa: e.target.value})}
                                        className="w-full bg-zinc-950 text-white border border-white/5 rounded-xl p-3 font-bold focus:outline-none focus:border-yellow-500 transition-colors uppercase"
                                        placeholder="Ej: Copetran"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-500 tracking-wider flex items-center gap-1"><MapPin size={11} /> Terminal Base</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={datosPerfil.terminal}
                                        onChange={(e) => setDatosPerfil({...datosPerfil, terminal: e.target.value})}
                                        className="w-full bg-zinc-950 text-white border border-white/5 rounded-xl p-3 font-bold focus:outline-none focus:border-yellow-500 transition-colors uppercase"
                                        placeholder="Ej: Terminal Central"
                                    />
                                </div>
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
                                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[11px] tracking-widest py-3.5 rounded-xl transition-all shadow-[0_4px_12px_rgba(234,179,8,0.2)] disabled:opacity-50 cursor-pointer"
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
}