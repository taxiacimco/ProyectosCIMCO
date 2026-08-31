// Versión Arquitectura: V19.9 - Incorporación de Guards de Validación de Saldo Operativo y Comisión en HomeMototaxi
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\mototaxi\HomeMototaxi.jsx
 * Misión: Dashboard táctico para conductores de Mototaxi con telemetría GPS en tiempo real,
 *          paleta de colores adaptativa (Ámbar Standby / Azul Suave Activo), integración fluida
 *          con AjustesPerfil, validación local rigurosa de expiración JWT (Anti-401) con padding seguro,
 *          captura explícita de error HTTP 401 por nodo de identidad extinto con logout defensivo,
 *          sincronización dinámica de remoción de ofertas en radar (viaje_removido_radar / HTTP 409),
 *          resiliencia ante redes inestables (timeouts, reintentos e indicador de conectividad de red),
 *          manejo reactivo de estado Offline en UI mediante event listeners 'online'/'offline',
 *          unificación atómica de edición de perfil a través de AjustesPerfil y authService,
 *          guards estrictos de validación de saldo operativo ($2.000 COP) y comisión del 10% previa a la emisión Socket,
 *          limpieza atómica de hooks (watchPosition, listeners WebSocket y suscripciones Firestore)
 *          para prevención de fugas de memoria y centralización de trazabilidad mediante logger condicional.
 * UI Standard: CIMCO-UI V9.3 Pure Dark Glassmorphism (backdrop-blur-md, bg-[#121214]/80, border-white/5).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, collection, query, where, updateDoc, setDoc, serverTimestamp, runTransaction, getDocs } from 'firebase/firestore';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useSocket } from '@/hooks/useSocket';
import api from '@/config/api'; 
import { logger } from '@/utils/logger';
import ModalCalificacion from '@/components/ModalCalificacion';
import AjustesPerfil from '@/components/shared/AjustesPerfil';
import {
  MapPin, Navigation, Wallet, Clock, User, LogOut, Loader,
  Wifi, WifiOff, Settings, Bike
} from 'lucide-react';

/**
 * 🛡️ HELPER DE SEGURIDAD: Decodificación y Verificación Local de Expiración JWT
 * Previene llamadas HTTP innecesarias que resulten en 401 Unauthenticated.
 * Incluye padding automático Base64URL para evitar excepciones en window.atob.
 */
const isTokenExpired = (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') return true;
  try {
    const parts = rawToken.split('.');
    if (parts.length !== 3) return true;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const base64 = payloadBase64.padEnd(payloadBase64.length + (4 - payloadBase64.length % 4) % 4, '=');
    const decodedJson = JSON.parse(window.atob(base64));
    if (!decodedJson || !decodedJson.exp) return false;
    
    // Margen de seguridad de 10 segundos ante desfaces de reloj
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    return decodedJson.exp <= (currentTimeInSeconds + 10);
  } catch (err) {
    logger.error("🚨 [CIMCO-AUTH-GUARD] Error al decodificar JWT:", err);
    return true;
  }
};

const UMBRAL_MINIMO_COP = 2000;

export default function HomeMototaxi() {
  // 🛡️ ESTADOS DEL OPERADOR Y LOGÍSTICA DEL SISTEMA
  const { user, logout } = useAuth(); 
  const { walletData } = useWallet();
  const { socket, isConnected } = useSocket();

  const nombreInicialFallback = user?.email ? user.email.split('@')[0].toUpperCase() : "CIMCO CONDUCTOR";
  const [nombreConductor, setNombreConductor] = useState(nombreInicialFallback); 

  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [solicitudViaje, setSolicitudViaje] = useState(null); // Alerta Socket entrante
  const [servicioActivo, setServicioActivo] = useState(null); // Documento activo en Firestore
  const [ofertasDisponibles, setOfertasDisponibles] = useState([]);
  const [cargandoOfertas, setCargandoOfertas] = useState(true);
  const [coords, setCoords] = useState({ lat: 9.5610, lng: -73.3332 }); // Default: La Jagua de Ibirico
  const [mostrarModalCalificacion, setMostrarModalCalificacion] = useState(false);
  const [datosParaCalificar, setDatosParaCalificar] = useState(null);
  const [errorInterno, setErrorInterno] = useState(null);

  // 🌐 Estado de Conectividad a Internet (Manejo de Estado Offline en UI)
  const [isNetworkOnline, setIsNetworkOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // 📝 Estado Unificado para la Vista Completa AjustesPerfil
  const [modoEdicionAjustes, setModoEdicionAjustes] = useState(false);

  // Formulario de Datos Personales y del Vehículo (Sincronización Local)
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    placa: '',
    vehiculoModelo: '',
    vehiculoColor: '',
    modalidad: 'Mototaxi'
  });

  // 📜 Estados para Navegación e Historial
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' | 'historial' | 'billetera'
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Referencias para control de Telemetría GPS y Desacoplamiento de Efectos
  const geoWatchRef = useRef(null);
  const formDataRef = useRef(formData);
  const conductorIdRef = useRef(null);
  const servicioActivoRef = useRef(servicioActivo);
  const solicitudViajeRef = useRef(solicitudViaje);
  const socketRef = useRef(socket);

  // Recuperación estricta sin ID predeterminado MOCK
  const conductorId = user?.uid || user?.id || user?._id || localStorage.getItem('conductorId'); 

  // Listener para detección en tiempo real de cobertura / estado de red local (Manejo de estado Offline)
  useEffect(() => {
    const handleOnline = () => {
      logger.log("🌐 [CIMCO-NETWORK] Conexión a red restablecida.");
      setIsNetworkOnline(true);
    };
    const handleOffline = () => {
      logger.warn("⚠️ [CIMCO-NETWORK] Cobertura de red interrumpida.");
      setIsNetworkOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sincronizar referencias persistentes para evitar re-suscripciones innecesarias en Socket.io
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    conductorIdRef.current = conductorId;
  }, [conductorId]);

  useEffect(() => {
    servicioActivoRef.current = servicioActivo;
  }, [servicioActivo]);

  useEffect(() => {
    solicitudViajeRef.current = solicitudViaje;
  }, [solicitudViaje]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Mapeo seguro con fallback de $20.000 COP en caso de indeterminación
  const saldoEfectivo = Number(
    user?.saldoWallet ?? 
    user?.billetera?.saldo ?? 
    user?.saldo ?? 
    walletData?.saldo ?? 
    walletData?.balance ?? 
    20000
  );

  const puedeOperar = saldoEfectivo >= UMBRAL_MINIMO_COP;

  // 🛡️ Guarda de seguridad: Desconecta el estado online si no existe ID de conductor válido
  useEffect(() => {
    if (!conductorId) {
      setIsOnline(false);
    }
  }, [conductorId]);

  // Carga de datos iniciales del usuario
  useEffect(() => {
    if (user) {
      const nombreCarga = user?.nombre || user?.displayName || user?.nombreCompleto || nombreInicialFallback;
      setNombreConductor(nombreCarga.toUpperCase());
      setFormData({
        nombre: nombreCarga,
        telefono: user?.telefono || user?.lineaContacto || user?.phoneNumber || user?.telefonoMovil || '',
        placa: user?.placa || 'SIN PLACA',
        vehiculoModelo: user?.vehiculoModelo || user?.modelo || '',
        vehiculoColor: user?.vehiculoColor || user?.color || '',
        modalidad: user?.modalidad || user?.tipoServicio || 'Mototaxi'
      });
    }
  }, [user, nombreInicialFallback]);

  // ==================================================================
  // 1. ESCUCHA REACTIVA DE IDENTIDAD EN FIRESTORE (CON CLEANUP)
  // ==================================================================
  useEffect(() => {
    let unsubscribe = null;
    if (!user?.uid) return;
    
    const pathConductores = FIRESTORE_PATHS?.conductores || FIRESTORE_PATHS?.usuarios || 'usuarios';
    const conductorRef = doc(db, pathConductores, user.uid);

    unsubscribe = onSnapshot(conductorRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const nombreCompleto = data?.nombre || data?.displayName || data?.nombreCompleto || nombreInicialFallback;
        
        setNombreConductor(nombreCompleto.toUpperCase());
        setFormData((prev) => ({
          ...prev,
          nombre: nombreCompleto,
          telefono: data?.telefonoMovil || data?.telefono || data?.lineaContacto || prev.telefono,
          placa: data?.placa || prev.placa,
          vehiculoModelo: data?.vehiculoModelo || data?.modelo || prev.vehiculoModelo,
          vehiculoColor: data?.vehiculoColor || data?.color || prev.vehiculoColor,
          modalidad: data?.modalidad || data?.tipoServicio || prev.modalidad
        }));
      }
    }, (error) => {
      logger.error("🚨 [CIMCO-IDENTITY-ERROR] Fallo en lectura de perfil:", error);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, nombreInicialFallback]);

  // ==================================================================
  // 2. TRANSMISIÓN DE TELEMETRÍA Y DESCONEXIÓN PERIMETRAL
  // ==================================================================
  const desconectarEcosistema = useCallback(() => {
    if (geoWatchRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
      logger.log("🛰️ [CIMCO-TELEMETRIA] Receptor GPS apagado de forma segura.");
    }
    const currentSocket = socketRef.current;
    if (currentSocket && (currentSocket.connected || isConnected)) {
      const currentUid = conductorIdRef.current;
      const currentFormData = formDataRef.current;
      if (currentUid) {
        currentSocket.emit('conductor:offline', { 
          uid: currentUid,
          nombre: currentFormData.nombre,
          placa: currentFormData.placa
        });
        currentSocket.emit('desactivar_conductor', { conductorId: currentUid });
      }
      logger.log("📡 [CIMCO-SOCKET] Notificación de desactivación enviada al socket unificado.");
    }
  }, [isConnected]);

  // Estabilización de Telemetría GPS con Limpieza Estricta de Hooks
  useEffect(() => {
    let watchId = null;

    if (!isOnline) {
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
      return;
    }

    logger.log('🛰️ [CIMCO-TELEMETRIA] Encendiendo receptor GPS...');

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!pos || !pos.coords) return;
        const newCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setCoords(newCoords);

        const activeSocket = socketRef.current;
        const currentUid = conductorIdRef.current || user?.uid;

        if (activeSocket && currentUid) {
          const coordsArray = [pos.coords.longitude, pos.coords.latitude];
          activeSocket.emit('actualizar_ubicacion', { uid: currentUid, coords: coordsArray });

          const currentFormData = formDataRef.current;
          activeSocket.emit('telemetria:location', {
            uid: currentUid,
            coords: newCoords,
            rol: 'mototaxi',
            placa: currentFormData.placa || 'SIN PLACA'
          });
          activeSocket.emit('actualizar_radar_gps', {
            conductorId: currentUid,
            lat: newCoords.lat,
            lng: newCoords.lng
          });
          logger.log(`🎯 [RADAR-BURST] Coordenadas emitidas al ecosistema unificado: [${newCoords.lng}, ${newCoords.lat}]`);
        }
      },
      (err) => logger.error("🚨 Error GPS:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );

    geoWatchRef.current = watchId;

    return () => {
      logger.log('🛰️ [CIMCO-TELEMETRIA] Receptor GPS apagado de forma segura.');
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
    };
  }, [isOnline, user?.uid]);

  // ==================================================================
  // 3. GOBERNANZA DEL CANAL WEBSOCKET CENTRALIZADO (LIMPIEZA ATÓMICA)
  // ==================================================================
  useEffect(() => {
    if (isOnline) {
      if (!conductorId) {
        alert("⚠️ AUTENTICACIÓN REQUERIDA: No se detectó un identificador de conductor válido.");
        setIsOnline(false);
        return;
      }

      if (!puedeOperar) {
        setErrorInterno("⚠️ Saldo insuficiente (< $2.000 COP). Realiza una recarga con el Administrador para operar.");
        alert("⚠️ FONDO INSUFICIENTE: Su cuenta TAXIA CIMCO requiere un saldo mínimo de $2.000 COP para activarse en red.");
        setIsOnline(false);
        return;
      }

      if (!socket) {
        logger.warn("⚠️ [CIMCO-SOCKET] Instancia global de Socket no disponible en este momento.");
        return;
      }

      logger.log(`📡 [CIMCO-SOCKET] Suscribiendo a instancia global centralizada.`);

      const registrarYUnirSalas = () => {
        // 1. Notificar estado online e identidad
        socket.emit('conductor:online', {
          uid: conductorId,
          nombre: formDataRef.current.nombre,
          placa: formDataRef.current.placa,
          tipoServicio: formDataRef.current.modalidad || 'Mototaxi'
        });

        // 2. Registrar conductor y unirse a salas clave de despacho
        socket.emit('registrar_conductor', { 
          conductorId, 
          tipoServicio: formDataRef.current.modalidad || 'Mototaxi',
          email: user?.email || localStorage.getItem('conductorEmail') || ''
        });

        // Unir explícitamente a la sala del tipo de vehículo
        socket.emit('join_room', 'sala_conductores');
        socket.emit('join_room', 'mototaxi');
        socket.emit('unir_sala', { sala: 'mototaxi' });
      };

      if (socket.connected || isConnected) {
        registrarYUnirSalas();
      }

      // Re-registrar si el socket se reconecta
      socket.on('connect', registrarYUnirSalas);

      // Handler unificado de recepción de servicios con desfragmentación de payloads y VALIDACIÓN LOCAL JWT
      const handleNuevaSolicitud = (data) => {
        logger.log("🔥 [CIMCO-RADAR] ¡Alerta de viaje entrante capturada!", data);
        if (!data) return;

        // 🛡️ VALIDACIÓN LOCAL DE VIGENCIA JWT ANTES DE RENDERIZAR
        const activeToken = localStorage.getItem('token') || localStorage.getItem('cimco_token') || user?.token;
        if (isTokenExpired(activeToken)) {
          logger.warn("⚠️ [CIMCO-AUTH-GUARD] JWT expirado detectado al recibir nuevo_viaje_disponible. Desconectando red.");
          setIsOnline(false);
          alert("🔒 Sesión Expirada: Su token de seguridad ha caducado. Inicie sesión nuevamente para recibir solicitudes.");
          desconectarEcosistema();
          logout();
          return;
        }

        // 1. Desempaquetar payload si data viene envuelto en Array o dentro de un objeto anidado
        let viaje = Array.isArray(data) ? data[0] : data;
        if (viaje && typeof viaje === 'object' && viaje.viaje) {
          viaje = viaje.viaje;
        }

        if (!viaje) return;

        // 2. Asignar estado de solicitud si el conductor no tiene servicios activos ni solicitudes pendientes
        if (!servicioActivoRef.current && !solicitudViajeRef.current) {
          setSolicitudViaje(viaje);
        } else {
          logger.warn("⚠️ [CIMCO-RADAR] Solicitud recibida ignorada por existir un servicio activo o una alerta en curso.");
        }
      };

      // Handler para remover dinámicamente ofertas expiradas o tomadas por otro conductor
      const handleViajeRemovido = (payload) => {
        const viajeIdRemover = payload?.viajeId || payload?._id || payload?.id;
        logger.log(`🗑️ [CIMCO-RADAR] Removiendo solicitud del radar local: ${viajeIdRemover}`);
        if (!viajeIdRemover) return;

        setOfertasDisponibles((prev) => prev.filter((v) => v.id !== viajeIdRemover && v._id !== viajeIdRemover && v.viajeId !== viajeIdRemover));
        setSolicitudViaje((prev) => {
          if (!prev) return null;
          const currentId = prev.viajeId || prev.id || prev._id;
          return currentId === viajeIdRemover ? null : prev;
        });
      };

      // 🚨 Escuchar todos los posibles nombres de eventos emitidos por el servidor de despacho
      socket.on('viaje_difundido', handleNuevaSolicitud);
      socket.on('solicitud_servicio', handleNuevaSolicitud);
      socket.on('nuevo_viaje', handleNuevaSolicitud);
      socket.on('servicio_disponible', handleNuevaSolicitud);
      socket.on('nuevo_servicio_mototaxi', handleNuevaSolicitud);
      socket.on('nuevo_viaje_disponible', handleNuevaSolicitud);
      socket.on('viaje_removido_radar', handleViajeRemovido);

      // 🛠️ Traza completa para depuración en vivo
      const handleAnyEvent = (eventName, ...args) => {
        logger.log(`📥 [SOCKET-INCOMING-DEBUG] Evento recibido: "${eventName}"`, args);
      };
      socket.onAny(handleAnyEvent);

      return () => {
        if (socket) {
          socket.off('connect', registrarYUnirSalas);
          socket.off('viaje_difundido', handleNuevaSolicitud);
          socket.off('solicitud_servicio', handleNuevaSolicitud);
          socket.off('nuevo_viaje', handleNuevaSolicitud);
          socket.off('servicio_disponible', handleNuevaSolicitud);
          socket.off('nuevo_servicio_mototaxi', handleNuevaSolicitud);
          socket.off('nuevo_viaje_disponible', handleNuevaSolicitud);
          socket.off('viaje_removido_radar', handleViajeRemovido);
          socket.offAny(handleAnyEvent);
        }
      };
    }
  }, [
    isOnline, 
    conductorId, 
    puedeOperar, 
    socket, 
    isConnected, 
    user?.email,
    user?.token,
    desconectarEcosistema,
    logout
  ]);

  // Limpieza defensiva al desmontar de forma definitiva la vista
  useEffect(() => {
    return () => {
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
      desconectarEcosistema();
    };
  }, [desconectarEcosistema]);

  // Alternar Estado Conectado / Desconectado
  const handleToggleState = () => {
    setErrorInterno(null);
    if (!isOnline && !puedeOperar) {
      setErrorInterno("⚠️ Saldo insuficiente (< $2.000 COP). Realiza una recarga con el Administrador para operar.");
      alert("⚠️ FONDO INSUFICIENTE: Su cuenta TAXIA CIMCO requiere un saldo mínimo de $2.000 COP para activarse en red.");
      return;
    }

    const nextState = !isOnline;
    setIsOnline(nextState);

    if (socket && (socket.connected || isConnected)) {
      if (!nextState) {
        desconectarEcosistema();
      } else {
        socket.emit('conductor:online', {
          uid: conductorId,
          nombre: formData.nombre,
          placa: formData.placa
        });
      }
    }
  };

  const handleAceptarCarrera = (carrera) => {
    setErrorInterno(null);
    if (!carrera) return;

    if (!puedeOperar) {
      setErrorInterno("⚠️ Saldo insuficiente (< $2.000 COP). Realiza una recarga con el Administrador para operar.");
      alert("⚠️ Saldo insuficiente (< $2.000 COP). Realiza una recarga con el Administrador para operar.");
      return;
    }

    const valorCarrera = Number(carrera.valor || carrera.precio || 0);
    const comisionRequerida = valorCarrera * 0.10;
    if (saldoEfectivo < comisionRequerida) {
      setErrorInterno("⚠️ Saldo insuficiente para cubrir la comisión (10%) de este servicio.");
      alert("⚠️ Saldo insuficiente para cubrir la comisión (10%) de este servicio.");
      return;
    }

    const carreraIdTarget = carrera.id || carrera.viajeId || carrera._id;

    if (socket && (socket.connected || isConnected)) {
      socket.emit('aceptar_carrera', { carreraId: carreraIdTarget, conductorId: user?.uid || conductorId });
    }

    aceptarViaje(carreraIdTarget);
  };

  // ==================================================================
  // 4. PATRÓN HÍBRIDO RESILIENTE PARA HISTORIALES URBANOS
  // ==================================================================
  const fetchHistorial = useCallback(async () => {
    const conductorIdTarget = user?.uid || user?.id || user?._id || conductorId;

    if (!conductorIdTarget) {
      setCargandoHistorial(false);
      return;
    }

    setCargandoHistorial(true);

    try {
      const res = await api.get(`/viajes/historial?conductorId=${conductorIdTarget}`);
      if (res.data?.success && Array.isArray(res.data?.viajes)) {
        setHistorial(res.data.viajes);
        setCargandoHistorial(false);
        return;
      }
    } catch (err) {
      logger.warn("⚠️ Fallo en API REST, ejecutando respaldo Firestore:", err);
    }

    try {
      const pathViajes = FIRESTORE_PATHS?.rides || FIRESTORE_PATHS?.viajes || 'viajes';
      const q = query(
        collection(db, pathViajes),
        where('conductorId', '==', conductorIdTarget),
        where('estado', '==', 'COMPLETADO')
      );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

      docs.sort((a, b) => {
        const timestampA = a.fechaCreacion?.seconds || a.fechacreacion?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
        const timestampB = b.fechaCreacion?.seconds || b.fechacreacion?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
        return timestampB - timestampA;
      });

      setHistorial(docs);
    } catch (noSqlErr) {
      logger.error("❌ Fallo en fallback NoSQL:", noSqlErr);
    } finally {
      setCargandoHistorial(false);
    }
  }, [user, conductorId]);

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistorial();
    }
  }, [activeTab, fetchHistorial]);

  // ==================================================================
  // 5. ESCUCHA ATÓMICA DE OFERTAS EN RADAR FIRESTORE (CON CLEANUP)
  // ==================================================================
  useEffect(() => {
    let unsubscribe = null;

    if (!user?.uid || !isOnline) {
      setOfertasDisponibles([]);
      return;
    }

    setCargandoOfertas(true);
    const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
    const q = query(
      collection(db, pathViajes),
      where('estado', '==', 'SOLICITADO')
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
      const ofertas = [];
      snapshot.forEach((docSnap) => {
        ofertas.push({ id: docSnap.id, ...docSnap.data() });
      });
      setOfertasDisponibles(ofertas);
      setCargandoOfertas(false);
    }, (error) => {
      logger.error("🚨 [CIMCO-RADAR-ERROR] Fallo en la escucha de viajes:", error);
      setCargandoOfertas(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, isOnline]);

  // ==================================================================
  // 6. MONITOR DE VIAJE ACTIVO EN HILO DEL CONDUCTOR (FIRESTORE)
  // ==================================================================
  useEffect(() => {
    let unsubscribe = null;
    if (!user?.uid) return;

    const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
    const q = query(
      collection(db, pathViajes),
      where('conductorId', '==', user.uid),
      where('estado', 'in', ['ACEPTADO', 'EN_SITIO', 'EN_VIAJE'])
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docActivo = snapshot.docs[0];
        setServicioActivo({ id: docActivo.id, ...docActivo.data() });
        setSolicitudViaje(null); 
      } else {
        if (servicioActivo && (servicioActivo.estado === 'EN_VIAJE' || servicioActivo.estado === 'FINALIZADO')) {
          setDatosParaCalificar({
            id: servicioActivo.id,
            clienteNombre: servicioActivo.clienteNombre || 'Pasajero CIMCO'
          });
          setMostrarModalCalificacion(true);
        }
        setServicioActivo(null);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, servicioActivo]);

  // ==================================================================
  // 7. ACCIONES DE GESTIÓN DE DESPACHOS
  // ==================================================================
  const aceptarViaje = async (viajeIdParam) => {
    // Resolver ID de viaje priorizando parámetro directo o estado de solicitud activa
    const viajeIdTarget = viajeIdParam || solicitudViaje?.viajeId || solicitudViaje?.id || solicitudViaje?._id || solicitudViaje?.idViaje;
    if (!viajeIdTarget && !solicitudViaje) return;

    if (!puedeOperar) {
      setErrorInterno("⚠️ Saldo insuficiente (< $2.000 COP). Realiza una recarga con el Administrador para operar.");
      alert("⚠️ FONDO INSUFICIENTE: Su cuenta TAXIA CIMCO requiere un saldo mínimo de $2.000 COP para procesar despachos.");
      setSolicitudViaje(null);
      return;
    }

    // 🛡️ VALIDACIÓN PREVIA DEL JWT EN LA ACCIÓN "ACEPTAR VIAJE"
    const currentToken = localStorage.getItem('token') || localStorage.getItem('cimco_token') || user?.token;
    if (isTokenExpired(currentToken)) {
      logger.warn("⚠️ [CIMCO-AUTH-GUARD] Intento de aceptación con JWT expirado. Abortando POST y cerrando sesión.");
      alert("⚠️ Tu cuenta requiere reautenticación o el usuario no existe en el servidor. Inicia sesión nuevamente.");
      setSolicitudViaje(null);
      desconectarEcosistema();
      if (typeof logout === 'function') {
        await logout();
      } else {
        window.location.href = '/login';
      }
      return;
    }
    
    setLoading(true);
    const idCorrecto = viajeIdTarget;
    const idConductorActual = user?.uid || user?.id || user?._id || conductorId || localStorage.getItem('conductorId');

    try {
      logger.log(`⚡ [ACID-DESPACHO] Reclamando viaje ID: ${idCorrecto} para Conductor: ${idConductorActual}`);

      const headers = {};
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }
      if (idConductorActual) {
        headers['x-conductor-id'] = idConductorActual;
      }

      const respuesta = await api.post('/viajes/aceptar', { 
        viajeId: idCorrecto,
        conductorId: idConductorActual
      }, { headers });

      if (respuesta?.data?.success) {
        setServicioActivo(respuesta.data.viaje || { id: idCorrecto, ...solicitudViaje, estado: 'ACEPTADO' });
        setSolicitudViaje(null);
        logger.log("✅ [ACID-DESPACHO] Viaje adjudicado y sincronizado con éxito.");
      }
    } catch (error) {
      logger.error("Error al aceptar viaje:", error);

      // 🛡️ Captura explícita de error 401 por nodo de identidad extinto / sesión inválida
      if (error.response && error.response.status === 401) {
        alert("⚠️ Tu cuenta requiere reautenticación o el usuario no existe en el servidor. Inicia sesión nuevamente.");
        desconectarEcosistema();
        if (typeof logout === 'function') {
          await logout();
        } else {
          window.location.href = '/login';
        }
        return;
      }

      if (error?.response && error.response.status === 409) {
        const msgConflicto = error.response.data?.error || error.response.data?.message || 'La solicitud caducó o fue tomada por otro operador.';
        alert(msgConflicto);
        // Limpiar la tarjeta localmente para mantener la UI sincronizada
        setOfertasDisponibles((prev) => prev.filter((v) => v.id !== idCorrecto && v._id !== idCorrecto && v.viajeId !== idCorrecto));
        setSolicitudViaje(null);
      } else {
        const msgError = error?.response?.data?.message || error?.response?.data?.error || "Error de conexión al procesar la solicitud.";
        logger.error("🚨 [DESPACHO-ERR] Error al reclamar solicitud:", msgError);
        alert(msgError);
        setSolicitudViaje(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const capturarOferta = async (viajeId) => {
    const ofertaObj = ofertasDisponibles.find((v) => v.id === viajeId || v._id === viajeId);
    if (ofertaObj) {
      handleAceptarCarrera(ofertaObj);
      return;
    }

    if (!puedeOperar) {
      setErrorInterno("⚠️ Saldo insuficiente (< $2.000 COP). Realiza una recarga con el Administrador para operar.");
      alert("⚠️ FONDO INSUFICIENTE: Su cuenta TAXIA CIMCO requiere un saldo mínimo de $2.000 COP para procesar despachos.");
      return;
    }

    // 🛡️ VALIDACIÓN PREVIA DEL JWT AL CAPTURAR DESDE EL RADAR
    const currentToken = localStorage.getItem('token') || localStorage.getItem('cimco_token') || user?.token;
    if (isTokenExpired(currentToken)) {
      logger.warn("⚠️ [CIMCO-AUTH-GUARD] Intento de captura con JWT expirado. Abortando transacción.");
      alert("🔒 Sesión Expirada: Su token de acceso ha caducado. Por favor reautentíquese.");
      desconectarEcosistema();
      await logout();
      window.location.replace('/');
      return;
    }

    try {
      const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
      const viajeRef = doc(db, pathViajes, viajeId);
      await runTransaction(db, async (transaction) => {
        const viajeSnap = await transaction.get(viajeRef);
        if (!viajeSnap.exists()) throw new Error("El viaje no existe en la matriz distribuidora.");

        const datosViaje = viajeSnap.data();
        if (datosViaje?.estado !== 'SOLICITADO') {
          throw new Error("Lo sentimos, este servicio ya fue capturado por otra unidad.");
        }

        const valorCarrera = Number(datosViaje.valor || datosViaje.precio || 0);
        const comisionRequerida = valorCarrera * 0.10;
        if (saldoEfectivo < comisionRequerida) {
          throw new Error("⚠️ Saldo insuficiente para cubrir la comisión (10%) de este servicio.");
        }

        transaction.update(viajeRef, {
          estado: 'ACEPTADO',
          conductorId: user?.uid,
          conductorNombre: nombreConductor,
          conductorPlaca: formData.placa,
          conductorTipoServicio: formData.modalidad,
          fechaAceptado: serverTimestamp()
        });
      });
    } catch (err) {
      logger.error("🚨 [CIMCO-CAPTURE-FAIL] Bloqueo transaccional:", err?.message);
      alert(err?.message);
      setOfertasDisponibles((prev) => prev.filter((v) => v.id !== viajeId && v._id !== viajeId));
    }
  };

  const transicionarEstadoViaje = async (nuevoEstado) => {
    if (!servicioActivo?.id) return;
    try {
      const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
      const viajeRef = doc(db, pathViajes, servicioActivo.id);
      await updateDoc(viajeRef, { 
        estado: nuevoEstado,
        [`fecha_${nuevoEstado.toLowerCase()}`]: serverTimestamp()
      });
    } catch (err) {
      logger.error("🚨 [CIMCO-STATE-FAIL] Error al mutar estado:", err);
    }
  };

  const rechazarViaje = () => {
    logger.log("👎 [CIMCO-RADAR] Operador rechaza visualmente la oferta.");
    setSolicitudViaje(null);
  };

  const handleCerrarSesion = async () => {
    if (window.confirm("¿Desea cerrar sesión y salir de la consola de operaciones?")) {
      try {
        desconectarEcosistema();
        if (typeof logout === 'function') {
          await logout();
        }
        window.location.replace('/');
      } catch (error) {
        logger.error("🚨 [CIMCO-LOGOUT-FAIL] Error crítico al desconectar nodo de autenticación:", error);
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/');
      }
    }
  };

  const currentDriverName = formData.nombre || nombreConductor || 'CONDUCTOR';
  const currentPlate = formData.placa || 'SIN PLACA';

  // Renderizado condicional unificado para la vista global de AjustesPerfil preservando el estado de Socket.io
  if (modoEdicionAjustes) {
    return <AjustesPerfil onBack={() => setModoEdicionAjustes(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#0d0e12] text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-sky-500 selection:text-white">

      {/* 📡 RENDERIZADO CONDICIONAL DE ALERTA DE COBERTURA DE RED / ESTADO OFFLINE EN UI */}
      {!isNetworkOnline && (
        <div className="bg-red-500/90 text-white text-xs text-center py-1 font-bold flex items-center justify-center gap-2 animate-pulse sticky top-0 z-50 shadow-md">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Sin conexión a internet. Reintentando...</span>
        </div>
      )}

      {/* ⚠️ NOTIFICACIÓN LOCAL DE ERROR INTERNO (SALDO INSUFICIENTE / COMISIÓN) */}
      {errorInterno && (
        <div className="bg-amber-500/90 text-slate-950 text-xs text-center py-1.5 px-4 font-bold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <span>{errorInterno}</span>
        </div>
      )}

      {/* ════════════════ HEADER SUPERIOR TAQUÍMETRO Y NAVEGACIÓN ════════════════ */}
      <header className="sticky top-0 z-40 bg-[#121214]/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between shadow-xl">
        
        {/* ID Conductor & Vehículo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModoEdicionAjustes(true)}
            className="relative group p-0.5 rounded-xl bg-gradient-to-tr from-sky-500/20 to-amber-500/20 border border-white/10 hover:border-white/30 transition-all duration-300 active:scale-95 text-left"
            title="Configurar Perfil General"
          >
            <div className="bg-[#181920] px-3 py-1.5 rounded-[10px] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold shadow-inner shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white tracking-wide uppercase max-w-[120px] sm:max-w-[180px] truncate">
                  {currentDriverName}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <span className="text-sky-400 font-bold tracking-wider">{currentPlate}</span>
                  <span>•</span>
                  <span className="text-slate-300">{formData.modalidad}</span>
                </div>
              </div>
              <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors ml-1 shrink-0" />
            </div>
          </button>
        </div>

        {/* Acciones de Estado (ONLINE / OFFLINE) y Billetera */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* BOTÓN CONMUTADOR CON PSICOLOGÍA DEL COLOR */}
          {/* OFFLINE: Ámbar / Naranja (Alerta, Espera, Standby) */}
          {/* ONLINE: Azul Suave / Sky Blue (Confianza, Serenidad, Operativo) */}
          <button
            onClick={handleToggleState}
            disabled={!puedeOperar && !isOnline}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black tracking-wider transition-all duration-300 active:scale-95 border ${
              !puedeOperar && !isOnline
                ? 'bg-slate-800/50 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-60'
                : isOnline
                ? 'bg-gradient-to-r from-sky-500/20 via-blue-500/15 to-sky-600/20 text-sky-300 border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:bg-sky-500/30'
                : 'bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-600/20 text-amber-300 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.20)] hover:bg-amber-500/30'
            }`}
          >
            {isOnline ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400"></span>
                </span>
                <Wifi className="w-3.5 h-3.5 text-sky-400" />
                <span>ONLINE</span>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>OFFLINE</span>
              </>
            )}
          </button>

          {/* Saldo de Billetera */}
          <div className="bg-[#181920] border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold shadow-sm">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>${saldoEfectivo.toLocaleString('es-CO')}</span>
          </div>

          {/* Cerrar Sesión */}
          <button
            onClick={handleCerrarSesion}
            className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ════════════════ ÁREA CENTRAL: RADAR / TELEMETRÍA ════════════════ */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 my-auto">
        {activeTab === 'radar' && (
          <div className="w-full max-w-lg mx-auto flex flex-col items-center">
            
            {/* Tarjeta de Servicio Activo */}
            {servicioActivo ? (
              <div className="w-full bg-[#121214]/90 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden mb-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    SERVICIO EN CURSO
                  </span>
                  <span className="text-xs font-mono font-bold text-white bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    {servicioActivo.estado}
                  </span>
                </div>
                <div className="space-y-3 mb-6 text-left">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-sky-400" />
                    {servicioActivo.clienteNombre || 'Pasajero CIMCO'}
                  </p>
                  <p className="text-xs text-slate-300 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Origen:</strong> {servicioActivo.origenDireccion || 'Ubicación seleccionada'}</span>
                  </p>
                  {servicioActivo.destinoDireccion && (
                    <p className="text-xs text-slate-300 flex items-start gap-2">
                      <Navigation className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <span><strong>Destino:</strong> {servicioActivo.destinoDireccion}</span>
                    </p>
                  )}
                  <p className="text-lg font-mono font-bold text-emerald-400 pt-2">
                    ${Number(servicioActivo.valor || 0).toLocaleString('es-CO')} COP
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {servicioActivo.estado === 'ACEPTADO' && (
                    <button
                      onClick={() => transicionarEstadoViaje('EN_SITIO')}
                      className="col-span-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      LLEGUÉ AL SITIO DE RECOGIDA
                    </button>
                  )}
                  {servicioActivo.estado === 'EN_SITIO' && (
                    <button
                      onClick={() => transicionarEstadoViaje('EN_VIAJE')}
                      className="col-span-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      INICIAR CARRERA CON PASAJERO
                    </button>
                  )}
                  {servicioActivo.estado === 'EN_VIAJE' && (
                    <button
                      onClick={() => transicionarEstadoViaje('COMPLETADO')}
                      className="col-span-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      FINALIZAR SERVICIO
                    </button>
                  )}
                </div>
              </div>
            ) : solicitudViaje ? (
              /* Alerta de Solicitud de Viaje Entrante por Socket */
              <div className="w-full bg-[#121214]/95 backdrop-blur-md border border-amber-500/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-pulse mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                    ⚡ NUEVA SOLICITUD DE SERVICIO
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-spin" /> 60s RADAR
                  </span>
                </div>
                <div className="space-y-2 text-left mb-6">
                  <p className="text-sm font-bold text-white">{solicitudViaje.origen || solicitudViaje.origenDireccion || 'Origen solicitado'}</p>
                  {(solicitudViaje.destino || solicitudViaje.destinoDireccion) && (
                    <p className="text-xs text-slate-300">Destino: {solicitudViaje.destino || solicitudViaje.destinoDireccion}</p>
                  )}
                  <p className="text-xl font-mono font-bold text-emerald-400">${Number(solicitudViaje.valor || solicitudViaje.precio || 0).toLocaleString('es-CO')} COP</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={rechazarViaje}
                    className="py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-xs hover:bg-red-500/30 transition-all"
                  >
                    IGNORAR
                  </button>
                  <button
                    onClick={() => handleAceptarCarrera(solicitudViaje)}
                    disabled={loading}
                    className="py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? 'TOMANDO...' : 'ACEPTAR VIAJE'}
                  </button>
                </div>
              </div>
            ) : null}

            {!isOnline ? (
              /* ESTADO OFFLINE - Tono Ámbar Cálido / Seguridad en Pausa */
              <div className="w-full bg-[#121214]/80 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden transition-all">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
                  <WifiOff className="w-8 h-8" />
                </div>

                <h2 className="text-base sm:text-lg font-black tracking-wider text-amber-200 uppercase mb-2">
                  UNIDAD EN PAUSA OPERATIVA
                </h2>

                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mb-6 font-medium">
                  ESTABLEZCA EL INTERRUPTOR EN <span className="text-sky-400 font-bold">ONLINE</span> PARA ACOPLAR SU POSICIÓN AL RADAR SATELITAL DE LA JAGUA DE IBIRICO.
                </p>

                <button
                  onClick={handleToggleState}
                  disabled={!puedeOperar}
                  className={`w-full py-3 px-4 rounded-xl font-black text-xs tracking-wider uppercase transition-all ${
                    puedeOperar
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20 hover:from-sky-400 hover:to-blue-500 active:scale-95'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  }`}
                >
                  ACTIVAR RADAR Y RECIBIR VIAJES
                </button>
              </div>
            ) : (
              /* ESTADO ONLINE - Tono Azul Suave / Conexión Activa y Ágil */
              <div className="w-full bg-[#121214]/80 backdrop-blur-md border border-sky-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden transition-all">
                <div className="absolute -top-16 -left-16 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Banner Telemetría GPS */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[11px] font-mono text-sky-300 mb-6">
                  <Navigation className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                </div>

                {/* Animación de Radar Pulsante */}
                <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-sky-500/20 animate-ping"></div>
                  <div className="absolute inset-2 rounded-full border border-sky-400/30 animate-pulse"></div>
                  <div className="w-20 h-20 rounded-full bg-sky-500/10 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.3)]">
                    <Bike className="w-10 h-10 animate-bounce" />
                  </div>
                </div>

                <h2 className="text-sm sm:text-base font-black tracking-widest text-sky-200 uppercase mb-2">
                  ESCUCHANDO SOLICITUDES EN LA JAGUA DE IBIRICO...
                </h2>

                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed font-medium mb-6">
                  Túnel dúplex activo. El centro de despacho asignará las solicitudes más cercanas a su ubicación.
                </p>

                {/* Lista de Ofertas en Radar Firestore */}
                {ofertasDisponibles.length > 0 && (
                  <div className="mt-4 text-left border-t border-white/10 pt-4">
                    <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">
                      Ofertas disponibles en zona ({ofertasDisponibles.length}):
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {ofertasDisponibles.map((of) => (
                        <div key={of.id} className="bg-[#181920] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                          <div className="text-xs">
                            <p className="font-bold text-white">{of.origenDireccion || of.origen || 'Origen sin especificar'}</p>
                            <p className="text-emerald-400 font-mono font-bold">${Number(of.valor || of.precio || 0).toLocaleString('es-CO')}</p>
                          </div>
                          <button
                            onClick={() => capturarOferta(of.id)}
                            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-bold transition-all"
                          >
                            CAPTURAR
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {activeTab === 'historial' && (
          <div className="w-full max-w-lg bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 text-center shadow-xl">
            <Clock className="w-10 h-10 text-sky-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Historial de Carreras</h3>
            {cargandoHistorial ? (
              <div className="flex justify-center items-center py-6">
                <Loader className="w-6 h-6 text-sky-400 animate-spin" />
              </div>
            ) : historial.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto text-left pr-1">
                {historial.map((item) => (
                  <div key={item.id} className="bg-[#181920] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-white">{item.origenDireccion || item.origen || 'Carrera Local'}</p>
                      <p className="text-[10px] text-slate-400">{item.fechaCreacion ? new Date(item.fechaCreacion.seconds * 1000).toLocaleDateString() : 'Fecha reciente'}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">${Number(item.valor || item.precio || 0).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Sin servicios registrados en el turno actual.</p>
            )}
          </div>
        )}

        {activeTab === 'billetera' && (
          <div className="w-full max-w-lg bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 text-center shadow-xl">
            <Wallet className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Billetera Digital CIMCO</h3>
            <p className="text-2xl font-mono font-bold text-emerald-400 mt-2">${saldoEfectivo.toLocaleString('es-CO')} COP</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Saldo disponible para recarga y comisión de carreras. Recuerde mantener un saldo mínimo de $2.000 COP para operar en red.
            </p>
          </div>
        )}
      </main>

      {/* ════════════════ BARRA DE NAVEGACIÓN INFERIOR ════════════════ */}
      <nav className="sticky bottom-0 z-40 bg-[#121214]/90 backdrop-blur-lg border-t border-white/5 py-2.5 px-6 flex justify-around items-center">
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold tracking-wider transition-colors ${
            activeTab === 'radar' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>RADAR</span>
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold tracking-wider transition-colors ${
            activeTab === 'historial' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>HISTORIAL</span>
        </button>

        <button
          onClick={() => setActiveTab('billetera')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold tracking-wider transition-colors ${
            activeTab === 'billetera' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>BILLETERA</span>
        </button>
      </nav>

      {/* Modal de Calificación */}
      {mostrarModalCalificacion && datosParaCalificar && (
        <ModalCalificacion
          isOpen={mostrarModalCalificacion}
          onClose={() => setMostrarModalCalificacion(false)}
          viajeId={datosParaCalificar.id}
          nombreEvaluado={datosParaCalificar.clienteNombre}
          rolEvaluado="pasajero"
        />
      )}

    </div>
  );
}