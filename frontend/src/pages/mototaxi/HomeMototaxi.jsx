// Versión Arquitectura: V12.19 - Sincronización Unificada de Radar GPS y Autogestión de Perfil Operativo de Flota
// Refactorización Estética: Cyber-Neo-Brutalismo Industrial Puro (Bordes Macizos, Hard Shadows y Cero Curvas)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\mototaxi\HomeMototaxi.jsx
 * Misión: Panel interactivo en tiempo real para el rol 'conductor' de Mototaxi con soporte multi-red, control transaccional e inyección de telemetría geoespacial.
 * Ajuste V12.19: Adición del módulo de edición de perfil táctico para cambio de datos y actualización dinámica de vehículos en malla radar.
 */

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { doc, onSnapshot, collection, query, where, updateDoc, serverTimestamp, runTransaction, addDoc, orderBy } from 'firebase/firestore';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import api from '@/config/api'; 
import ModalCalificacion from '@/components/ModalCalificacion';
import {
  MapPin, Navigation, Wallet, Clock, TrendingUp, AlertCircle, 
  MessageSquare, Send, XCircle, CheckCircle, CircleDollarSign, Signal, LogOut, Loader, User, Edit3, X, Bike
} from 'lucide-react';

const BACKEND_URL = "https://globosely-appreciative-zander.ngrok-free.dev";

export default function HomeMototaxi() {
  // 🛡️ ESTADOS DEL OPERADOR Y LOGÍSTICA DEL SISTEMA
  const { user, logout } = useAuth(); 
  const { walletData, loading: walletLoading } = useWallet();

  const nombreInicialFallback = user?.email ? user.email.split('@')[0].toUpperCase() : "CIMCO CONDUCTOR";
  const [nombreConductor, setNombreConductor] = useState(nombreInicialFallback); 

  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [solicitudViaje, setSolicitudViaje] = useState(null); // Alerta Socket entrante
  const [servicioActivo, setServicioActivo] = useState(null); // Documento activo en Firestore
  const [ofertasDisponibles, setOfertasDisponibles] = useState([]);
  const [cargandoOfertas, setCargandoOfertas] = useState(true);
  const [coordenadas, setCoordenadas] = useState({ lat: 9.5661, lng: -73.3332 }); // Default: La Jagua de Ibirico
  const [mostrarModalCalificacion, setMostrarModalCalificacion] = useState(false);
  const [datosParaCalificar, setDatosParaCalificar] = useState(null);

  // 📝 Estados para la Modal del Perfil Brutalista
  const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);
  const [inputNombre, setInputNombre] = useState('');
  const [inputTelefono, setInputTelefono] = useState('');
  const [inputPlaca, setInputPlaca] = useState('');
  const [inputTipoServicio, setInputTipoServicio] = useState('mototaxi');
  const [errorPerfil, setErrorPerfil] = useState('');

  // Referencias para control perimetral de Sockets y Telemetría
  const socketRef = useRef(null);
  const geoWatchRef = useRef(null);

  // Recuperamos los datos del conductor con guardas anti-undefined estrictas
  const conductorId = user?.uid || user?.id || localStorage.getItem('conductorId') || "MOCK_CONDUCTOR_JAGUA_01"; 
  const token = localStorage.getItem('token') || user?.token;
  const saldoVivo = walletData?.saldo || walletData?.balance || 0;

  // ==================================================================
  // 1. ESCUCHA REACTIVA DE IDENTIDAD EN FIRESTORE
  // ==================================================================
  useEffect(() => {
    if (!user?.uid) return;
    
    const pathConductores = FIRESTORE_PATHS?.conductores || 'conductores';
    const conductorRef = doc(db, pathConductores, user.uid);

    const unsubscribe = onSnapshot(conductorRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const nombreCompleto = data?.nombre || data?.displayName || data?.nombreCompleto || nombreInicialFallback;
        
        setNombreConductor(nombreCompleto.toUpperCase());
        setInputNombre(nombreCompleto);
        setInputTelefono(data?.telefono || '');
        setInputPlaca(data?.placa || '');
        setInputTipoServicio(data?.tipoServicio || 'mototaxi');
      }
    }, (error) => {
      console.error("🚨 [CIMCO-IDENTITY-ERROR] Fallo en lectura de perfil:", error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // ==================================================================
  // 2. GOBERNANZA DEL CANAL WEBSOCKET (SOCKET.IO NGROK) Y TELEMETRÍA
  // ==================================================================
  useEffect(() => {
    if (isOnline) {
      if (Number(saldoVivo) < 2000) {
        alert("⚠️ FONDO INSUFICIENTE: Su cuenta TAXIA CIMCO requiere un saldo mínimo de $2.000 COP para activarse en red.");
        setIsOnline(false);
        return;
      }

      console.log(`📡 [CIMCO-SOCKET] Inicializando canal reactivo hacia: ${BACKEND_URL}`);
      
      socketRef.current = io(BACKEND_URL, {
        auth: { token },
        transports: ['websocket']
      });

      socketRef.current.on('connect', () => {
        console.log(`✅ [CIMCO-SOCKET] Conectado exitosamente con ID: ${socketRef.current.id}`);
        socketRef.current.emit('registrar_conductor', { 
          conductorId, 
          tipoServicio: inputTipoServicio,
          email: user?.email || localStorage.getItem('conductorEmail') || ''
        });
      });

      // ⚡ RECEPTOR CRÍTICO: Escucha instantánea de solicitudes de viaje por Sockets
      socketRef.current.on('nueva_solicitud_viaje', (data) => {
        console.log("🔥 [CIMCO-RADAR] ¡Alerta de viaje entrante detectada en el perímetro!", data);
        if (!servicioActivo && !solicitudViaje) {
          setSolicitudViaje(data);
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log("⚠️ [CIMCO-SOCKET] Canal perimetral desconectado.");
      });

      iniciarTrackingGPS();

    } else {
      desconectarEcosistema();
    }

    return () => {
      desconectarEcosistema();
    };
  }, [isOnline, conductorId, token, saldoVivo, inputTipoServicio]);

  // ==================================================================
  // 3. TRANSMISIÓN DE TELEMETRÍA (CIMCO-RADAR 2DSPHERE UNIFICADO)
  // ==================================================================
  const iniciarTrackingGPS = () => {
    if (!navigator.geolocation) {
      console.error("❌ [GPS-ERROR] Geolocalización no soportada por este navegador/dispositivo.");
      return;
    }

    console.log("🛰️ [CIMCO-TELEMETRIA] Encending receptor de satélites GPS...");
    geoWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!position || !position.coords) return;
        const { latitude, longitude } = position.coords;
        setCoordenadas({ lat: latitude, lng: longitude });

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('actualizar_radar_gps', {
            conductorId,
            lat: latitude,
            lng: longitude
          });
          console.log(`🎯 [RADAR-BURST] Coordenadas emitidas al ecosistema unificado: [${longitude}, ${latitude}]`);
        }
      },
      (error) => {
        console.error(`❌ [GPS-TRACKING-ERR] Código: ${error?.code} | ${error?.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const desconectarEcosistema = () => {
    if (geoWatchRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
      console.log("🛰️ [CIMCO-TELEMETRIA] Receptor GPS apagado de forma segura.");
    }
    if (socketRef.current) {
      socketRef.current.emit('desactivar_conductor', { conductorId });
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log("📡 [CIMCO-SOCKET] Conexión de red purgada.");
    }
  };

  // ==================================================================
  // 4. ESCUCHA ATÓMICA DE OFERTAS EN RADAR FIRESTORE
  // ==================================================================
  useEffect(() => {
    if (!user?.uid || !isOnline) {
      setOfertasDisponibles([]);
      return;
    }

    setCargandoOfertas(true);
    const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
    const q = query(
      collection(db, pathViajes),
      where('estado', '==', 'SOLICITADO'),
      orderBy('fechacreacion', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ofertas = [];
      snapshot.forEach((doc) => {
        ofertas.push({ id: doc.id, ...doc.data() });
      });
      setOfertasDisponibles(ofertas);
      setCargandoOfertas(false);
    }, (error) => {
      console.error("🚨 [CIMCO-RADAR-ERROR] Fallo en la escucha de viajes:", error);
      setCargandoOfertas(false);
    });

    return () => unsubscribe();
  }, [user?.uid, isOnline]);

  // ==================================================================
  // 5. MONITOR DE VIAJE ACTIVO EN HILO DEL CONDUCTOR (FIRESTORE)
  // ==================================================================
  useEffect(() => {
    if (!user?.uid) return;

    const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
    const q = query(
      collection(db, pathViajes),
      where('conductorId', '==', user.uid),
      where('estado', 'in', ['ACEPTADO', 'EN_SITIO', 'EN_VIAJE'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
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

    return () => unsubscribe();
  }, [user?.uid]);

  // ==================================================================
  // 6. ACCIONES DE GESTIÓN DE DESPACHOS Y AJUSTES DE PERFIL
  // ==================================================================
  const handleActualizarPerfil = async (e) => {
    e.preventDefault();
    setErrorPerfil('');

    if (!inputNombre.trim() || !inputPlaca.trim()) {
      setErrorPerfil("⚠️ Nombre y Placa son obligatorios.");
      return;
    }

    try {
      const pathConductores = FIRESTORE_PATHS?.conductores || 'conductores';
      const conductorRef = doc(db, pathConductores, user.uid);

      await updateDoc(conductorRef, {
        nombre: inputNombre.trim(),
        telefono: inputTelefono.trim(),
        placa: inputPlaca.trim().toUpperCase(),
        tipoServicio: inputTipoServicio,
        fechaActualizacion: serverTimestamp()
      });

      // Si está en línea, reenviamos la actualización al gateway de Sockets
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('registrar_conductor', { 
          conductorId, 
          tipoServicio: inputTipoServicio,
          email: user?.email || ''
        });
      }

      setMostrarModalPerfil(false);
      console.log("🔒 [PERFIL-CIMCO] Parámetros de la unidad modificados con éxito.");
    } catch (err) {
      console.error("🚨 [PERFIL-FAIL] Error al escribir en nodo atómico:", err);
      setErrorPerfil("Error interno al sincronizar el perfil.");
    }
  };

  const aceptarViaje = async () => {
    if (!solicitudViaje) return;
    if (Number(saldoVivo) < 2000) {
      alert("⚠️ FONDO INSUFICIENTE: Su cuenta TAXIA CIMCO requiere un saldo mínimo de $2.000 COP para procesar despachos.");
      setSolicitudViaje(null);
      return;
    }
    setLoading(true);
    try {
      console.log(`⚡ [ACID-DESPACHO] Intentando aceptar el viaje ID: ${solicitudViaje.viajeId}`);
      
      const respuesta = await api.post(`/api/viajes/aceptar`, {
        viajeId: solicitudViaje.viajeId,
        conductorId
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (respuesta?.data?.success) {
        setServicioActivo(respuesta.data.viaje);
        setSolicitudViaje(null);
        console.log("✅ [ACID-DESPACHO] Viaje adjudicado y sincronizado en Atlas.");
      }
    } catch (error) {
      console.error("🚨 [DESPACHO-ERR] Error al reclamar solicitud de servicio:", error?.response?.data?.message || error?.message);
      alert(error?.response?.data?.message || "La solicitud caducó o fue tomada por otro operador.");
      setSolicitudViaje(null);
    } finally {
      setLoading(false);
    }
  };

  const capturarOferta = async (viajeId) => {
    if (Number(saldoVivo) < 2000) {
      alert("⚠️ FONDO INSUFICIENTE: Su cuenta TAXIA CIMCO requiere un saldo mínimo de $2.000 COP para procesar despachos.");
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
          throw new Error("Lo sentimos, este servicio ya fue capturado por otra unidad perimetral.");
        }

        transaction.update(viajeRef, {
          estado: 'ACEPTADO',
          conductorId: user?.uid,
          conductorNombre: nombreConductor,
          conductorPlaca: inputPlaca,
          conductorTipoServicio: inputTipoServicio,
          fechaAceptado: serverTimestamp()
        });
      });
    } catch (err) {
      console.error("🚨 [CIMCO-CAPTURE-FAIL] Bloqueo transaccional:", err?.message);
      alert(err?.message);
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
      console.error("🚨 [CIMCO-STATE-FAIL] Error al mutar estado:", err);
    }
  };

  const rechazarViaje = () => {
    console.log("👎 [CIMCO-RADAR] Operador rechaza visualmente la oferta.");
    setSolicitudViaje(null);
  };

  const handleCerrarSesion = async () => {
    if (window.confirm("¿Desea cerrar sesión y salir de la consola de operaciones?")) {
      try {
        desconectarEcosistema();
        await logout();
        window.location.replace('/');
      } catch (error) {
        console.error("🚨 [CIMCO-LOGOUT-FAIL] Error crítico al desconectar nodo de autenticación:", error);
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e11] text-zinc-100 font-mono antialiased pb-28 relative selection:bg-cyan-400 selection:text-black">
      
      {/* 🔝 ENCABEZADO DE CONTROL MAESTRO (CIMCO-UI V12.18 NEO-BRUTALIST) */}
      <header className="sticky top-0 z-50 bg-zinc-900 border-b-4 border-black p-4 flex justify-between items-center shadow-[0_4px_0px_0px_#000]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button 
            onClick={() => setMostrarModalPerfil(true)}
            className="p-2 bg-yellow-400 text-black border-2 border-black font-black text-base flex items-center justify-center shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all shrink-0 rounded-none hover:bg-yellow-300"
          >
            🛺
          </button>
          <div className="min-w-0 flex-1">
            <button 
              onClick={() => setMostrarModalPerfil(true)}
              className="text-xs font-black tracking-widest text-white uppercase truncate flex items-center gap-1.5 hover:text-cyan-400 text-left w-full focus:outline-none"
              title="Click para editar parámetros de unidad"
            >
              {nombreConductor} <Edit3 size={11} className="text-zinc-500 shrink-0" />
            </button>
            <p className="text-[9px] text-zinc-400 font-bold tracking-widest uppercase flex items-center gap-1 mt-1">
              <Signal size={10} className={isOnline ? "text-emerald-400 animate-pulse" : "text-zinc-600"} strokeWidth={3} /> 
              {isOnline ? 'CONECTADO' : 'OFFLINE'} 
              <span className="text-zinc-700">|</span> 
              <span className="text-zinc-400 text-[8px] bg-black px-1 border border-zinc-800">{inputPlaca || 'SIN PLACA'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* Switch de Estado Operativo Global Rígido */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1.5 rounded-none font-black text-[10px] uppercase tracking-wider border-2 border-black transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_0px_#000] ${
              isOnline 
                ? 'bg-emerald-400 text-black font-black' 
                : 'bg-zinc-800 text-zinc-400 border-black hover:bg-zinc-700'
            }`}
          >
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </button>

          {/* BILLETERA DE OPERACIONES */}
          <div className="flex items-center gap-2 bg-black border-2 border-black px-2.5 py-1.5 rounded-none shadow-[2px_2px_0px_0px_#000]">
            <Wallet size={13} className="text-cyan-400" strokeWidth={2.5} />
            <span className="text-[10px] font-black text-zinc-200">
              {walletLoading ? '...' : `$${Number(saldoVivo).toLocaleString('es-CO')}`}
            </span>
          </div>

          {/* BOTÓN DE SALIDA BRUTALISTA */}
          <button 
            onClick={handleCerrarSesion}
            title="Cerrar sesión de Conductor"
            className="p-2 bg-red-500 text-black border-2 border-black rounded-none hover:bg-red-600 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center shadow-[2px_2px_0px_0px_#000] shrink-0 touch-manipulation"
          >
            <LogOut size={13} strokeWidth={3} />
          </button>
        </div>
      </header>

      {/* BANNER DE ALERTA DE SALDO: IMPACTO INDUSTRIAL */}
      {Number(saldoVivo) < 2000 && !walletLoading && (
        <div className="m-4 p-3 bg-red-500 text-black border-4 border-black rounded-none flex items-center gap-2.5 font-black text-[10px] uppercase tracking-wider shadow-[4px_4px_0px_0px_#000] relative z-10 animate-pulse">
          <AlertCircle size={16} strokeWidth={2.5} className="shrink-0" />
          <span>Malla Bloqueada: Requiere Saldo Mínimo ($2.000 COP)</span>
        </div>
      )}

      {/* 🗺️ CONTENEDOR CENTRAL DE LOGÍSTICA CONTENIDA */}
      <main className="p-4 z-10 relative max-w-md mx-auto space-y-6">
        
        {!isOnline && (
          <div className="text-center p-6 bg-zinc-900 border-4 border-black shadow-[4px_4px_0px_0px_#000] rounded-none my-8">
            <div className="w-12 h-12 bg-black border-2 border-black rounded-none flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_0px_#000]">
              <AlertCircle className="text-zinc-500" size={20} strokeWidth={2.5} />
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed uppercase font-bold tracking-wide">
              Establezca el interruptor en <strong className="text-emerald-400 font-black">ONLINE</strong> para acoplar su posición al radar satelital de La Jagua de Ibirico.
            </p>
          </div>
        )}

        {isOnline && (
          <>
            {/* 🛡️ CASO 1: ADJUDICACIÓN DE ORDEN ACTIVA (FIRESTORE) */}
            {servicioActivo ? (
              <div className="bg-zinc-900 p-5 border-4 border-black shadow-[4px_4px_0px_0px_#000] rounded-none space-y-4">
                <div className="flex justify-between items-center border-b-4 border-black pb-3">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="text-emerald-400 animate-pulse" size={14} strokeWidth={3} />
                    <span className="text-[9px] font-black tracking-widest bg-yellow-400 text-black border-2 border-black px-2 py-0.5 uppercase">
                      ESTADO: {servicioActivo.estado}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold bg-black text-zinc-400 px-2 py-0.5 border border-zinc-800">
                    ID: ...{String(servicioActivo?.id || "").slice(-6).toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3 text-xs bg-black/40 p-3 border-2 border-black">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-emerald-400 mt-0.5 shrink-0" strokeWidth={2.5} />
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-black">Origen / Recogida</p>
                      <p className="text-zinc-200 font-bold text-[11px] mt-0.5 leading-tight">{servicioActivo.origenDireccion || "Ubicación Georreferenciada"}</p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-zinc-800 my-2"></div>

                  <div className="flex items-start gap-2.5">
                    <Navigation size={14} className="text-cyan-400 mt-0.5 shrink-0" strokeWidth={2.5} />
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-black">Destino Final</p>
                      <p className="text-zinc-200 font-bold text-[11px] mt-0.5 leading-tight">{servicioActivo.destinoDireccion || "Destino Georreferenciado"}</p>
                    </div>
                  </div>

                  <div className="border-t border-4 border-black pt-3 mt-2 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-black">
                      <CircleDollarSign size={14} className="text-yellow-400" strokeWidth={2.5} />
                      <span>Liquidación:</span>
                    </div>
                    <span className="text-xs font-black text-white bg-black border border-zinc-800 px-2.5 py-1">
                      ${Number(servicioActivo.valor || 0).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  {servicioActivo.estado === 'ACEPTADO' && (
                    <button 
                      onClick={() => transicionarEstadoViaje('EN_SITIO')}
                      className="w-full bg-cyan-400 hover:bg-cyan-500 text-black text-xs font-black uppercase py-3.5 border-2 border-black rounded-none tracking-widest shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#000] transition-all"
                    >
                      Confirmar: Llegada al Sitio
                    </button>
                  )}
                  {servicioActivo.estado === 'EN_SITIO' && (
                    <button 
                      onClick={() => transicionarEstadoViaje('EN_VIAJE')}
                      className="w-full bg-emerald-400 text-black text-xs font-black uppercase py-3.5 border-2 border-black rounded-none tracking-widest shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#000] transition-all"
                    >
                      Iniciar Ruta Transaccional
                    </button>
                  )}
                  {servicioActivo.estado === 'EN_VIAJE' && (
                    <button 
                      onClick={() => transicionarEstadoViaje('FINALIZADO')}
                      className="w-full bg-yellow-400 text-black text-xs font-black uppercase py-3.5 border-2 border-black rounded-none tracking-widest shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#000] transition-all"
                    >
                      Finalizar y Cobrar Servicio
                    </button>
                  )}
                  
                  {/* Botón de contingencia estructural */}
                  <button 
                    onClick={() => {
                      console.log("🏁 [CIMCO] Finalización forzada de viaje simulada.");
                      setDatosParaCalificar({ id: servicioActivo?.id || 'SIMULADO', clienteNombre: servicioActivo?.clienteNombre || 'Pasajero CIMCO' });
                      setServicioActivo(null);
                      setMostrarModalCalificacion(true);
                    }}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[9px] uppercase py-1.5 border-2 border-black rounded-none font-bold tracking-wider"
                  >
                    Simular Cierre Forzado
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 🛡️ CASO 2: CARD FLOTANTE INTERACTIVO DE SOLICITUD SOCKET EN VIVO */}
                {solicitudViaje && (
                  <div className="w-full bg-zinc-900 border-4 border-yellow-400 p-5 rounded-none shadow-[6px_6px_0px_0px_#000] space-y-4 mb-6 animate-pulse">
                    <div className="flex justify-between items-start border-b-2 border-black pb-3">
                      <span className="bg-yellow-400 text-black text-[9px] font-black px-2 py-1 border border-black uppercase tracking-wider">
                        VIAJE INBOUND (SOCKET)
                      </span>
                      <span className="text-sm font-black text-emerald-400 bg-black px-2.5 py-0.5 border border-zinc-800">
                        ${Number(solicitudViaje?.tarifa || solicitudViaje?.valor || 0).toLocaleString('es-CO')}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-xs text-zinc-300 bg-black/40 p-3 border-2 border-black">
                      <p className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-black shrink-0">📍</span>
                        <span className="leading-tight"><strong className="text-zinc-500 uppercase text-[9px] block">Recogida:</strong> {solicitudViaje?.origenTexto || solicitudViaje?.origenDireccion || solicitudViaje?.origen?.direccion || "Ubicación Georeferenciada"}</span>
                      </p>
                      <div className="border-t border-dashed border-zinc-800 my-1.5"></div>
                      <p className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-black shrink-0">🏁</span>
                        <span className="leading-tight"><strong className="text-zinc-500 uppercase text-[9px] block">Destino:</strong> {solicitudViaje?.destinoTexto || solicitudViaje?.destinoDireccion || solicitudViaje?.destino?.direccion || "Por definir"}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={rechazarViaje}
                        disabled={loading}
                        className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 py-2 rounded-none font-bold text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
                      >
                        Ignorar
                      </button>
                      <button
                        onClick={aceptarViaje}
                        disabled={loading}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black py-2 rounded-none font-black text-xs uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
                      >
                        {loading ? 'ASIGNANDO...' : '¡ACEPTAR!'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 🛡️ CASO 3: RADAR GENERAL DE MALLA DE RED FIRESTORE */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1 border-b-2 border-black pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-cyan-400" strokeWidth={2.5} />
                      <h2 className="text-[10px] uppercase font-black tracking-widest text-zinc-400">
                        Malla Radar ({ofertasDisponibles.length})
                      </h2>
                    </div>
                    <span className="text-[9px] text-zinc-400 bg-zinc-900 px-2 py-1 border-2 border-black flex items-center gap-1.5 font-bold shadow-[1px_1px_0px_0px_#000]">
                      <MapPin size={11} className="text-red-400" strokeWidth={3} />
                      GPS: {coordenadas?.lng?.toFixed(4) || "0.0000"}, {coordenadas?.lat?.toFixed(4) || "0.0000"}
                    </span>
                  </div>

                  {cargandoOfertas ? (
                    <div className="text-center py-12 text-zinc-500 font-bold text-xs uppercase tracking-wider bg-zinc-900 border-4 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-3">
                      <Loader size={14} className="animate-spin text-cyan-400" /> Sincronizando malla...
                    </div>
                  ) : ofertasDisponibles.length === 0 ? (
                    <div className="bg-zinc-900 border-4 border-black rounded-none p-8 text-center text-zinc-500 text-xs uppercase tracking-widest font-black shadow-[4px_4px_0px_0px_#000]">
                      Escuchando solicitudes en La Jagua de Ibirico...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ofertasDisponibles.map((oferta) => (
                        <div 
                          key={oferta.id} 
                          className="bg-zinc-900 p-4 border-4 border-black rounded-none flex flex-col gap-3 shadow-[4px_4px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-150"
                        >
                          <div className="text-xs space-y-2">
                            <div className="flex items-center justify-between border-b-2 border-black pb-2">
                              <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest bg-black px-2 py-0.5 border border-zinc-800">
                                {oferta.categoria || 'ESTÁNDAR'}
                              </span>
                              <span className="font-black text-emerald-400 text-sm">${Number(oferta.valor || 0).toLocaleString('es-CO')}</span>
                            </div>
                            <div className="space-y-1 bg-black/30 p-2 border border-zinc-800">
                              <p className="text-zinc-300 font-bold text-[11px] truncate flex items-center gap-1.5">
                                <MapPin size={12} className="text-emerald-400 shrink-0" strokeWidth={2.5} /> {oferta.origenDireccion || "Ubicación Base"}
                              </p>
                              <p className="text-zinc-400 text-[10px] truncate flex items-center gap-1.5">
                                <Navigation size={12} className="text-cyan-400 shrink-0" strokeWidth={2.5} /> {oferta.destinoDireccion || "Destino Final"}
                              </p>
                            </div>
                          </div>
                          <div className="pt-1">
                            <button 
                              onClick={() => capturarOferta(oferta.id)}
                              disabled={Number(saldoVivo) < 2000}
                              className="w-full bg-cyan-400 text-black disabled:bg-zinc-800 disabled:border-zinc-700 disabled:text-zinc-600 font-black text-[10px] py-2.5 px-4 rounded-none uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                            >
                              {Number(saldoVivo) < 2000 ? 'SALDO BLOQUEADO' : 'CAPTURAR OFERTA'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* MODAL NEO-BRUTALISTA DE AJUSTES DE CUENTA / VEHÍCULO */}
      {mostrarModalPerfil && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[5000] p-4">
          <div className="w-full max-w-sm bg-zinc-900 border-4 border-black rounded-none p-5 shadow-[6px_6px_0px_0px_#000] relative font-mono animate-scaleUp text-zinc-100">
            <button 
              onClick={() => setMostrarModalPerfil(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white border-2 border-black p-1 bg-black shadow-[1px_1px_0px_0px_#000]"
            >
              <X size={14} />
            </button>
            <h3 className="text-xs font-black uppercase tracking-widest text-yellow-400 mb-4 flex items-center gap-2">
              <User size={14} /> Ajustes de Unidad
            </h3>

            {errorPerfil && (
              <p className="p-2 mb-3 bg-red-500 text-black text-[10px] font-black uppercase tracking-wider border-2 border-black">
                {errorPerfil}
              </p>
            )}

            <form onSubmit={handleActualizarPerfil} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-black">Nombre del Conductor</label>
                <input 
                  type="text"
                  value={inputNombre}
                  onChange={(e) => setInputNombre(e.target.value)}
                  placeholder="Ej: CARLOS FUENTES"
                  className="w-full bg-black border-2 border-black rounded-none p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-black">Línea de Contacto</label>
                <input 
                  type="tel"
                  value={inputTelefono}
                  onChange={(e) => setInputTelefono(e.target.value)}
                  placeholder="Ej: 3001234567"
                  className="w-full bg-black border-2 border-black rounded-none p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-black">Placa Vehículo</label>
                  <input 
                    type="text"
                    value={inputPlaca}
                    onChange={(e) => setInputPlaca(e.target.value)}
                    placeholder="Ej: ABC12D"
                    className="w-full bg-black border-2 border-black rounded-none p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-cyan-400 font-mono uppercase"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-black">Modalidad Flota</label>
                  <select 
                    value={inputTipoServicio}
                    onChange={(e) => setInputTipoServicio(e.target.value)}
                    className="w-full bg-black border-2 border-black rounded-none p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
                  >
                    <option value="mototaxi">🛺 Mototaxi</option>
                    <option value="motoparrillero">🛵 Motoparrillero</option>
                    <option value="motocarga">🚛 Motocarga</option>
                    <option value="intermunicipal">🛣️ Intermunicipal</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-cyan-400 hover:bg-cyan-500 text-black text-xs font-black uppercase tracking-widest py-3 border-2 border-black rounded-none shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              >
                Sincronizar Unidad
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🧭 BARRA DE NAVEGACIÓN INFERIOR (CIMCO-UI V12.18 NEO-BRUTALIST RIGID) */}
      <footer className="fixed bottom-0 left-0 w-full bg-zinc-900 border-t-4 border-black p-3 flex justify-around items-center z-50 shadow-[0_-4px_0px_0px_#000]">
        <button className="text-cyan-400 flex flex-col items-center gap-0.5 transition-transform active:scale-95">
          <Navigation size={18} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-wider">Radar</span>
        </button>
        <button className="text-zinc-600 flex flex-col items-center gap-0.5 cursor-not-allowed opacity-50">
          <Clock size={18} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-wider">Historial</span>
        </button>
        <button className="text-zinc-600 flex flex-col items-center gap-0.5 cursor-not-allowed opacity-50">
          <CircleDollarSign size={18} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-wider">Billetera</span>
        </button>
      </footer>

      {/* MANEJO DE CALIFICACIÓN TRANSACCIONAL POST-VIAJE */}
      {mostrarModalCalificacion && datosParaCalificar && (
        <ModalCalificacion
          isOpen={mostrarModalCalificacion}
          onClose={() => {
            setMostrarModalCalificacion(false);
            setDatosParaCalificar(null);
          }}
          viajeId={datosParaCalificar?.id || datosParaCalificar?.viajeId}
          usuarioRol="conductor"
          nombreContraparte={datosParaCalificar?.clienteNombre}
        />
      )}
    </div>
  );
}