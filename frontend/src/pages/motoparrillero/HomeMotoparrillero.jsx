// Versión Arquitectura: V12.20 - Corrección de Sintaxis Final y Exportación por Defecto Estándar ES6
import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, collection, query, where, updateDoc, serverTimestamp, runTransaction, orderBy } from 'firebase/firestore';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useSocket } from '@/hooks/useSocket';
import authService from '@/services/authService';
import api from '@/config/api'; 
import ModalCalificacion from '@/components/ModalCalificacion';
import {
  MapPin, Navigation, Wallet, TrendingUp, AlertCircle, 
  CircleDollarSign, Signal, LogOut, Loader, UserSquare2
} from 'lucide-react';

const UMBRAL_MINIMO_COP = 2000;

export default function HomeMotoparrillero() {
  // 🛡️ ESTADOS DEL OPERADOR Y LOGÍSTICA DEL SISTEMA
  const { user, logout } = useAuth(); 
  const { walletData, loading: walletLoading } = useWallet();
  const { socket, isConnected: isSocketConnected } = useSocket();

  const nombreInicialFallback = user?.email ? user.email.split('@')[0].toUpperCase() : "CIMCO PARRILLERO";
  const [nombreConductor, setNombreConductor] = useState(nombreInicialFallback); 
  
  // 📝 ESTADOS COMPLEMENTARIOS DE VEHÍCULO / PERFIL
  const [datosPerfil, setDatosPerfil] = useState({
    nombre: '',
    telefonoMovil: '',
    foto_perfil: '',
    placa: '',
    motoModelo: ''
  });

  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);
  const [solicitudViaje, setSolicitudViaje] = useState(null); 
  const [servicioActivo, setServicioActivo] = useState(null); 
  const [ofertasDisponibles, setOfertasDisponibles] = useState([]);
  const [cargandoOfertas, setCargandoOfertas] = useState(true);
  const [coordenadas, setCoordenadas] = useState({ lat: 9.5661, lng: -73.3332 }); 
  const [mostrarModalCalificacion, setMostrarModalCalificacion] = useState(false);
  const [datosParaCalificar, setDatosParaCalificar] = useState(null);
  const [errorInterno, setErrorInterno] = useState('');

  const geoWatchRef = useRef(null);

  const conductorId = user?.uid || user?.id || localStorage.getItem('conductorId'); 
  const token = localStorage.getItem('token') || user?.token;
  const saldoEfectivo = walletData?.saldo ?? walletData?.balance ?? 0;
  const puedeOperar = saldoEfectivo >= UMBRAL_MINIMO_COP;

  // Validation: Desconectar de red si no existe ID de conductor válido
  useEffect(() => {
    if (!conductorId) {
      setIsOnline(false);
    }
  }, [conductorId]);

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
        const nombreCompleto = data?.nombre || data?.displayName || data?.nombreCompleto || '';
        
        if (nombreCompleto) {
          setNombreConductor(nombreCompleto.toUpperCase());
        }
        
        // Sincronizar datos locales para el formulario de edición
        setDatosPerfil({
          nombre: nombreCompleto,
          telefonoMovil: data?.telefonoMovil || data?.telefono || '',
          foto_perfil: data?.foto_perfil || data?.photoURL || '',
          placa: data?.placa || data?.vehiculo?.placa || '',
          motoModelo: data?.motoModelo || data?.vehiculo?.modelo || ''
        });
      }
    }, (error) => {
      console.error("🚨 [CIMCO-IDENTITY-ERROR] Fallo en lectura de perfil Parrillero:", error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // ==================================================================
  // 2. ACTUALIZACIÓN MUTABLE DE DATOS CENTRALIZADA (authService)
  // ==================================================================
  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setGuardandoPerfil(true);
    
    try {
      // 1. Actualización centralizada de credenciales y perfil básico
      await authService.updateProfile({
        nombre: datosPerfil.nombre,
        telefonoMovil: datosPerfil.telefonoMovil,
        foto_perfil: datosPerfil.foto_perfil
      });

      // 2. Actualización de atributos de vehículo específicos en la colección Firestore
      const pathConductores = FIRESTORE_PATHS?.conductores || 'conductores';
      const conductorRef = doc(db, pathConductores, user.uid);
      
      await updateDoc(conductorRef, {
        placa: datosPerfil.placa.toUpperCase(),
        motoModelo: datosPerfil.motoModelo,
        fechaActualizacion: serverTimestamp()
      });
      
      setMostrarModalPerfil(false);
      alert("✅ PERFIL Y VEHÍCULO ACTUALIZADOS EN RED");
    } catch (error) {
      console.error("🚨 [CIMCO-PROFILE-UPDATE-ERR] No se pudieron salvar los datos:", error);
      alert("Error al actualizar los datos en el servidor.");
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // ==================================================================
  // 3. GOBERNANZA DEL CANAL WEBSOCKET E INYECCIÓN 'motoparrillero'
  // ==================================================================
  useEffect(() => {
    if (isOnline) {
      if (!conductorId) {
        alert("⚠️ No se identificó la sesión del conductor. Por favor inicie sesión de nuevo.");
        setIsOnline(false);
        return;
      }

      if (!puedeOperar) {
        const msg = "⚠️ Saldo insuficiente (< $2.000 COP). Realiza una recarga con el Administrador para operar.";
        setErrorInterno(msg);
        alert(msg);
        setIsOnline(false);
        return;
      }

      if (socket) {
        console.log(`📡 [CIMCO-SOCKET] Registrando conductor parrillero en hook unificado`);
        socket.emit('registrar_conductor', { 
          conductorId, 
          tipoServicio: 'motoparrillero',
          email: user?.email || localStorage.getItem('conductorEmail') || ''
        });

        const handleNuevaSolicitud = (data) => {
          console.log("🔥 [CIMCO-RADAR] ¡Alerta de servicio parrillero inbound!", data);
          if (!servicioActivo && !solicitudViaje) {
            setSolicitudViaje(data);
          }
        };

        socket.on('nueva_solicitud_viaje', handleNuevaSolicitud);

        iniciarTrackingGPS();

        return () => {
          socket.off('nueva_solicitud_viaje', handleNuevaSolicitud);
          detenerTrackingGPS();
          if (conductorId) {
            socket.emit('desactivar_conductor', { conductorId });
          }
        };
      }
    } else {
      detenerTrackingGPS();
      if (socket && conductorId) {
        socket.emit('desactivar_conductor', { conductorId });
      }
    }
  }, [isOnline, conductorId, token, socket, puedeOperar]);

  // ==================================================================
  // 4. TRANSMISIÓN DE TELEMETRÍA (CIMCO-RADAR 2DSPHERE)
  // ==================================================================
  const iniciarTrackingGPS = () => {
    if (!navigator.geolocation) {
      console.error("❌ [GPS-ERROR] Geolocalización no soportada.");
      alert("⚠️ La geolocalización no está soportada en este dispositivo/navegador.");
      return;
    }

    console.log("🛰️ [CIMCO-TELEMETRIA] Encendiendo receptor GPS Parrillero...");
    geoWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!position || !position.coords) return;
        const { latitude, longitude } = position.coords;
        setCoordenadas({ lat: latitude, lng: longitude });

        if (socket && isSocketConnected) {
          socket.emit('actualizar_radar_gps', {
            conductorId,
            lat: latitude,
            lng: longitude
          });
          console.log(`🎯 [RADAR-PARRILLERO] Coordenadas emitidas: [${longitude}, ${latitude}]`);
        }
      },
      (error) => {
        console.error(`❌ [GPS-TRACKING-ERR] Código: ${error?.code} | ${error?.message}`);
        if (error?.code === error?.PERMISSION_DENIED) {
          alert("⚠️ Permiso de GPS denegado. Para recibir servicios, habilite la ubicación en su navegador/dispositivo.");
          setIsOnline(false);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const detenerTrackingGPS = () => {
    if (geoWatchRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
      console.log("🛰️ [CIMCO-TELEMETRIA] Receptor GPS apagado de forma segura.");
    }
  };

  const desconectarEcosistema = () => {
    detenerTrackingGPS();
    if (socket && conductorId) {
      socket.emit('desactivar_conductor', { conductorId });
    }
  };

  // ==================================================================
  // 5. ESCUCHA ATÓMICA DE OFERTAS EN RADAR FIRESTORE
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
      console.error("🚨 [CIMCO-RADAR-ERROR] Fallo en la escucha de viajes Parrillero:", error);
      setCargandoOfertas(false);
    });

    return () => unsubscribe();
  }, [user?.uid, isOnline]);

  // ==================================================================
  // 6. MONITOR DE VIAJE ACTIVO EN HILO DEL CONDUCTOR
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
  // 7. ACCIONES DE GESTIÓN DE DESPACHOS CONTABLES ACID
  // ==================================================================
  const aceptarViaje = async () => {
    if (!solicitudViaje) return;

    if (!puedeOperar) {
      const msg = "⚠️ Saldo insuficiente (< $2.000 COP). Realiza una recarga con el Administrador para operar.";
      setErrorInterno(msg);
      alert(msg);
      setSolicitudViaje(null);
      return;
    }

    const valorServicio = Number(solicitudViaje.tarifa || solicitudViaje.valor || 0);
    const comisionRequerida = valorServicio * 0.10;
    if (saldoEfectivo < comisionRequerida) {
      const msg = "⚠️ Saldo insuficiente para cubrir la comisión (10%) de este servicio.";
      setErrorInterno(msg);
      alert(msg);
      setSolicitudViaje(null);
      return;
    }

    setErrorInterno('');
    setLoading(true);
    try {
      console.log(`⚡ [ACID-DESPACHO] Aceptando servicio parrillero ID: ${solicitudViaje.viajeId}`);
      
      const respuesta = await api.post(`/viajes/aceptar`, {
        viajeId: solicitudViaje.viajeId,
        conductorId
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (respuesta?.data?.success) {
        if (socket && isSocketConnected) {
          socket.emit('aceptar_carrera', { carreraId: solicitudViaje.viajeId, conductorId });
        }
        setServicioActivo(respuesta.data.viaje);
        setSolicitudViaje(null);
      }
    } catch (error) {
      console.error("🚨 [DESPACHO-ERR] Error al reclamar solicitud parrillero:", error?.response?.data?.message || error?.message);
      alert(error?.response?.data?.message || "La solicitud caducó o fue tomada por otra unidad.");
      setSolicitudViaje(null);
    } finally {
      setLoading(false);
    }
  };

  const capturarOferta = async (viajeId) => {
    if (!puedeOperar) {
      const msg = "⚠️ Saldo insuficiente (< $2.000 COP). Realiza una recarga con el Administrador para operar.";
      setErrorInterno(msg);
      alert(msg);
      return;
    }

    const ofertaTarget = ofertasDisponibles.find((item) => item.id === viajeId);
    const valorServicio = Number(ofertaTarget?.valor || ofertaTarget?.tarifa || 0);
    const comisionRequerida = valorServicio * 0.10;

    if (saldoEfectivo < comisionRequerida) {
      const msg = "⚠️ Saldo insuficiente para cubrir la comisión (10%) de este servicio.";
      setErrorInterno(msg);
      alert(msg);
      return;
    }

    setErrorInterno('');
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

        transaction.update(viajeRef, {
          estado: 'ACEPTADO',
          conductorId: user?.uid,
          conductorNombre: nombreConductor,
          fechaAceptado: serverTimestamp()
        });
      });

      if (socket && isSocketConnected) {
        socket.emit('aceptar_carrera', { carreraId: viajeId, conductorId });
      }
    } catch (err) {
      console.error("🚨 [CIMCO-CAPTURE-FAIL] Bloqueo transaccional Parrillero:", err?.message);
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
    setSolicitudViaje(null);
  };

  const handleCerrarSesion = async () => {
    if (window.confirm("¿Desea cerrar sesión y salir de la consola de operaciones Parrillero?")) {
      try {
        desconectarEcosistema();
        await logout();
        window.location.replace('/');
      } catch (error) {
        console.error("🚨 [CIMCO-LOGOUT-FAIL] Error crítico al desconectar nodo:", error);
        localStorage.clear();
        window.location.replace('/');
      }
    }
  };

  const toggleEstadoOperativo = () => {
    if (!isOnline && !puedeOperar) {
      const msg = "⚠️ Saldo insuficiente (< $2.000 COP). Realiza una recarga con el Administrador para operar.";
      setErrorInterno(msg);
      alert(msg);
      return;
    }
    setErrorInterno('');
    setIsOnline(!isOnline);
  };

  return (
    <div className="min-h-screen bg-[#0e0e11] text-zinc-100 font-mono antialiased pb-28 relative selection:bg-cyan-400 selection:text-black">
      
      {/* 🔝 ENCABEZADO DE CONTROL MAESTRO */}
      <header className="sticky top-0 z-50 bg-[#121214]/80 backdrop-blur-md border-b border-white/5 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button 
            onClick={() => setMostrarModalPerfil(true)}
            title="Editar Datos de Perfil / Vehículo"
            className="p-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg font-black text-base flex items-center justify-center select-none shrink-0 hover:bg-cyan-500/30 transition-colors active:scale-95"
          >
            🛵
          </button>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setMostrarModalPerfil(true)}>
            <h1 className="text-xs font-black tracking-widest text-white uppercase truncate flex items-center gap-1.5" title={nombreConductor}>
              {nombreConductor} <span className="text-[9px] text-cyan-400 underline lowercase font-normal">(editar)</span>
            </h1>
            <p className="text-[9px] text-zinc-400 font-bold tracking-widest uppercase flex items-center gap-1 mt-1">
              <Signal size={10} className={isOnline && isSocketConnected ? "text-emerald-400 animate-pulse" : "text-zinc-600"} strokeWidth={3} /> 
              {isOnline && isSocketConnected ? 'CONECTADO A RED PARRILLERO' : 'NODO DESCONECTADO'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={toggleEstadoOperativo}
            disabled={!isOnline && !puedeOperar}
            className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider border transition-all duration-150 active:scale-95 ${
              isOnline 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-black' 
                : 'bg-zinc-800/60 text-zinc-400 border-white/5 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </button>

          <div className="flex items-center gap-2 bg-[#121214]/80 border border-white/5 px-2.5 py-1.5 rounded-lg">
            <Wallet size={13} className="text-cyan-400" strokeWidth={2.5} />
            <span className="text-[10px] font-black text-zinc-200">
              {walletLoading ? '...' : `$${Number(saldoEfectivo).toLocaleString('es-CO')}`}
            </span>
          </div>

          <button 
            onClick={handleCerrarSesion}
            className="p-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 active:scale-95 transition-all flex items-center justify-center shrink-0"
          >
            <LogOut size={13} strokeWidth={3} />
          </button>
        </div>
      </header>

      {/* BANNER DE ALERTA DE SALDO */}
      {(!puedeOperar || errorInterno) && !walletLoading && (
        <div className="m-4 p-3 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg flex items-center gap-2.5 font-black text-[10px] uppercase tracking-wider relative z-10 animate-pulse">
          <AlertCircle size={16} strokeWidth={2.5} className="shrink-0 text-red-400" />
          <span>{errorInterno || "Malla Bloqueada: Saldo inferior a $2.000 COP"}</span>
        </div>
      )}

      {/* 🗺️ CONTENEDOR CENTRAL */}
      <main className="p-4 z-10 relative max-w-md mx-auto space-y-6">
        
        {!isOnline && (
          <div className="text-center p-6 bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-xl my-8">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/5 rounded-lg flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-zinc-500" size={20} strokeWidth={2.5} />
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed uppercase font-bold tracking-wide">
              Establezca el interruptor en <strong className="text-emerald-400 font-black">ONLINE</strong> para acoplar su posición al radar satelital de La Jagua de Ibirico.
            </p>
          </div>
        )}

        {isOnline && (
          <>
            {/* CASO 1: ADJUDICACIÓN DE ORDEN ACTIVA */}
            {servicioActivo ? (
              <div className="bg-[#121214]/80 backdrop-blur-md p-5 border border-white/5 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="text-emerald-400 animate-pulse" size={14} strokeWidth={3} />
                    <span className="text-[9px] font-black tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded uppercase">
                      ESTADO: {servicioActivo.estado}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold bg-zinc-800/60 text-zinc-400 px-2 py-0.5 border border-white/5 rounded">
                    ID: ...{String(servicioActivo?.id || "").slice(-6).toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3 text-xs bg-black/40 p-3 border border-white/5 rounded-lg">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-emerald-400 mt-0.5 shrink-0" strokeWidth={2.5} />
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-black">Punto de Recogida</p>
                      <p className="text-zinc-200 font-bold text-[11px] mt-0.5 leading-tight">{servicioActivo.origenDireccion || "Ubicación Georreferenciada"}</p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-zinc-800 my-2"></div>

                  <div className="flex items-start gap-2.5">
                    <Navigation size={14} className="text-cyan-400 mt-0.5 shrink-0" strokeWidth={2.5} />
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-black">Destino Parrillero</p>
                      <p className="text-zinc-200 font-bold text-[11px] mt-0.5 leading-tight">{servicioActivo.destinoDireccion || "Destino Georreferenciado"}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 mt-2 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-black">
                      <CircleDollarSign size={14} className="text-amber-400" strokeWidth={2.5} />
                      <span>Liquidación:</span>
                    </div>
                    <span className="text-xs font-black text-white bg-zinc-800/80 border border-white/5 px-2.5 py-1 rounded">
                      ${Number(servicioActivo.valor || 0).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  {servicioActivo.estado === 'ACEPTADO' && (
                    <button 
                      onClick={() => transicionarEstadoViaje('EN_SITIO')}
                      className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs font-black uppercase py-3.5 border border-cyan-500/30 rounded-lg tracking-widest active:scale-[0.98] transition-all"
                    >
                      Confirmar: Llegada al Sitio
                    </button>
                  )}
                  {servicioActivo.estado === 'EN_SITIO' && (
                    <button 
                      onClick={() => transicionarEstadoViaje('EN_VIAJE')}
                      className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-black uppercase py-3.5 border border-emerald-500/30 rounded-lg tracking-widest active:scale-[0.98] transition-all"
                    >
                      Iniciar Ruta Transaccional
                    </button>
                  )}
                  {servicioActivo.estado === 'EN_VIAJE' && (
                    <button 
                      onClick={() => transicionarEstadoViaje('FINALIZADO')}
                      className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-black uppercase py-3.5 border border-amber-500/30 rounded-lg tracking-widest active:scale-[0.98] transition-all"
                    >
                      Finalizar y Cobrar Servicio
                    </button>
                  )}

                  {/* ✅ Mostrar solo en entorno de desarrollo */}
                  {import.meta.env.DEV && (
                    <button 
                      onClick={() => {
                        setDatosParaCalificar({ id: servicioActivo?.id || 'SIMULADO', clienteNombre: servicioActivo?.clienteNombre || 'Pasajero CIMCO' });
                        setServicioActivo(null);
                        setMostrarModalCalificacion(true);
                      }}
                      className="w-full bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 text-[9px] uppercase py-1.5 border border-white/5 rounded-lg font-bold tracking-wider mt-2"
                    >
                      [DEV] Simular Cierre Forzado
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* CASO 2: CARD INBOUND SOCKET */}
                {solicitudViaje && (
                  <div className="w-full bg-[#121214]/80 backdrop-blur-md border border-amber-500/40 p-5 rounded-xl space-y-4 mb-6 animate-pulse">
                    <div className="flex justify-between items-start border-b border-white/5 pb-3">
                      <span className="bg-amber-500/20 text-amber-400 text-[9px] font-black px-2 py-1 border border-amber-500/30 rounded uppercase tracking-wider">
                        SOLICITUD PARRILLERO
                      </span>
                      <span className="text-sm font-black text-emerald-400 bg-zinc-800/80 px-2.5 py-0.5 border border-white/5 rounded">
                        ${Number(solicitudViaje?.tarifa || solicitudViaje?.valor || 0).toLocaleString('es-CO')}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-xs text-zinc-300 bg-black/40 p-3 border border-white/5 rounded-lg">
                      <p className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-black shrink-0">📍</span>
                        <span className="leading-tight"><strong className="text-zinc-500 uppercase text-[9px] block">Recogida:</strong> {solicitudViaje?.origenTexto || solicitudViaje?.origenDireccion || "Ubicación Georeferenciada"}</span>
                      </p>
                      <div className="border-t border-dashed border-zinc-800 my-1.5"></div>
                      <p className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-black shrink-0">🏁</span>
                        <span className="leading-tight"><strong className="text-zinc-500 uppercase text-[9px] block">Destino:</strong> {solicitudViaje?.destinoTexto || solicitudViaje?.destinoDireccion || "Por definir"}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={rechazarViaje}
                        disabled={loading}
                        className="bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg font-bold text-xs uppercase tracking-wider border border-white/5 active:scale-95 transition-all disabled:opacity-50"
                      >
                        Ignorar
                      </button>
                      <button
                        onClick={aceptarViaje}
                        disabled={loading || !puedeOperar}
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 py-2 rounded-lg font-black text-xs uppercase tracking-widest border border-amber-500/30 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {loading ? 'ASIGNANDO...' : '¡ACEPTAR!'}
                      </button>
                    </div>
                  </div>
                )}

                {/* CASO 3: RADAR GENERAL FIRESTORE */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-cyan-400" strokeWidth={2.5} />
                      <h2 className="text-[10px] uppercase font-black tracking-widest text-zinc-400">
                        Malla Radar ({ofertasDisponibles.length})
                      </h2>
                    </div>
                    <span className="text-[9px] text-zinc-400 bg-[#121214]/80 px-2 py-1 border border-white/5 rounded-lg flex items-center gap-1.5 font-bold">
                      <MapPin size={11} className="text-red-400" strokeWidth={3} />
                      GPS: {coordenadas?.lng?.toFixed(4)}, {coordenadas?.lat?.toFixed(4)}
                    </span>
                  </div>

                  {cargandoOfertas ? (
                    <div className="text-center py-12 text-zinc-500 font-bold text-xs uppercase tracking-wider bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-xl flex items-center justify-center gap-3">
                      <Loader size={14} className="animate-spin text-cyan-400" /> Sincronizando malla...
                    </div>
                  ) : ofertasDisponibles.length === 0 ? (
                    <div className="bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-xl p-8 text-center text-zinc-500 text-xs uppercase tracking-widest font-black">
                      Escuchando solicitudes en La Jagua de Ibirico...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ofertasDisponibles.map((oferta) => {
                        const valorServicio = Number(oferta?.valor || oferta?.tarifa || 0);
                        const comisionRequerida = valorServicio * 0.10;
                        const bloqueadoPorComision = saldoEfectivo < comisionRequerida;

                        return (
                          <div 
                            key={oferta.id} 
                            className="bg-[#121214]/80 backdrop-blur-md p-4 border border-white/5 rounded-xl flex flex-col gap-3 hover:border-white/10 transition-all duration-150"
                          >
                            <div className="text-xs space-y-2">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 border border-cyan-500/20 rounded">
                                  {oferta.categoria || 'PARRILLERO'}
                                </span>
                                <span className="font-black text-emerald-400 text-sm">${valorServicio.toLocaleString('es-CO')}</span>
                              </div>
                              <div className="space-y-1 bg-black/30 p-2 border border-white/5 rounded-lg">
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
                                disabled={!puedeOperar || bloqueadoPorComision}
                                className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:bg-zinc-800/40 disabled:border-white/5 disabled:text-zinc-600 font-black text-[10px] py-2.5 px-4 rounded-lg uppercase tracking-wider border border-cyan-500/30 active:scale-95 transition-all"
                              >
                                {!puedeOperar 
                                  ? 'SALDO BLOQUEADO (< $2.000)' 
                                  : bloqueadoPorComision 
                                    ? 'SALDO INSUFICIENTE PARA COMISIÓN (10%)' 
                                    : 'CAPTURAR OFERTA'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* 🛠️ MODAL GLASSMORPHISM DE AJUSTE DE DATOS PERSONALES / VEHÍCULO */}
      {mostrarModalPerfil && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121214]/90 border border-white/10 rounded-2xl p-5 space-y-4 font-mono animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest">
                <UserSquare2 size={16} className="text-cyan-400" />
                <span>Perfil Operador</span>
              </div>
              <button 
                onClick={() => setMostrarModalPerfil(false)}
                className="text-[10px] font-black bg-zinc-800/60 border border-white/5 text-zinc-400 px-2 py-0.5 rounded uppercase hover:bg-zinc-800 active:scale-95 transition-all"
              >
                Cerrar [X]
              </button>
            </div>

            <form onSubmit={handleGuardarPerfil} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={datosPerfil.nombre}
                  onChange={(e) => setDatosPerfil({...datosPerfil, nombre: e.target.value})}
                  className="w-full bg-black/40 text-zinc-100 border border-white/5 p-2 font-bold focus:outline-none focus:border-cyan-500/50 rounded-lg placeholder-zinc-700 uppercase"
                  placeholder="Ej: JUAN PÉREZ"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Celular / Contacto</label>
                <input 
                  type="tel" 
                  required
                  value={datosPerfil.telefonoMovil}
                  onChange={(e) => setDatosPerfil({...datosPerfil, telefonoMovil: e.target.value})}
                  className="w-full bg-black/40 text-zinc-100 border border-white/5 p-2 font-bold focus:outline-none focus:border-cyan-500/50 rounded-lg placeholder-zinc-700"
                  placeholder="Ej: 3001234567"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">URL Foto de Perfil</label>
                <input 
                  type="url" 
                  value={datosPerfil.foto_perfil}
                  onChange={(e) => setDatosPerfil({...datosPerfil, foto_perfil: e.target.value})}
                  className="w-full bg-black/40 text-zinc-100 border border-white/5 p-2 font-bold focus:outline-none focus:border-cyan-500/50 rounded-lg placeholder-zinc-700"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Placa Vehículo</label>
                  <input 
                    type="text" 
                    required
                    value={datosPerfil.placa}
                    onChange={(e) => setDatosPerfil({...datosPerfil, placa: e.target.value})}
                    className="w-full bg-black/40 text-zinc-100 border border-white/5 p-2 font-bold focus:outline-none focus:border-cyan-500/50 rounded-lg placeholder-zinc-700 uppercase"
                    placeholder="Ej: XYZ123"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Cilindraje / Modelo</label>
                  <input 
                    type="text" 
                    required
                    value={datosPerfil.motoModelo}
                    onChange={(e) => setDatosPerfil({...datosPerfil, motoModelo: e.target.value})}
                    className="w-full bg-black/40 text-zinc-100 border border-white/5 p-2 font-bold focus:outline-none focus:border-cyan-500/50 rounded-lg placeholder-zinc-700"
                    placeholder="Ej: Pulsar NS 200"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={guardandoPerfil}
                  className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-black uppercase py-3 border border-cyan-500/30 rounded-lg tracking-widest active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {guardandoPerfil ? 'GUARDANDO NODO...' : 'ACTUALIZAR DATOS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🧭 BARRA DE NAVEGACIÓN INFERIOR */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#121214]/80 backdrop-blur-md border-t border-white/5 p-3 flex justify-around items-center z-50">
        <button className="text-cyan-400 flex flex-col items-center gap-0.5 transition-transform active:scale-95">
          <Navigation size={18} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-wider">Radar</span>
        </button>
        <button 
          onClick={() => setMostrarModalPerfil(true)} 
          className="text-zinc-400 hover:text-cyan-400 flex flex-col items-center gap-0.5 transition-transform active:scale-95"
        >
          <UserSquare2 size={18} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-wider">Perfil</span>
        </button>
        <button 
          onClick={() => window.location.href = '/wallet'} 
          className="text-zinc-400 hover:text-cyan-400 flex flex-col items-center gap-0.5 transition-transform active:scale-95 cursor-pointer"
        >
          <CircleDollarSign size={18} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-wider">Billetera</span>
        </button>
      </footer>

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