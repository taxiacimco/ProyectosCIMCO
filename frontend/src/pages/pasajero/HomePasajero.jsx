// Versión Arquitectura: V14.6 - Estandarización de Colección de Billetera y Limpieza de Select de Modalidad Flota
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\HomePasajero.jsx
 * Misión: Emisión activa de telemetría, solicitud de servicios con soporte multipago, verificación estricta de hardware (GPS), edición de perfil y pasarela de billetera.
 * Ajuste V14.6: Estandarización de la lectura de la billetera desde FIRESTORE_PATHS.wallets con fallback retrocompatible hacia usuarios y corrección del string de selección intermunicipal.
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, auth as firebaseAuth, FIRESTORE_PATHS } from '@/config/firebase'; 
import { collection, onSnapshot, query, addDoc, serverTimestamp, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { useGpsGuard } from '@/hooks/useGpsGuard';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Compass, Clock, CheckCircle, Navigation, Bike, Users, Package, Milestone, LogOut, DollarSign, Send, MessageSquare, Activity, Wallet, QrCode, Banknote, ShieldAlert, User, Edit3, X, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModalCalificacion from '@/components/ModalCalificacion';
import GpsRequiredModal from '@/components/shared/GpsRequiredModal';
import { API_CORE_URL } from '@/config/api'; 
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io } from 'socket.io-client';

// 🛡️ Reparación de Assets de Leaflet para entornos empaquetados por Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 🎨 Generación Dinámica de Despliegue de Unidades en Radar Geoespacial
const crearIconoVehiculo = (tipo) => {
    let colorHex = '#22d3ee'; // Cyan para Mototaxi estándar
    if (tipo === 'motocarga') colorHex = '#a855f7'; // Púrpura de Carga Elite
    if (tipo === 'motoparrillero') colorHex = '#eab308'; // Oro Premium
    if (tipo === 'intermunicipal') colorHex = '#f97316'; // Naranja Troncal

    return L.divIcon({
        className: 'custom-vehicle-icon',
        html: `<div style="background-color: ${colorHex};" class="w-7 h-7 rounded-full border-2 border-[#121214] shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center text-black animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });
};

const IconoPasajero = L.divIcon({
    className: 'custom-passenger-icon',
    html: `<div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#121214] shadow-[0_0_10px_rgba(16,185,129,0.4)] flex items-center justify-center text-black"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6"/></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const ActualizadorMapa = ({ centro }) => {
    const mapa = useMap();
    useEffect(() => {
        if (centro && Array.isArray(centro) && centro[0] !== undefined && centro[1] !== undefined) {
            mapa.setView(centro, mapa.getZoom());
        }
    }, [centro, mapa]);
    return null;
};

const HomePasajero = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    // 🛡️ Integración Hook Perimetral de Monitoreo GPS y Guardas Anti-Undefined
    const { isGpsValid, showGpsModal, checkGpsStatus, coordenadasPasajero, reintentarGps } = useGpsGuard();

    // Matrices de Estado Reactivo
    const [coordenadas, setCoordenadas] = useState([9.718, -73.351]); // La Jagua de Ibirico Fallback
    const [conductoresActivos, setConductoresActivos] = useState([]);
    const [tipoServicio, setTipoServicio] = useState('mototaxi');
    const [metodoPago, setMetodoPago] = useState('EFECTIVO');
    const [destinoText, setDestinoText] = useState('');
    const [estadoViaje, setEstadoViaje] = useState('IDLE'); 
    const [datosConductor, setDatosConductor] = useState(null);
    const [rideId, setRideId] = useState(null);
    const [procesandoPeticion, setProcesandoPeticion] = useState(false);
    const [errorInterno, setErrorInterno] = useState('');
    const [mostrarModalCalificacion, setMostrarModalCalificacion] = useState(false);
    
    // 🗲 Estados de la UI / Secciones dinámicas inferiores
    const [seccionActiva, setSeccionActiva] = useState('radar'); // 'radar' | 'billetera'
    const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);
    
    // 🔄 Sincronización dinámica de perfil extendido desde Firestore
    const [perfilFirestore, setPerfilFirestore] = useState({
        nombre: 'Cargando...',
        telefono: '',
        saldoBilletera: 0
    });

    // Inputs editables del perfil
    const [inputNombre, setInputNombre] = useState('');
    const [inputTelefono, setInputTelefono] = useState('');
    const [montoRecargaSimulada, setMontoRecargaSimulada] = useState('20000');

    const socketRef = useRef(null);
    
    const uidUsuario = user?.uid || user?.id || user?._id || 'ANÓNIMO';
    const idPasajeroCorto = String(uidUsuario).slice(0, 8);

    // Conexión Dinámica de Sockets mapeada al Gateway del Core API
    useEffect(() => {
        const socketUrl = API_CORE_URL ? API_CORE_URL.replace('/api', '') : 'http://192.168.100.34:3000';
        socketRef.current = io(socketUrl, {
            transports: ['websocket'],
            reconnectionAttempts: 5
        });

        console.log(`📡 [CIMCO-SOCKETS] Canal de telemetría enganchado a gateway: ${socketUrl}`);

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                console.log("🔌 [CIMCO-SOCKETS] Canal de telemetría desconectado de forma segura.");
            }
        };
    }, []);

    // 🔄 Streaming reactivo de datos de perfil y billetera del Pasajero en Firestore
    useEffect(() => {
        if (!uidUsuario || uidUsuario === 'ANÓNIMO') return;
        
        const pathUsuarios = FIRESTORE_PATHS?.usuarios || 'usuarios';
        const docRefUser = doc(db, pathUsuarios, uidUsuario);
        
        const unsubscribeUser = onSnapshot(docRefUser, (snapshotUser) => {
            let nombreBase = user?.nombre || user?.displayName || 'Pasajero Operativo';
            let telefonoBase = '';
            let saldoBase = 0;

            if (snapshotUser.exists()) {
                const dataUser = snapshotUser.data();
                nombreBase = dataUser.nombre || nombreBase;
                telefonoBase = dataUser.telefono || '';
                saldoBase = typeof dataUser.saldoBilletera === 'number' ? dataUser.saldoBilletera : (typeof dataUser.balance === 'number' ? dataUser.balance : 0);
            }

            setPerfilFirestore((prev) => ({
                ...prev,
                nombre: nombreBase,
                telefono: telefonoBase,
                saldoBilletera: saldoBase
            }));
            setInputNombre(nombreBase);
            setInputTelefono(telefonoBase);
        }, (error) => {
            console.error("❌ [PERFIL-FIRESTORE] Error cargando perfil:", error);
        });

        // 🏦 Subscripción en tiempo real al nodo unificado de Billeteras (FIRESTORE_PATHS.wallets)
        const pathWallets = FIRESTORE_PATHS?.wallets || 'wallets';
        const docRefWallet = doc(db, pathWallets, uidUsuario);

        const unsubscribeWallet = onSnapshot(docRefWallet, (snapshotWallet) => {
            if (snapshotWallet.exists()) {
                const walletData = snapshotWallet.data();
                const saldoReal = typeof walletData?.balance === 'number' 
                    ? walletData.balance 
                    : (typeof walletData?.saldo === 'number' ? walletData.saldo : 0);

                setPerfilFirestore((prev) => ({
                    ...prev,
                    saldoBilletera: saldoReal
                }));
            }
        }, (error) => {
            console.warn("⚠️ [WALLET-FIRESTORE] Advertencia al suscribir canal de billetera:", error);
        });

        return () => {
            unsubscribeUser();
            unsubscribeWallet();
        };
    }, [uidUsuario, user]);

    // Sincronización Automática con el Hook de Permisos de Ubicación Hardware
    useEffect(() => {
        if (coordenadasPasajero && coordenadasPasajero.lat && coordenadasPasajero.lng) {
            setCoordenadas([coordenadasPasajero.lat, coordenadasPasajero.lng]);
        }
    }, [coordenadasPasajero]);

    // 📡 Socket Conectado a Colección de Radar por Firestore Inmediato
    useEffect(() => {
        const pathConductores = FIRESTORE_PATHS?.conductores || 'conductores';
        const q = query(collection(db, pathConductores));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const unidades = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data && data.coordenadas && typeof data.coordenadas.lat === 'number' && typeof data.coordenadas.lng === 'number') {
                    unidades.push({ id: doc.id, ...data });
                }
            });
            setConductoresActivos(unidades);
        }, (error) => {
            console.error("❌ [RADAR-FIRESTORE] Error en streaming de flota activa:", error);
        });

        return () => unsubscribe();
    }, []);

    // Monitor Atómico sobre el flujo de ciclo de vida del Viaje Activo
    useEffect(() => {
        if (!rideId) return;

        const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
        const docRef = doc(db, pathViajes, rideId);
        
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data && data.estado) {
                    setEstadoViaje(data.estado);
                    if (data.conductor) {
                        setDatosConductor(data.conductor);
                    }
                    if (data.estado === 'FINALIZADO') {
                        setMostrarModalCalificacion(true);
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [rideId]);

    const obtenerUbicacionHardware = () => {
        return new Promise((resolve, reject) => {
            let activeResolve = true;
            const timeoutId = setTimeout(() => {
                activeResolve = false;
                reject(new Error("TIMEOUT_GPS: El hardware de ubicación no respondió a tiempo."));
            }, 6500);

            if (!navigator.geolocation) {
                reject(new Error("Módulo de geolocalización no soportado en este dispositivo."));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (activeResolve) {
                        clearTimeout(timeoutId);
                        resolve([position.coords.latitude, position.coords.longitude]);
                    }
                },
                (error) => {
                    if (activeResolve) {
                        clearTimeout(timeoutId);
                        reject(new Error("Señal de satélite no disponible o permiso denegado."));
                    }
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        });
    };

    // Actualización de Datos Personales del Pasajero
    const handleActualizarPerfil = async (e) => {
        e.preventDefault();
        if (!inputNombre.trim()) {
            setErrorInterno("⚠️ El nombre de perfil no puede quedar vacío.");
            return;
        }

        try {
            const pathUsuarios = FIRESTORE_PATHS?.usuarios || 'usuarios';
            const docRef = doc(db, pathUsuarios, uidUsuario);
            
            await updateDoc(docRef, {
                nombre: inputNombre.trim(),
                telefono: inputTelefono.trim(),
                fechaActualizacion: serverTimestamp()
            });

            setMostrarModalPerfil(false);
            console.log("🔒 [PERFIL-CIMCO] Datos de usuario guardados en nodo atómico.");
        } catch (err) {
            console.error("❌ [PERFIL-ERROR] Fallo al actualizar base distribuidora:", err);
            setErrorInterno("No se pudieron actualizar tus datos personales.");
        }
    };

    // 💰 Inyección de saldo simulando consola de administración CEO/Admin
    const handleRecargaAdministrativaCEO = async (e) => {
        e.preventDefault();
        const montoNum = parseFloat(montoRecargaSimulada);
        if (isNaN(montoNum) || montoNum <= 0) return;

        try {
            const pathWallets = FIRESTORE_PATHS?.wallets || 'wallets';
            const docRefWallet = doc(db, pathWallets, uidUsuario);
            const nuevoSaldo = perfilFirestore.saldoBilletera + montoNum;

            await setDoc(docRefWallet, {
                balance: nuevoSaldo,
                saldo: nuevoSaldo,
                usuarioId: uidUsuario,
                ultimaRecargaCEO: serverTimestamp()
            }, { merge: true });

            // Retrocompatibilidad con nodo de usuario
            const pathUsuarios = FIRESTORE_PATHS?.usuarios || 'usuarios';
            const docRefUser = doc(db, pathUsuarios, uidUsuario);
            await setDoc(docRefUser, {
                saldoBilletera: nuevoSaldo,
                balance: nuevoSaldo
            }, { merge: true });

            console.log(`🏦 [CEO-WALLET-INJECTION] Recarga forzada exitosa. Nuevo saldo: $${nuevoSaldo}`);
        } catch (err) {
            console.error("❌ [WALLET-ERROR] Falla crítica en pasarela de simulación:", err);
            setErrorInterno("Error de red en el procesador de transacciones.");
        }
    };

    const handleSolicitarServicio = async (e) => {
        if (e) e.preventDefault();
        if (procesandoPeticion) return;
        if (!destinoText.trim()) {
            setErrorInterno("⚠️ Por favor ingresa una dirección de destino válida.");
            return;
        }

        setProcesandoPeticion(true);
        setErrorInterno('');

        try {
            let coordsActuales = coordenadas;
            try {
                coordsActuales = await obtenerUbicacionHardware();
                setCoordenadas(coordsActuales);
            } catch (gpsErr) {
                console.warn("⚠️ [GPS-FALLBACK] Usando última posición conocida:", gpsErr.message);
            }

            const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
            const payload = {
                pasajeroId: uidUsuario,
                nombrePasajero: perfilFirestore.nombre,
                tipoServicio,
                metodoPago,
                destino: destinoText.trim(),
                estado: 'BUSCANDO',
                coordenadasInicio: { lat: coordsActuales[0], lng: coordsActuales[1] },
                fechaCreacion: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, pathViajes), payload);
            setRideId(docRef.id);
            setEstadoViaje('BUSCANDO');
            console.log(`🚀 [CIMCO-LOGISTICS] Viaje creado con ID atómico: ${docRef.id}`);
        } catch (err) {
            console.error("❌ [LOGISTICS-ERROR] Desbordamiento en inserción de orden:", err);
            setErrorInterno("Fallo al propagar la orden al Core Logístico.");
        } finally {
            setProcesandoPeticion(false);
        }
    };

    const handleCancelarViaje = async () => {
        if (!rideId) return;
        try {
            const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
            await updateDoc(doc(db, pathViajes, rideId), {
                estado: 'CANCELADO',
                fechaCancelacion: serverTimestamp()
            });
            setEstadoViaje('IDLE');
            setRideId(null);
            setDatosConductor(null);
        } catch (err) {
            console.error("❌ [LOGISTICS-ERROR] No se pudo revocar el servicio activo:", err);
        }
    };

    const handleCierreCalificacion = () => {
        setMostrarModalCalificacion(false);
        setEstadoViaje('IDLE');
        setRideId(null);
        setDatosConductor(null);
        setDestinoText('');
    };

    const handleLogoutSeguro = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("❌ [AUTH-ERROR] Error en cierre de sesión perimetral:", error);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-mono antialiased relative selection:bg-cyan-500/30 selection:text-cyan-400">
            {/* GRADIENTES AMBIENTALES CIMCO-UI */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-20%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]" />
            </div>

            {/* HEADER SUPERIOR BLINDADO EN GLASSMORPHISM */}
            <header className="fixed top-0 left-0 w-full backdrop-blur-md bg-[#121214]/80 border-b border-white/5 p-4 flex justify-between items-center z-[1000] px-6">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                        <Navigation size={18} className="text-white animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                            TAXIA CIMCO <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded font-mono border border-cyan-500/20">PASAJERO V14.6</span>
                        </h1>
                        <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            <span>ID: {idPasajeroCorto}</span>
                            <span className="text-zinc-600">|</span>
                            <button 
                                onClick={() => setMostrarModalPerfil(true)} 
                                className="text-cyan-400 font-bold hover:underline flex items-center gap-1 bg-cyan-500/5 px-1.5 py-0.5 rounded border border-cyan-500/10 transition-all"
                            >
                                <User size={10} /> {perfilFirestore.nombre} <Edit3 size={8} />
                            </button>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleLogoutSeguro}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95"
                >
                    <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    Salir
                </button>
            </header>

            {/* CONTENEDOR TÁCTICO CENTRAL */}
            <main className="pt-[78px] pb-[80px] min-h-screen w-full flex flex-col md:flex-row relative z-10">
                
                {/* PANEL DE CONTROL IZQUIERDO */}
                <section className="w-full md:w-[420px] p-4 md:p-6 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-white/5 bg-[#121214]/40 backdrop-blur-md">
                    {/* MONITOR DE ESTADO Y ERRORES */}
                    {errorInterno && (
                        <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 flex items-start gap-2.5 text-red-200 text-xs shadow-lg animate-shake">
                            <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
                            <p className="font-mono">{errorInterno}</p>
                        </div>
                    )}

                    {/* INTERFAZ DINÁMICA: RADAR DE SERVICIOS */}
                    {seccionActiva === 'radar' && (
                        <>
                            {estadoViaje === 'IDLE' && (
                                <div className="p-5 rounded-2xl border border-white/5 bg-[#121214]/60 relative overflow-hidden group transition-all duration-300 hover:border-white/10">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                                    <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2">
                                        <Compass size={14} className="animate-spin-slow" /> Configurar Nueva Orden
                                    </h2>
                                    <form onSubmit={handleSolicitarServicio} className="flex flex-col gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Destino de Arribo</label>
                                            <div className="relative">
                                                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                                <input 
                                                    type="text"
                                                    value={destinoText}
                                                    onChange={(e) => setDestinoText(e.target.value)}
                                                    placeholder="¿A dónde nos dirigimos hoy?"
                                                    className="w-full bg-[#161619] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Modalidad Flota</label>
                                                <select 
                                                    value={tipoServicio}
                                                    onChange={(e) => setTipoServicio(e.target.value)}
                                                    className="w-full bg-[#161619] border border-white/5 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500/40 transition-all appearance-none cursor-pointer text-left"
                                                >
                                                    <option value="mototaxi">🛺 Mototaxi</option>
                                                    <option value="motoparrillero">🛵 Motoparrillero</option>
                                                    <option value="motocarga">🚛 Motocarga</option>
                                                    <option value="intermunicipal">🛣️ Intermunicipal</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Pasarela Pago</label>
                                                <select 
                                                    value={metodoPago}
                                                    onChange={(e) => setMetodoPago(e.target.value)}
                                                    className="w-full bg-[#161619] border border-white/5 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500/40 transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="EFECTIVO">💵 EFECTIVO</option>
                                                    <option value="BILLETERA">📱 BILLETERA (${perfilFirestore.saldoBilletera.toLocaleString()})</option>
                                                </select>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={procesandoPeticion}
                                            className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-black uppercase tracking-widest py-3.5 rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(6,182,212,0.25)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.4)] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                                        >
                                            {procesandoPeticion ? (
                                                <>
                                                    <Activity className="animate-spin text-black" size={16} />
                                                    Procesando Vector...
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={14} />
                                                    Lanzar Solicitud
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {estadoViaje === 'BUSCANDO' && (
                                <div className="p-6 rounded-2xl border border-cyan-500/20 bg-[#121214]/80 backdrop-blur-md relative overflow-hidden shadow-2xl flex flex-col items-center justify-center text-center py-10 animate-pulse">
                                    <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                                        <Activity className="text-cyan-400 animate-spin" size={26} />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400 mb-1">Buscando Operador</h3>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono max-w-[240px] leading-relaxed mb-6">
                                        Tu orden ha sido inyectada en el radar radial. Esperando confirmación de unidad solvente.
                                    </p>
                                    <button
                                        onClick={handleCancelarViaje}
                                        className="px-5 py-2.5 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95"
                                    >
                                        Abortar Petición
                                    </button>
                                </div>
                            )}

                            {(estadoViaje === 'ACEPTADO' || estadoViaje === 'EN_CAMINO' || estadoViaje === 'EN_VIAJE') && datosConductor && (
                                <div className="p-5 rounded-2xl border border-emerald-500/20 bg-[#121214]/90 backdrop-blur-md relative overflow-hidden shadow-2xl flex flex-col gap-4">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                                                {estadoViaje === 'EN_VIAJE' ? 'Tránsito Activo' : 'Unidad Asignada'}
                                            </span>
                                            <h4 className="text-xs font-black uppercase tracking-wider text-white mt-1.5">{datosConductor.nombre || 'Conductor Asignado'}</h4>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center">
                                            <Bike className="text-emerald-400" size={20} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 bg-[#161619]/60 p-3 rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Identificador Placa</p>
                                            <p className="text-xs font-black text-cyan-400 font-mono tracking-wider uppercase mt-0.5">{datosConductor.placa || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Contacto Celular</p>
                                            <p className="text-xs font-bold text-zinc-200 font-mono mt-0.5">{datosConductor.telefono || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {estadoViaje !== 'EN_VIAJE' && (
                                        <button
                                            onClick={handleCancelarViaje}
                                            className="w-full py-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 mt-1"
                                        >
                                            Cancelar Servicio
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* VISTA RÁPIDA DE DISPONIBILIDAD FLOTA */}
                            <div className="p-4 rounded-xl border border-white/5 bg-[#121214]/20 mt-auto">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2.5 flex items-center gap-1.5">
                                    <Users size={10} /> Consola de Flota Activa
                                </h4>
                                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                                    {conductoresActivos.length === 0 ? (
                                        <p className="text-[10px] text-zinc-600 italic font-mono">Buscando transmisiones en la zona...</p>
                                    ) : (
                                        conductoresActivos.map((cond) => (
                                            <div key={cond.id} className="flex items-center justify-between text-[10px] bg-[#161619]/40 p-2 rounded-lg border border-white/5 font-mono">
                                                <span className="text-zinc-300 font-medium truncate max-w-[120px]">{cond.nombre || 'Operador'}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                                                        {cond.tipoServicio === 'motocarga' ? '🛺 Carga' : cond.tipoServicio === 'motoparrillero' ? '🛵 Parrillero' : cond.tipoServicio === 'intermunicipal' ? '🛣️ Inter' : '🛺 Moto'}
                                                    </span>
                                                    <span className="text-cyan-400 bg-cyan-500/5 px-1.5 py-0.5 rounded border border-cyan-500/10 text-[9px] font-bold uppercase tracking-wider">{cond.placa || 'N/A'}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* INTERFAZ DINÁMICA: PANEL CORE DE BILLETERA VIRTUAL */}
                    {seccionActiva === 'billetera' && (
                        <div className="flex flex-col gap-4 h-full animate-fadeIn">
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#161619] to-[#121214] border border-white/10 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Saldo Disponible</p>
                                        <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">${perfilFirestore.saldoBilletera.toLocaleString()} COP</h3>
                                    </div>
                                    <Wallet className="text-zinc-500" size={24} />
                                </div>
                                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                                    <span>ID CUENTA SMART</span>
                                    <span className="text-zinc-300 font-bold">CIMCO-{idPasajeroCorto.toUpperCase()}</span>
                                </div>
                            </div>

                            {/* SIMULADOR DE CONSOLA CEO/ADMINISTRATIVO PARA RECARGAR PASAJERO */}
                            <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                                <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase tracking-wider mb-3">
                                    <Banknote size={14} /> Consola Admin/CEO (Simulador)
                                </div>
                                <p className="text-[10px] text-zinc-400 leading-normal mb-3">
                                    Inyecta saldo simulando la pasarela de control administrativo central para habilitar el pago por billetera.
                                </p>
                                <form onSubmit={handleRecargaAdministrativaCEO} className="flex gap-2">
                                    <select 
                                        value={montoRecargaSimulada}
                                        onChange={(e) => setMontoRecargaSimulada(e.target.value)}
                                        className="bg-[#161619] border border-white/10 rounded-lg p-2 text-xs font-mono text-zinc-200 focus:outline-none"
                                    >
                                        <option value="10000">$10,000</option>
                                        <option value="20000">$20,000</option>
                                        <option value="50000">$50,000</option>
                                    </select>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-[10px] rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1"
                                    >
                                        Recargar Pasajero
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </section>

                {/* VISUALIZADOR GEOESPACIAL DERECHO */}
                <section className="flex-1 h-[450px] md:h-auto w-full relative z-0">
                    <MapContainer 
                        center={coordenadas} 
                        zoom={15} 
                        style={{ width: '100%', height: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        />
                        
                        {coordenadas && (
                            <Marker position={coordenadas} icon={IconoPasajero}>
                                <Popup className="custom-popup">
                                    <div className="bg-[#121214] border border-white/10 p-2.5 rounded-xl shadow-2xl font-mono text-[10px]">
                                        <p className="text-emerald-400 font-bold uppercase tracking-wider">{perfilFirestore.nombre}</p>
                                        <p className="text-zinc-400 mt-0.5">Sincronizado vía Satélite</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {conductoresActivos.map((cond) => (
                            <Marker 
                                key={cond.id} 
                                position={[cond.coordenadas.lat, cond.coordenadas.lng]}
                                icon={crearIconoVehiculo(cond.tipoServicio || 'mototaxi')}
                            >
                                <Popup className="custom-popup">
                                    <div className="bg-[#121214] border border-white/10 p-3 rounded-xl shadow-2xl font-mono text-[11px] min-w-[180px]">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-1.5">
                                            <p className="text-white font-black uppercase truncate max-w-[110px]">{cond.nombre || 'Operador'}</p>
                                            <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded tracking-wider">{cond.placa || 'N/A'}</span>
                                        </div>
                                        <p className="text-zinc-400">Modalidad: <span className="text-zinc-200 uppercase font-bold">{cond.tipoServicio || 'mototaxi'}</span></p>
                                        {cond.telefono && <p className="text-zinc-400">Celular: <span className="text-zinc-200">{cond.telefono}</span></p>}
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        <ActualizadorMapa centro={coordenadas} />
                    </MapContainer>
                </section>
            </main>

            {/* BARRA DE NAVEGACIÓN INFERIOR COEXISTENTE */}
            <footer className="fixed bottom-0 left-0 w-full backdrop-blur-md bg-[#121214]/80 border-t border-white/5 p-3 flex justify-around items-center z-[1000]">
                <button 
                    onClick={() => setSeccionActiva('radar')}
                    className={`flex flex-col items-center gap-0.5 transition-all ${seccionActiva === 'radar' ? 'text-cyan-500 scale-105 font-bold' : 'text-zinc-500'}`}
                >
                    <Navigation size={20} />
                    <span className="text-[9px] uppercase tracking-wider font-mono">Radar</span>
                </button>
                <button className="text-zinc-600 flex flex-col items-center gap-0.5 opacity-30 cursor-not-allowed">
                    <Clock size={20} />
                    <span className="text-[9px] uppercase tracking-wider font-mono">Historial</span>
                </button>
                <button 
                    onClick={() => setSeccionActiva('billetera')}
                    className={`flex flex-col items-center gap-0.5 transition-all ${seccionActiva === 'billetera' ? 'text-emerald-500 scale-105 font-bold' : 'text-zinc-500'}`}
                >
                    <Wallet size={20} />
                    <span className="text-[9px] uppercase tracking-wider font-mono">Billetera</span>
                </button>
            </footer>

            {/* MODAL DE EDICIÓN DE PERFIL/DATOS PERSONALES */}
            {mostrarModalPerfil && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[5000] p-4">
                    <div className="w-full max-w-sm bg-[#121214] border border-white/10 rounded-2xl p-5 shadow-2xl relative font-mono animate-scaleUp">
                        <button 
                            onClick={() => setMostrarModalPerfil(false)}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2">
                            <User size={14} /> Ajustes de Cuenta
                        </h3>
                        <form onSubmit={handleActualizarPerfil} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Nombre Completo</label>
                                <input 
                                    type="text"
                                    value={inputNombre}
                                    onChange={(e) => setInputNombre(e.target.value)}
                                    placeholder="Tu nombre completo"
                                    className="w-full bg-[#161619] border border-white/5 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500/40"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Línea Telefónica</label>
                                <input 
                                    type="tel"
                                    value={inputTelefono}
                                    onChange={(e) => setInputTelefono(e.target.value)}
                                    placeholder="Número de celular"
                                    className="w-full bg-[#161619] border border-white/5 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500/40"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-all duration-300"
                            >
                                Sincronizar Cambios
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE CALIFICACIÓN TRANSACCIONAL SANEADO */}
            {mostrarModalCalificacion && (
                <ModalCalificacion 
                    isOpen={mostrarModalCalificacion}
                    onClose={handleCierreCalificacion}
                    rideId={rideId}
                    datosConductor={datosConductor}
                />
            )}

            {/* 🛡️ RENDERIZADO CONDICIONAL DEL BLOQUEO PERIMETRAL DE GPS */}
            <GpsRequiredModal 
                isOpen={showGpsModal} 
                onRetry={reintentarGps} 
            />
            
            <style>{`
                .custom-popup .leaflet-popup-content-wrapper { background: transparent; box-shadow: none; padding: 0; }
                .custom-popup .leaflet-popup-tip-container { display: none; }
                .custom-popup .leaflet-popup-content { margin: 0; width: auto !important; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes scaleUp { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
                .animate-scaleUp { animation: scaleUp 0.15s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default HomePasajero;