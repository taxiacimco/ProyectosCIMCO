// Versión Arquitectura: V21.46 - Corrección de Importación SDK Modular Firebase
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\HomePasajero.jsx
 * Misión: Interfaz táctica de transporte para pasajeros con visibilidad de mapa optimizada (CartoDB Voyager),
 *         integración atómica de telemetría, sockets, billetera smart, selector dinámico de flota (4 modalidades + Cooperativas < 5km),
 *         monitoreo de hardware GPS, entrada de dirección editable con botón de recalibración GPS, subasta dinámica
 *         de ofertas en tiempo real vía WebSockets/Firestore, actualización de perfil centralizada mediante authService,
 *         guard de validación previa al envío para método de pago 'BILLETERA' contra saldo suficiente y paleta CIMCO-UI V9.3.
 */

import React, { useState, useEffect } from 'react';
import { db, auth as firebaseAuth, FIRESTORE_PATHS } from '@/config/firebase'; 
import { collection, onSnapshot, query, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useGpsGuard } from '@/hooks/useGpsGuard';
import { useWallet } from '@/hooks/useWallet';
import { useSocket } from '@/hooks/useSocket';
import authService from '@/services/authService';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { 
  Navigation, 
  MapPin, 
  Bike, 
  Car, 
  Wallet, 
  Send, 
  ShieldCheck, 
  LogOut, 
  Radio, 
  UserCheck, 
  Clock, 
  Sparkles,
  Compass,
  CheckCircle,
  Users,
  Package,
  Milestone,
  DollarSign,
  MessageSquare,
  Activity,
  QrCode,
  Banknote,
  ShieldAlert,
  User,
  Edit3,
  X,
  CreditCard,
  Crosshair,
  AlertTriangle,
  Bus,
  Check,
  Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModalCalificacion from '@/components/ModalCalificacion';
import GpsRequiredModal from '@/components/shared/GpsRequiredModal';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 🛡️ Reparación de Assets de Leaflet para entornos empaquetados por Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Coordenadas predeterminadas (La Jagua de Ibirico)
const LA_JAGUA_COORDS = [9.5641, -73.3351];

// 📐 Fórmula Haversine para calcular distancia radial en km
const calcularDistanciaKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371; 
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 🎨 Generación Dinámica de Despliegue de Unidades en Radar Geoespacial
const crearIconoVehiculo = (tipo) => {
  let colorHex = '#22d3ee'; // Cyan (Mototaxi)
  if (tipo === 'motocarga') colorHex = '#a855f7'; // Púrpura (Motocarga)
  if (tipo === 'motoparrillero') colorHex = '#eab308'; // Oro (Motoparrillero)
  if (tipo === 'intermunicipal') colorHex = '#f97316'; // Naranja (Intermunicipal)
  if (tipo === 'taxi') colorHex = '#f59e0b'; // Ámbar (Taxi Express)

  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `<div style="background-color: ${colorHex};" class="w-7 h-7 rounded-full border-2 border-[#121214] shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center text-slate-950 font-bold animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

const IconoPasajero = L.divIcon({
  className: 'custom-passenger-icon',
  html: `<div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#121214] shadow-[0_0_10px_rgba(16,185,129,0.5)] flex items-center justify-center text-slate-950 font-bold"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6"/></svg></div>`,
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

export default function HomePasajero() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  
  // 🔌 Canal de Telemetría Sockets Centralizado mediante Hook Unificado
  const { socket, isConnected } = useSocket();

  // 💳 Integración del Hook Unificado de Billetera
  const walletContext = useWallet();
  const saldoHook = typeof walletContext?.saldo === 'number' 
    ? walletContext.saldo 
    : (typeof walletContext?.balance === 'number' ? walletContext.balance : 0);
  const recargarSaldoHook = walletContext?.recargarSaldo || walletContext?.recargar;

  // 🛡️ Integración Hook Perimetral de Monitoreo GPS y Guardas Anti-Undefined
  const { isGpsValid, showGpsModal, checkGpsStatus, coordenadasPasajero, reintentarGps } = useGpsGuard();

  // Matrices de Estado Reactivo
  const [coordenadas, setCoordenadas] = useState(LA_JAGUA_COORDS);
  const [conductoresActivos, setConductoresActivos] = useState([]);
  
  // 🤝 Matriz para Subasta Dinámica de Ofertas Recibidas
  const [ofertas, setOfertas] = useState([]);

  // 🚕 Modalidades: 'mototaxi' | 'motoparrillero' | 'motocarga' | 'intermunicipal'
  const [tipoServicio, setTipoServicio] = useState('mototaxi');
  const [cooperativaSeleccionada, setCooperativaSeleccionada] = useState('');
  
  const [metodoPago, setMetodoPago] = useState('EFECTIVO'); // 'EFECTIVO' | 'BILLETERA'
  const [origenText, setOrigenText] = useState('Ubicación actual (GPS)');
  const [destinoText, setDestinoText] = useState('');
  const [valorEstimado, setValorEstimado] = useState(0);
  const [estadoViaje, setEstadoViaje] = useState('IDLE'); 
  const [datosConductor, setDatosConductor] = useState(null);
  const [rideId, setRideId] = useState(null);
  const [procesandoPeticion, setProcesandoPeticion] = useState(false);
  const [errorInterno, setErrorInterno] = useState('');
  const [mostrarModalCalificacion, setMostrarModalCalificacion] = useState(false);
  const [mensajeExpirado, setMensajeExpirado] = useState('');
  
  // 🗲 Estados de la UI / Secciones dinámicas
  const [seccionActiva, setSeccionActiva] = useState('radar'); // 'radar' | 'billetera'
  const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);
  
  // 🔄 Sincronización dinámica de perfil extendido desde Firestore
  const [perfilFirestore, setPerfilFirestore] = useState({
    nombre: 'Cargando...',
    telefono: '',
    saldoBilletera: 0
  });

  // Consolidación atómica de saldo
  const saldoEfectivo = typeof saldoHook === 'number' && saldoHook > 0 
    ? saldoHook 
    : (typeof perfilFirestore.saldoBilletera === 'number' ? perfilFirestore.saldoBilletera : 0);

  // Inputs editables del perfil
  const [inputNombre, setInputNombre] = useState('');
  const [inputTelefono, setInputTelefono] = useState('');
  const [montoRecargaSimulada, setMontoRecargaSimulada] = useState('20000');
  
  const uidUsuario = user?.uid || user?.id || user?._id || 'ANÓNIMO';
  const idPasajeroCorto = String(uidUsuario).slice(0, 8);

  // 🚌 Filtrado dinámico de Cooperativas Intermunicipales a menos de 5 km
  const cooperativasEnRango = conductoresActivos
    .filter((c) => c.tipoServicio === 'intermunicipal' || c.cooperativa)
    .map((c) => ({
      id: c.id,
      nombre: c.cooperativa || c.nombreEmpresa || c.nombre || 'Cooperativa Local',
      distancia: calcularDistanciaKm(coordenadas[0], coordenadas[1], c.coordenadas?.lat, c.coordenadas?.lng)
    }))
    .filter((coop) => coop.distancia <= 5);

  // 📡 Gestión de Eventos del Hook Unificado de Socket (Ubicación + Subasta + Estados)
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log("📡 [CIMCO-SOCKETS] Canal de telemetría activo en HomePasajero. Sala: sala_pasajeros");

    const handleActualizacionUbicacion = (data) => {
      if (data?.conductorId) {
        setConductoresActivos((prev) => {
          const existe = prev.some((c) => c.id === data.conductorId);
          if (existe) {
            return prev.map((c) => 
              c.id === data.conductorId 
                ? { ...c, coordenadas: { lat: data.lat, lng: data.lng } } 
                : c
            );
          }
          return prev;
        });
      }
    };

    const handleViajeAceptado = (data) => {
      if (data?.viajeId && (data.viajeId === rideId || !rideId)) {
        setRideId(data.viajeId);
        setEstadoViaje('ACEPTADO');
        if (data.conductor) {
          setDatosConductor(data.conductor);
        }
        setOfertas([]);
      }
    };

    const handleViajeExpirado = (data) => {
      if (!data?.viajeId || data.viajeId === rideId) {
        setEstadoViaje('EXPIRADO');
        setMensajeExpirado("⚠️ Ningún conductor aceptó tu solicitud tras 60 segundos. Por favor intenta de nuevo.");
        setOfertas([]);
      }
    };

    // 🤝 Suscripción a Negociación por Subasta en Tiempo Real
    const handleNuevaOferta = (oferta) => {
      if (!oferta || !oferta.conductorId) return;
      console.log("📥 [SUBASTA] Nueva oferta recibida:", oferta);
      setOfertas((prev) => [
        ...prev.filter((o) => o.conductorId !== oferta.conductorId),
        oferta
      ]);
    };

    const handleOfertaRetirada = (data) => {
      if (!data || !data.conductorId) return;
      console.log("🗑️ [SUBASTA] Oferta retirada por conductor:", data.conductorId);
      setOfertas((prev) => prev.filter((o) => o.conductorId !== data.conductorId));
    };

    socket.on('ubicacion_conductor_actualizada', handleActualizacionUbicacion);
    socket.on('viaje_aceptado', handleViajeAceptado);
    socket.on('viaje_expirado', handleViajeExpirado);
    socket.on('nueva_oferta', handleNuevaOferta);
    socket.on('oferta_retirada', handleOfertaRetirada);

    return () => {
      socket.off('ubicacion_conductor_actualizada', handleActualizacionUbicacion);
      socket.off('viaje_aceptado', handleViajeAceptado);
      socket.off('viaje_expirado', handleViajeExpirado);
      socket.off('nueva_oferta', handleNuevaOferta);
      socket.off('oferta_retirada', handleOfertaRetirada);
    };
  }, [socket, isConnected, rideId]);

  // 🔄 Streaming reactivo de datos de perfil del Pasajero en Firestore
  useEffect(() => {
    if (!uidUsuario || uidUsuario === 'ANÓNIMO') return;
    
    const pathUsuarios = FIRESTORE_PATHS?.usuarios || 'usuarios';
    const docRefUser = doc(db, pathUsuarios, uidUsuario);
    
    const unsubscribeUser = onSnapshot(docRefUser, (snapshotUser) => {
      let nombreBase = user?.nombre || user?.displayName || 'Pasajero CIMCO';
      let telefonoBase = '';
      let saldoBase = 0;

      if (snapshotUser.exists()) {
        const dataUser = snapshotUser.data();
        nombreBase = dataUser.nombre || nombreBase;
        telefonoBase = dataUser.telefonoMovil || dataUser.telefono || '';
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

    return () => {
      unsubscribeUser();
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
            setOfertas([]);
          }
          if (data.estado === 'EXPIRADO') {
            setMensajeExpirado("⚠️ Ningún conductor aceptó tu solicitud tras 60 segundos. Por favor intenta de nuevo.");
            setOfertas([]);
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

  // Actualización de Datos Personales del Pasajero mediante Servicio Centralizado
  const handleActualizarPerfil = async (e) => {
    e.preventDefault();
    if (!inputNombre.trim()) {
      setErrorInterno("⚠️ El nombre de perfil no puede quedar vacío.");
      return;
    }

    try {
      await authService.updateProfile({
        nombre: inputNombre.trim(),
        telefonoMovil: inputTelefono.trim(),
        foto_perfil: perfilFirestore.foto_perfil || user?.foto_perfil || null
      });

      setMostrarModalPerfil(false);
      setErrorInterno('');
      console.log("🔒 [PERFIL-CIMCO] Datos de usuario actualizados mediante authService.");
    } catch (err) {
      console.error("❌ [PERFIL-ERROR] Fallo al actualizar el perfil centralizado:", err);
      setErrorInterno("No se pudieron actualizar tus datos personales.");
    }
  };

  // 💰 Inyección de saldo simulando consola de administración Central
  const handleRecargaAdministrativaCEO = async (e) => {
    e.preventDefault();
    const montoNum = parseFloat(montoRecargaSimulada);
    if (isNaN(montoNum) || montoNum <= 0) return;

    try {
      if (typeof recargarSaldoHook === 'function') {
        await recargarSaldoHook(montoNum);
      } else {
        const pathWallets = FIRESTORE_PATHS?.wallets || 'wallets';
        const docRefWallet = doc(db, pathWallets, uidUsuario);
        const nuevoSaldo = saldoEfectivo + montoNum;

        await setDoc(docRefWallet, {
          balance: nuevoSaldo,
          saldo: nuevoSaldo,
          usuarioId: uidUsuario,
          ultimaRecargaCEO: serverTimestamp()
        }, { merge: true });

        const pathUsuarios = FIRESTORE_PATHS?.usuarios || 'usuarios';
        const docRefUser = doc(db, pathUsuarios, uidUsuario);
        await setDoc(docRefUser, {
          saldoBilletera: nuevoSaldo,
          balance: nuevoSaldo
        }, { merge: true });
      }

      console.log(`🏦 [CEO-WALLET-INJECTION] Recarga atómica realizada con éxito. Sumado: +$${montoNum}`);
    } catch (err) {
      console.error("❌ [WALLET-ERROR] Falla crítica en pasarela de simulación:", err);
      setErrorInterno("Error de red en el procesador de transacciones.");
    }
  };

  // 🚀 Lanzamiento e Inserción Atómica de Petición con Clasificación de Trayecto
  const handleSolicitarServicio = async (e) => {
    if (e) e.preventDefault();
    if (procesandoPeticion) return;
    if (!destinoText.trim()) {
      setErrorInterno("⚠️ Por favor ingresa una dirección de destino válida.");
      return;
    }
    if (tipoServicio === 'intermunicipal' && !cooperativaSeleccionada) {
      setErrorInterno("⚠️ Selecciona una cooperativa intermunicipal disponible dentro del rango de 5 Km.");
      return;
    }

    if (metodoPago === 'BILLETERA' && saldoEfectivo < valorEstimado) {
      setErrorInterno("⚠️ Saldo insuficiente en billetera para este trayecto. Selecciona otro método de pago o recarga.");
      return;
    }

    setProcesandoPeticion(true);
    setErrorInterno('');
    setMensajeExpirado('');
    setOfertas([]);

    try {
      let coordsActuales = coordenadas;
      try {
        coordsActuales = await obtenerUbicacionHardware();
        setCoordenadas(coordsActuales);
      } catch (gpsErr) {
        console.warn("⚠️ [GPS-FALLBACK] Usando última posición conocida:", gpsErr.message);
      }

      const esIntermunicipal = tipoServicio === 'intermunicipal';
      const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
      
      const payload = {
        pasajeroId: uidUsuario,
        nombrePasajero: perfilFirestore.nombre,
        tipoServicio, // 'mototaxi' | 'motoparrillero' | 'motocarga' | 'intermunicipal'
        tipoTrayecto: esIntermunicipal ? 'INTERMUNICIPAL' : 'URBANO',
        cooperativa: esIntermunicipal ? cooperativaSeleccionada : null,
        metodoPago,
        origen: origenText.trim() || 'Ubicación actual (GPS)',
        destino: destinoText.trim(),
        valorEstimado,
        estado: 'BUSCANDO',
        coordenadasInicio: { lat: coordsActuales[0], lng: coordsActuales[1] },
        fechaCreacion: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, pathViajes), payload);
      const idGenerado = docRef.id;
      setRideId(idGenerado);
      setEstadoViaje('BUSCANDO');

      try {
        const apiHost = import.meta.env?.VITE_API_URL || '';
        if (apiHost) {
          const cleanApiHost = apiHost.replace(/\/+$/, '');
          await fetch(`${cleanApiHost}/viajes/solicitar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              viajeId: idGenerado,
              ...payload
            })
          });
        }
      } catch (apiErr) {
        console.warn("⚠️ [REST-API] No se pudo notificar al backend REST (usando fallback WebSocket/Firestore):", apiErr);
      }

      if (socket && isConnected) {
        socket.emit('solicitar_viaje', {
          viajeId: idGenerado,
          ...payload
        });
      }

      console.log(`🚀 [CIMCO-LOGISTICS] Viaje creado con ID atómico: ${idGenerado}`);
    } catch (err) {
      console.error("❌ [LOGISTICS-ERROR] Desbordamiento en inserción de orden:", err);
      setErrorInterno("Fallo al propagar la orden al Core Logístico.");
    } finally {
      setProcesandoPeticion(false);
    }
  };

  // 🤝 Selección y Confirmación de Propuesta de Conductor en Subasta
  const handleAceptarOferta = async (oferta) => {
    if (!oferta || !rideId) return;
    try {
      if (socket && isConnected) {
        socket.emit('aceptar_oferta', {
          viajeId: rideId,
          conductorId: oferta.conductorId,
          tarifaAcordada: oferta.tarifa
        });
      }

      const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
      const docRef = doc(db, pathViajes, rideId);
      
      const conductorAsignado = oferta.conductor || {
        id: oferta.conductorId,
        nombre: oferta.nombre || 'Conductor',
        placa: oferta.placa || oferta.vehiculo || 'N/A',
        telefono: oferta.telefono || 'N/A',
        calificacion: oferta.calificacion || 5.0
      };

      await setDoc(docRef, {
        estado: 'ACEPTADO',
        conductor: conductorAsignado,
        valorTarifa: oferta.tarifa,
        fechaAceptacion: serverTimestamp()
      }, { merge: true });

      setDatosConductor(conductorAsignado);
      setEstadoViaje('ACEPTADO');
      setOfertas([]);
      console.log("✅ [SUBASTA] Oferta aceptada atómicamente. Conductor asignado:", oferta.conductorId);
    } catch (err) {
      console.error("❌ [SUBASTA-ERROR] No se pudo procesar la aceptación de la oferta:", err);
      setErrorInterno("No se pudo procesar la aceptación de la oferta.");
    }
  };

  const handleCancelarViaje = async () => {
    if (!rideId) return;
    try {
      const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
      await setDoc(doc(db, pathViajes, rideId), {
        estado: 'CANCELADO',
        fechaCancelacion: serverTimestamp()
      }, { merge: true });

      if (socket && isConnected) {
        socket.emit('cancelar_viaje', { viajeId: rideId, pasajeroId: uidUsuario });
      }

      setEstadoViaje('IDLE');
      setRideId(null);
      setDatosConductor(null);
      setMensajeExpirado('');
      setOfertas([]);
    } catch (err) {
      console.error("❌ [LOGISTICS-ERROR] No se pudo revocar el servicio activo:", err);
    }
  };

  const handleReiniciarEstadoExpirado = () => {
    setEstadoViaje('IDLE');
    setRideId(null);
    setDatosConductor(null);
    setMensajeExpirado('');
    setOfertas([]);
  };

  const handleCierreCalificacion = () => {
    setMostrarModalCalificacion(false);
    setEstadoViaje('IDLE');
    setRideId(null);
    setDatosConductor(null);
    setDestinoText('');
    setMensajeExpirado('');
    setOfertas([]);
  };

  const handleLogoutSeguro = async () => {
    try {
      if (typeof logout === 'function') {
        await logout();
      }
      navigate('/login');
    } catch (error) {
      console.error("❌ [AUTH-ERROR] Error en cierre de sesión perimetral:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden select-none relative">
      
      {/* ---------------- BARRA SUPERIOR DE LOGÍSTICA & ESTADO ---------------- */}
      <header className="fixed top-0 left-0 w-full backdrop-blur-2xl bg-slate-900/90 border-b border-slate-800 p-3.5 px-6 flex justify-between items-center z-[1000] shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Navigation className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              TAXIA <span className="text-amber-500">CIMCO</span>
            </h1>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SISTEMA ACTIVO • PASAJERO V15.1 (UI V9.3)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMostrarModalPerfil(true)} 
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-bold transition-all"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{perfilFirestore.nombre}</span>
            <Edit3 className="w-3 h-3 text-slate-400" />
          </button>

          <button
            onClick={handleLogoutSeguro}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/10 border border-slate-700/60 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>SALIR</span>
          </button>
        </div>
      </header>

      {/* ---------------- CUERPO PRINCIPAL (PANEL CONTROL + MAPA VOYAGER) ---------------- */}
      <div className="pt-[65px] flex-1 flex flex-col md:flex-row h-[calc(100vh-65px)] relative">
        
        {/* ---------------- BARRA LATERAL / PANEL DE CONTROL ---------------- */}
        <aside className="w-full md:w-[420px] bg-slate-900/90 backdrop-blur-2xl border-r border-slate-800 flex flex-col justify-between z-20 shadow-2xl relative overflow-hidden">
          
          {/* Tarjeta de Perfil Pasajero Integrada */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-snug">{perfilFirestore.nombre}</p>
                  <p className="text-[10px] font-mono text-slate-400">ID: {idPasajeroCorto}</p>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                VERIFICADO
              </div>
            </div>
          </div>

          {/* MONITOR DE ERRORES / ALERTAS */}
          {errorInterno && (
            <div className="m-4 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center gap-2 text-rose-300 text-xs font-mono">
              <ShieldAlert size={16} className="text-rose-400 shrink-0" />
              <span>{errorInterno}</span>
            </div>
          )}

          {/* CONTENIDO DINÁMICO POR SECCIÓN */}
          {seccionActiva === 'radar' ? (
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {estadoViaje === 'IDLE' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      CONFIGURAR NUEVA ORDEN
                    </span>
                  </div>

                  <form onSubmit={handleSolicitarServicio} className="space-y-4">
                    {/* 📍 PUNTO DE RECOGIDA (Texto Libre + Botón GPS) */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          PUNTO DE RECOGIDA
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const coords = await obtenerUbicacionHardware();
                              setCoordenadas(coords);
                              setOrigenText("Ubicación actual (GPS)");
                            } catch (err) {
                              setErrorInterno("No se logró recalibrar la señal GPS.");
                            }
                          }}
                          className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                        >
                          <Crosshair className="w-3 h-3" />
                          <span>USAR GPS ACTUAL</span>
                        </button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Cra 4 # 12-30 / Frente a la Tienda Don Pedro"
                          value={origenText}
                          onChange={(e) => setOrigenText(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                    </div>

                    {/* 🏁 DIRECCIÓN DE DESTINO */}
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                        DIRECCIÓN DE DESTINO
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                          <Navigation className="w-4 h-4 rotate-45" />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Barrio El Prado, Calle 8 # 15-20 / ¿A dónde vamos?"
                          value={destinoText}
                          onChange={(e) => setDestinoText(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                        />
                      </div>
                    </div>

                    {/* 🚖 SELECCIÓN DE MODALIDAD ORGANIZADA (4 SERVICIOS) */}
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                        MODALIDAD DE SERVICIO
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {/* 1. Mototaxi */}
                        <button
                          type="button"
                          onClick={() => setTipoServicio('mototaxi')}
                          className={`py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                            tipoServicio === 'mototaxi'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Bike className="w-4 h-4" />
                          <span>MOTOTAXI</span>
                        </button>

                        {/* 2. Motoparrillero */}
                        <button
                          type="button"
                          onClick={() => setTipoServicio('motoparrillero')}
                          className={`py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                            tipoServicio === 'motoparrillero'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Users className="w-4 h-4" />
                          <span>PARRILLERO</span>
                        </button>

                        {/* 3. Motocarga */}
                        <button
                          type="button"
                          onClick={() => setTipoServicio('motocarga')}
                          className={`py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                            tipoServicio === 'motocarga'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Package className="w-4 h-4" />
                          <span>MOTOCARGA</span>
                        </button>

                        {/* 4. Servicio Intermunicipal */}
                        <button
                          type="button"
                          onClick={() => setTipoServicio('intermunicipal')}
                          className={`py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                            tipoServicio === 'intermunicipal'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Bus className="w-4 h-4" />
                          <span>INTERMUNICIPAL</span>
                        </button>
                      </div>

                      {/* 🚌 SUB-SELECTOR DE COOPERATIVAS (SOLO SI SE ELIGE INTERMUNICIPAL) */}
                      {tipoServicio === 'intermunicipal' && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 animate-fadeIn">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center gap-1">
                            <Milestone className="w-3.5 h-3.5" /> COOPERATIVAS EN RANGO (&lt; 5 KM)
                          </label>
                          {cooperativasEnRango.length > 0 ? (
                            <select
                              value={cooperativaSeleccionada}
                              onChange={(e) => setCooperativaSeleccionada(e.target.value)}
                              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500"
                            >
                              <option value="">-- Seleccionar Cooperativa --</option>
                              {cooperativasEnRango.map((coop) => (
                                <option key={coop.id} value={coop.nombre}>
                                  {coop.nombre} ({coop.distancia.toFixed(1)} km)
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-[10px] text-slate-400 font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                              ⚠️ No hay cooperativas intermunicipales registradas activas a menos de 5 km de tu posición GPS.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pasarela de Pago */}
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                        PASARELA DE PAGO
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMetodoPago('EFECTIVO')}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                            metodoPago === 'EFECTIVO'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <Wallet className="w-4 h-4" />
                          <span>EFECTIVO</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMetodoPago('BILLETERA')}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                            metodoPago === 'BILLETERA'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <Wallet className="w-4 h-4" />
                          <span>BILLETERA (${saldoEfectivo.toLocaleString()})</span>
                        </button>
                      </div>
                    </div>

                    {/* Botón CTA Lanzar Solicitud */}
                    <button
                      type="submit"
                      disabled={procesandoPeticion}
                      className="w-full mt-2 py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.99] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {procesandoPeticion ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>ESCANEAR CONDUCTORES EN ZONA...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 fill-slate-950" />
                          <span>LANZAR SOLICITUD DE VIAJE</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* BÚSQUEDA Y PANEL DE SUBASTA EN TIEMPO REAL */}
              {estadoViaje === 'BUSCANDO' && (
                <div className="space-y-4">
                  {/* Radar de Búsqueda Activa */}
                  <div className="p-5 rounded-2xl border border-amber-500/30 bg-slate-950/90 backdrop-blur-md relative overflow-hidden shadow-2xl flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30 mb-3 shadow-lg shadow-amber-500/10">
                      <Activity className="text-amber-400 animate-spin" size={24} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">ESCANEAR CONDUCTORES EN ZONA...</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono max-w-[240px] leading-relaxed mb-4">
                      Tu orden ha sido propagada a la red radial. Esperando propuestas económicas.
                    </p>
                    <button
                      onClick={handleCancelarViaje}
                      className="px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer"
                    >
                      ABORTAR PETICIÓN
                    </button>
                  </div>

                  {/* 🏷️ PANEL FLOTANTE DE OFERTAS EN TIEMPO REAL */}
                  <div className="p-4 rounded-2xl border border-amber-500/30 bg-slate-950/90 backdrop-blur-md space-y-3 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> OFERTAS RECIBIDAS ({ofertas.length})
                      </h3>
                      <span className="text-[9px] font-mono text-emerald-400 animate-pulse">SUBASTA EN VIVO</span>
                    </div>

                    {ofertas.length === 0 ? (
                      <div className="py-6 text-center text-[10px] text-slate-500 font-mono">
                        Esperando que los conductores cercanos envíen propuestas de tarifa...
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {ofertas.map((oferta) => (
                          <div 
                            key={oferta.conductorId || oferta.ofertaId} 
                            className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex justify-between items-center hover:border-amber-500/40 transition-all"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{oferta.nombre || 'Conductor'}</span>
                                {oferta.calificacion && (
                                  <span className="text-[10px] text-amber-400 font-mono">★ {oferta.calificacion}</span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Vehículo: <span className="text-slate-200 uppercase">{oferta.vehiculo || oferta.placa || 'Moto'}</span>
                              </p>
                              <p className="text-xs font-black text-amber-400 font-mono">
                                ${Number(oferta.tarifa || 0).toLocaleString()} COP
                              </p>
                            </div>
                            <button
                              onClick={() => handleAceptarOferta(oferta)}
                              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-[10px] font-black uppercase rounded-lg shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>ACEPTAR</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SOLICITUD EXPIRADA */}
              {estadoViaje === 'EXPIRADO' && (
                <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md relative overflow-hidden shadow-2xl flex flex-col items-center justify-center text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40 mb-3 text-amber-400">
                    <AlertTriangle size={28} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2">SOLICITUD EXPIRADA (60S)</h3>
                  <p className="text-[11px] text-amber-200/90 font-mono leading-relaxed mb-6 max-w-[260px]">
                    {mensajeExpirado || "Ningún conductor disponible aceptó la solicitud dentro del tiempo límite."}
                  </p>
                  <button
                    onClick={handleReiniciarEstadoExpirado}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-lg cursor-pointer"
                  >
                    REINTENTAR SOLICITUD
                  </button>
                </div>
              )}

              {/* VIAJE ASIGNADO / EN TRÁNSITO */}
              {(estadoViaje === 'ACEPTADO' || estadoViaje === 'EN_CAMINO' || estadoViaje === 'EN_VIAJE') && datosConductor && (
                <div className="p-5 rounded-2xl border border-emerald-500/30 bg-slate-950/90 backdrop-blur-md relative overflow-hidden shadow-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {estadoViaje === 'EN_VIAJE' ? 'TRÁNSITO ACTIVO' : 'UNIDAD ASIGNADA'}
                      </span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white mt-1.5">{datosConductor.nombre || 'Conductor Asignado'}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <Bike className="text-emerald-400" size={20} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">PLACA UNIDAD</p>
                      <p className="text-xs font-black text-amber-400 font-mono tracking-wider uppercase mt-0.5">{datosConductor.placa || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">CELULAR</p>
                      <p className="text-xs font-bold text-slate-200 font-mono mt-0.5">{datosConductor.telefono || 'N/A'}</p>
                    </div>
                  </div>

                  {estadoViaje !== 'EN_VIAJE' && (
                    <button
                      onClick={handleCancelarViaje}
                      className="w-full py-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer mt-1"
                    >
                      CANCELAR SERVICIO
                    </button>
                  )}
                </div>
              )}

            </div>
          ) : (
            /* SECCIÓN BILLETERA SMART */
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">SALDO DISPONIBLE</p>
                    <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">${saldoEfectivo.toLocaleString()} COP</h3>
                  </div>
                  <Wallet className="text-slate-500" size={24} />
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>CUENTA SMART</span>
                  <span className="text-slate-200 font-bold">CIMCO-{idPasajeroCorto.toUpperCase()}</span>
                </div>
              </div>

              {/* SIMULADOR RECARGA CENTRAL */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">
                  <Banknote size={14} /> SIMULADOR PASARELA
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mb-3">
                  Inyecta saldo para pruebas de pago con Billetera Smart.
                </p>
                <form onSubmit={handleRecargaAdministrativaCEO} className="flex gap-2">
                  <select 
                    value={montoRecargaSimulada}
                    onChange={(e) => setMontoRecargaSimulada(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none"
                  >
                    <option value="10000">$10,000</option>
                    <option value="20000">$20,000</option>
                    <option value="50000">$50,000</option>
                  </select>
                  <button
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-widest text-[10px] rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    RECARGAR
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Consola de Estado Radial Inferior */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>RADAR CIMCO: <strong className="text-slate-200">CONECTADO</strong></span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">SALA: SALA_PASAJEROS</span>
          </div>
        </aside>

        {/* ---------------- MAPA VISUALMENTE CLARO & MODERNO (CARTO VOYAGER) ---------------- */}
        <main className="flex-1 h-[50vh] md:h-auto relative bg-slate-950 z-10">
          
          <MapContainer
            center={coordenadas}
            zoom={15}
            zoomControl={false}
            className="w-full h-full z-10"
          >
            {/* CARTO VOYAGER TILE LAYER (Vías claras, contrastadas y legibles) */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a> Voyager'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />

            {/* Radio de Detección GPS */}
            <Circle
              center={coordenadas}
              radius={350}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.12,
                weight: 2,
                dashArray: '6, 8'
              }}
            />

            {/* Marcador del Pasajero */}
            <Marker position={coordenadas} icon={IconoPasajero}>
              <Popup className="custom-popup">
                <div className="p-1 font-sans text-center">
                  <p className="font-bold text-xs text-slate-900">{perfilFirestore.nombre}</p>
                  <p className="text-[10px] text-slate-600">La Jagua de Ibirico, Cesar</p>
                </div>
              </Popup>
            </Marker>

            {/* Marcadores de Flota Activa */}
            {conductoresActivos.map((cond) => (
              <Marker 
                key={cond.id} 
                position={[cond.coordenadas.lat, cond.coordenadas.lng]}
                icon={crearIconoVehiculo(cond.tipoServicio || 'mototaxi')}
              >
                <Popup className="custom-popup">
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl font-sans text-[11px] min-w-[170px] text-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                      <p className="text-white font-black uppercase truncate max-w-[100px]">{cond.nombre || 'Operador'}</p>
                      <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded tracking-wider">{cond.placa || 'N/A'}</span>
                    </div>
                    <p className="text-slate-400">Modalidad: <span className="text-slate-200 uppercase font-bold">{cond.tipoServicio || 'mototaxi'}</span></p>
                    {cond.telefono && <p className="text-slate-400">Celular: <span className="text-slate-200">{cond.telefono}</span></p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            <ActualizadorMapa centro={coordenadas} />
          </MapContainer>

          {/* Overlay Superior Flotante del Mapa */}
          <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex justify-between items-center">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 px-4 py-2.5 rounded-2xl shadow-xl pointer-events-auto flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-white tracking-wide">
                LA JAGUA DE IBIRICO • FLOTA DISPONIBLE ({conductoresActivos.length})
              </span>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 px-3 py-2 rounded-2xl shadow-xl pointer-events-auto flex items-center gap-2 text-xs font-bold text-amber-400">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>TIEMPO EST. LLEGADA: ~3 MIN</span>
            </div>
          </div>

        </main>
      </div>

      {/* ---------------- BARRA DE NAVEGACIÓN INFERIOR COEXISTENTE ---------------- */}
      <footer className="fixed bottom-0 left-0 w-full backdrop-blur-md bg-slate-900/90 border-t border-slate-800 p-2.5 flex justify-around items-center z-[1000]">
        <button 
          onClick={() => setSeccionActiva('radar')}
          className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${seccionActiva === 'radar' ? 'text-amber-500 scale-105 font-bold' : 'text-slate-500'}`}
        >
          <Navigation size={18} />
          <span className="text-[9px] uppercase tracking-wider font-mono">Radar</span>
        </button>
        <button className="text-slate-600 flex flex-col items-center gap-1 opacity-40 cursor-not-allowed">
          <Clock size={18} />
          <span className="text-[9px] uppercase tracking-wider font-mono">Historial</span>
        </button>
        <button 
          onClick={() => setSeccionActiva('billetera')}
          className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${seccionActiva === 'billetera' ? 'text-emerald-400 scale-105 font-bold' : 'text-slate-500'}`}
        >
          <Wallet size={18} />
          <span className="text-[9px] uppercase tracking-wider font-mono">Billetera</span>
        </button>
      </footer>

      {/* MODAL DE EDICIÓN DE PERFIL/DATOS PERSONALES */}
      {mostrarModalPerfil && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[5000] p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl relative font-sans">
            <button 
              onClick={() => setMostrarModalPerfil(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-2">
              <User size={14} /> AJUSTES DE PERFIL PASAJERO
            </h3>
            <form onSubmit={handleActualizarPerfil} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">NOMBRE COMPLETO</label>
                <input 
                  type="text"
                  value={inputNombre}
                  onChange={(e) => setInputNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">TELÉFONO DE CONTACTO</label>
                <input 
                  type="tel"
                  value={inputTelefono}
                  onChange={(e) => setInputTelefono(e.target.value)}
                  placeholder="Número celular"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-all cursor-pointer"
              >
                GUARDAR CAMBIOS
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CALIFICACIÓN TRANSACCIONAL */}
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
      `}</style>
    </div>
  );
}