// Versión Arquitectura: V12.25 - Sincronización estricta con esquema estandarizado de perfil (telefonoMovil, nombre, foto_perfil) y directrices CIMCO-UI V9.3
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, collection, query, where, updateDoc, serverTimestamp, runTransaction, orderBy, getDocs } from 'firebase/firestore';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useSocket } from '@/hooks/useSocket';
import api from '@/config/api'; 
import authService from '@/services/authService';
import ModalCalificacion from '@/components/ModalCalificacion';
import {
  MapPin, Navigation, Wallet, Clock, TrendingUp, AlertCircle, 
  CircleDollarSign, Signal, LogOut, Package, Truck, Loader, UserSquare2
} from 'lucide-react';

export default function HomeMotocarga() {
  // 🛡️ ESTADOS DEL OPERADOR Y LOGÍSTICA DEL SISTEMA
  const { user, logout } = useAuth(); 
  const { walletData, loading: walletLoading } = useWallet();
  const { socket, isConnected } = useSocket();

  const nombreInicialFallback = user?.email ? user.email.split('@')[0].toUpperCase() : "CIMCO CARGA";
  const [nombreConductor, setNombreConductor] = useState(nombreInicialFallback); 

  // 📝 ESTADOS COMPLEMENTARIOS DE VEHÍCULO / PERFIL
  const [datosPerfil, setDatosPerfil] = useState({
    nombre: '',
    telefono: '',
    placa: '',
    motoModelo: '',
    foto_perfil: ''
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

  // 📜 HISTORIAL DE VIAJES
  const [historial, setHistorial] = useState([]);

  const geoWatchRef = useRef(null);

  const conductorId = user?.uid || user?.id || localStorage.getItem('conductorId'); 
  const token = localStorage.getItem('token') || user?.token;
  const saldoVivo = walletData?.saldo || walletData?.balance || 0;

  // 🛡️ GUARDA DE SEGURIDAD PARA OPERADOR DESCONECTADO SIN IDENTIFICADOR
  useEffect(() => {
    if (!conductorId) {
      setIsOnline(false);
    }
  }, [conductorId]);

  // ==================================================================
  // PATRÓN HÍBRIDO: HISTORIAL CON FALLBACK FIRESTORE
  // ==================================================================
  const fetchHistorial = useCallback(async () => {
    const idOperador = user?.uid || user?.id || user?._id;

    if (!idOperador) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1. Intento principal a la API REST de MongoDB
    try {
      const res = await api.get(`/viajes/historial?conductorId=${idOperador}`);
      if (res.data?.success && Array.isArray(res.data?.viajes)) {
        setHistorial(res.data.viajes);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("⚠️ Fallo en API REST, ejecutando respaldo Firestore:", err);
    }

    // 2. Fallback secundario a Firestore NoSQL con ordenamiento local para evitar errores de índice
    try {
      const q = query(
        collection(db, FIRESTORE_PATHS?.rides || FIRESTORE_PATHS?.viajes || 'viajes'),
        where('conductorId', '==', idOperador),
        where('estado', '==', 'COMPLETADO')
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Ordenamiento en memoria del cliente
      docs.sort((a, b) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0));
      setHistorial(docs);
    } catch (noSqlErr) {
      console.error("❌ Fallo en fallback NoSQL:", noSqlErr);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
        const nombreCompleto = data?.nombre || data?.displayName || data?.nombreCompleto;
        if (nombreCompleto) {
          setNombreConductor(nombreCompleto.toUpperCase());
        }

        // Sincronizar datos locales para el formulario de edición
        setDatosPerfil({
          nombre: nombreCompleto || '',
          telefono: data?.telefonoMovil || data?.telefono || '',
          placa: data?.placa || data?.vehiculo?.placa || '',
          motoModelo: data?.motoModelo || data?.vehiculo?.modelo || '',
          foto_perfil: data?.foto_perfil || data?.photoURL || ''
        });
      }
    }, (error) => {
      console.error("🚨 [CIMCO-CARGA-IDENTITY-ERROR] Fallo en lectura de perfil:", error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // ==================================================================
  // 2. ACTUALIZACIÓN MUTABLE DE DATOS VIA SERVICIO CENTRALIZADO
  // ==================================================================
  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setGuardandoPerfil(true);
    
    try {
      await authService.updateProfile({
        nombre: datosPerfil.nombre,
        telefonoMovil: datosPerfil.telefono,
        foto_perfil: datosPerfil.foto_perfil || '',
        placa: datosPerfil.placa.toUpperCase(),
        motoModelo: datosPerfil.motoModelo
      });

      const pathConductores = FIRESTORE_PATHS?.conductores || 'conductores';
      const conductorRef = doc(db, pathConductores, user.uid);
      
      await updateDoc(conductorRef, {
        nombre: datosPerfil.nombre,
        nombreCompleto: datosPerfil.nombre,
        telefono: datosPerfil.telefono,
        telefonoMovil: datosPerfil.telefono,
        foto_perfil: datosPerfil.foto_perfil || '',
        placa: datosPerfil.placa.toUpperCase(),
        motoModelo: datosPerfil.motoModelo,
        fechaActualizacion: serverTimestamp()
      });
      
      setMostrarModalPerfil(false);
      alert("✅ PERFIL Y VEHÍCULO DE CARGA ACTUALIZADOS EN RED");
    } catch (error) {
      console.error("🚨 [CIMCO-CARGA-PROFILE-UPDATE-ERR] No se pudieron salvar los datos:", error);
      alert(error?.response?.data?.message || "Error al actualizar los datos en el servidor de carga.");
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // ==================================================================
  // 3. GOBERNANZA DEL CANAL WEBSOCKET Y TELEMETRÍA (MOTOCARGA)
  // ==================================================================
  const iniciarTrackingGPS = useCallback(() => {
    if (!navigator.geolocation) {
      console.error("❌ [GPS-ERROR] Geolocalización no admitida en este dispositivo.");
      return;
    }

    console.log("🛰️ [CIMCO-CARGA-TELEMETRIA] Sincronizando satélites GPS...");
    geoWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!position || !position.coords) return;
        const { latitude, longitude } = position.coords;
        setCoordenadas({ lat: latitude, lng: longitude });

        if (socket && (socket.connected || isConnected)) {
          socket.emit('actualizar_radar_gps', {
            conductorId,
            lat: latitude,
            lng: longitude
          });
          console.log(`🎯 [RADAR-BURST-CARGA] Ubicación enviada: [${longitude}, ${latitude}]`);
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
  }, [socket, isConnected, conductorId]);

  const desconectarEcosistema = useCallback(() => {
    if (geoWatchRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
      console.log("🛰️ [CIMCO-TELEMETRIA] Receptor GPS de carga apagado.");
    }
    if (socket) {
      socket.emit('desactivar_conductor', { conductorId });
      console.log("📡 [CIMCO-SOCKET] Conductor desactivado en la red centralizada.");
    }
  }, [socket, conductorId]);

  useEffect(() => {
    if (isOnline) {
      if (!conductorId) {
        setIsOnline(false);
        return;
      }

      if (Number(saldoVivo) < 2000) {
        alert("⚠️ FONDO INSUFICIENTE: Su cuenta TAXIA CIMCO requiere un saldo mínimo de $2.000 COP para activarse en la red de carga.");
        setIsOnline(false);
        return;
      }

      if (socket) {
        console.log(`📡 [CIMCO-CARGA-SOCKET] Sincronizando con socket centralizado...`);
        
        socket.emit('registrar_conductor', { 
          conductorId, 
          tipoServicio: 'motocarga',
          email: user?.email || localStorage.getItem('conductorEmail') || ''
        });

        const handleNuevaSolicitud = (data) => {
          console.log("🔥 [CIMCO-RADAR-CARGA] Flete detectado en el perímetro de asignación!", data);
          if (!servicioActivo && !solicitudViaje) {
            setSolicitudViaje(data);
          }
        };

        socket.on('nueva_solicitud_viaje', handleNuevaSolicitud);
        iniciarTrackingGPS();

        return () => {
          socket.off('nueva_solicitud_viaje', handleNuevaSolicitud);
          desconectarEcosistema();
        };
      }
    } else {
      desconectarEcosistema();
    }
  }, [isOnline, conductorId, socket, iniciarTrackingGPS, desconectarEcosistema, user?.email, saldoVivo, servicioActivo, solicitudViaje]);

  // ==================================================================
  // 5. ESCUCHA ATÓMICA DE FLETES EN RADAR FIRESTORE
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
      where('tipoServicio', '==', 'motocarga'),
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
      console.error("🚨 [CIMCO-RADAR-ERROR] Error en el feed de fletes:", error);
      setCargandoOfertas(false);
    });

    return () => unsubscribe();
  }, [user?.uid, isOnline]);

  // ==================================================================
  // 6. MONITOR DE FLETE ACTIVO ASIGNADO A ESTA UNIDAD
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
            clienteNombre: servicioActivo.clienteNombre || 'Cliente Flete'
          });
          setMostrarModalCalificacion(true);
        }
        setServicioActivo(null);
      }
    });

    return () => unsubscribe();
  }, [user?.uid, servicioActivo]);

  // ==================================================================
  // 7. ACCIONES DE GESTIÓN LOGÍSTICA CON DEPURACIÓN CONTABLE
  // ==================================================================
  const aceptarViaje = async () => {
    if (!solicitudViaje) return;
    if (Number(saldoVivo) < 2000) {
      alert("⚠️ FONDO INSUFICIENTE: Saldo mínimo de $2.000 COP requerido para procesar despachos.");
      setSolicitudViaje(null);
      return;
    }
    setLoading(true);
    try {
      console.log(`⚡ [ACID-DESPACHO-CARGA] Reclamando Flete ID: ${solicitudViaje.viajeId}`);
      
      const respuesta = await api.post(`/viajes/aceptar`, {
        viajeId: solicitudViaje.viajeId,
        conductorId
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (respuesta?.data?.success) {
        setServicioActivo(respuesta.data.viaje);
        setSolicitudViaje(null);
        console.log("✅ [ACID-DESPACHO] Flete adjudicado de forma segura.");
      }
    } catch (error) {
      console.error("🚨 [DESPACHO-ERR] No se pudo capturar el flete perimetral:", error?.response?.data?.message || error?.message);
      alert(error?.response?.data?.message || "La orden de carga expiró o fue tomada por otra unidad.");
      setSolicitudViaje(null);
    } finally {
      setLoading(false);
    }
  };

  const capturarOferta = async (viajeId) => {
    if (Number(saldoVivo) < 2000) {
      alert("⚠️ FONDO INSUFICIENTE: Saldo mínimo de $2.000 COP requerido para capturar fletes.");
      return;
    }

    try {
      const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';
      const viajeRef = doc(db, pathViajes, viajeId);
      await runTransaction(db, async (transaction) => {
        const viajeSnap = await transaction.get(viajeRef);
        if (!viajeSnap.exists()) throw new Error("El flete ya no figura en la central de distribución.");

        const datosViaje = viajeSnap.data();
        if (datosViaje?.estado !== 'SOLICITADO') {
          throw new Error("Este flete ya fue capturado por otra unidad de transporte.");
        }

        transaction.update(viajeRef, {
          estado: 'ACEPTADO',
          conductorId: user?.uid,
          conductorNombre: nombreConductor,
          fechaAceptado: serverTimestamp()
        });
      });
    } catch (err) {
      console.error("🚨 [CIMCO-TRANSACTION-FAIL] Bloqueo transaccional:", err?.message);
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
      console.error("🚨 [CIMCO-MUTATION-FAIL] Error al transicionar estado de carga:", err);
    }
  };

  const handleCerrarSesion = async () => {
    if (window.confirm("¿Desea cerrar sesión y apagar el radar de carga?")) {
      try {
        desconectarEcosistema();
        await logout();
        window.location.replace('/');
      } catch (error) {
        console.error("🚨 [CIMCO-LOGOUT-FAIL] Error al apagar nodo de autenticación:", error);
        localStorage.clear();
        window.location.replace('/');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#121214]/80 backdrop-blur-md text-zinc-100 font-mono antialiased pb-28 relative selection:bg-amber-400 selection:text-black">
      
      {/* 🔝 ENCABEZADO DE CONTROL MAESTRO */}
      <header className="sticky top-0 z-50 bg-[#121214]/90 backdrop-blur-lg border-b border-white/5 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* BOTÓN OPERATIVO PARA ABRIR MODAL DESDE EL ICONO */}
          <button 
            onClick={() => setMostrarModalPerfil(true)}
            title="Editar Perfil y Vehículo"
            className="p-2 bg-amber-400/90 text-black border border-white/10 font-black text-base flex items-center justify-center rounded-lg hover:bg-amber-400 transition-colors shrink-0"
          >
            🚚
          </button>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setMostrarModalPerfil(true)}>
            <h1 className="text-xs font-black tracking-widest text-white uppercase truncate flex items-center gap-1.5" title={nombreConductor}>
              {nombreConductor} <span className="text-[9px] text-amber-400 underline lowercase font-normal">(editar)</span>
            </h1>
            <p className="text-[9px] text-zinc-400 font-bold tracking-widest uppercase flex items-center gap-1 mt-1">
              <Signal size={10} className={isOnline && isConnected ? "text-amber-400 animate-pulse" : "text-zinc-600"} strokeWidth={3} /> 
              {isOnline && isConnected ? 'MALLA CARGA ACTIVA' : 'NODO DESCONECTADO'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider border border-white/5 transition-all duration-150 ${
              isOnline ? 'bg-amber-400/90 text-black font-black' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50'
            }`}
          >
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </button>

          <div className="flex items-center gap-2 bg-black/50 border border-white/5 px-2.5 py-1.5 rounded-lg">
            <Wallet size={13} className="text-amber-400" strokeWidth={2.5} />
            <span className="text-[10px] font-black text-zinc-200">
              {walletLoading ? '...' : `$${Number(saldoVivo).toLocaleString('es-CO')}`}
            </span>
          </div>

          <button 
            onClick={handleCerrarSesion}
            className="p-2 bg-red-500/80 text-white border border-white/5 rounded-lg hover:bg-red-600 transition-all flex items-center justify-center shrink-0"
          >
            <LogOut size={13} strokeWidth={3} />
          </button>
        </div>
      </header>

      {/* BLOQUEO POR SALDO INSOLVENTE */}
      {Number(saldoVivo) < 2000 && !walletLoading && (
        <div className="m-4 p-3 bg-red-500/20 backdrop-blur-md text-red-200 border border-red-500/30 rounded-lg flex items-center gap-2.5 font-black text-[10px] uppercase tracking-wider relative z-10 animate-pulse">
          <AlertCircle size={16} strokeWidth={2.5} className="shrink-0" />
          <span>Radar Inactivo: Recargar saldo para fletes ($2.000 COP mín)</span>
        </div>
      )}

      {/* 🗺️ CONTENEDOR CENTRAL LOGÍSTICO */}
      <main className="p-4 z-10 relative max-w-md mx-auto space-y-6">
        
        {!isOnline && (
          <div className="text-center p-6 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-xl my-8">
            <div className="w-12 h-12 bg-black/50 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="text-zinc-500" size={20} strokeWidth={2.5} />
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed uppercase font-bold tracking-wide">
              Establezca su estado en <strong className="text-amber-400 font-black">ONLINE</strong> para activar el posicionamiento radial de fletes y distribución de mercancía en La Jagua.
            </p>
          </div>
        )}

        {isOnline && (
          <>
            {/* CASO 1: ORDEN DE CARGA EN PROCESO (FIRESTORE) */}
            {servicioActivo ? (
              <div className="bg-zinc-900/60 backdrop-blur-lg p-5 border border-white/5 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Truck className="text-amber-400 animate-pulse" size={14} strokeWidth={3} />
                    <span className="text-[9px] font-black tracking-widest bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded px-2 py-0.5 uppercase">
                      FLETE: {servicioActivo.estado}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold bg-black/50 text-zinc-400 px-2 py-0.5 border border-white/5 rounded">
                    ID: ...{String(servicioActivo?.id || "").slice(-6).toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3 text-xs bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-emerald-400 mt-0.5 shrink-0" strokeWidth={2.5} />
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-black">Punto de Carga / Origen</p>
                      <p className="text-zinc-200 font-bold text-[11px] mt-0.5 leading-tight">{servicioActivo.origenDireccion || "Dirección de Origen"}</p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-white/10 my-2"></div>

                  <div className="flex items-start gap-2.5">
                    <Navigation size={14} className="text-cyan-400 mt-0.5 shrink-0" strokeWidth={2.5} />
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-black">Punto de Descarga / Destino</p>
                      <p className="text-zinc-200 font-bold text-[11px] mt-0.5 leading-tight">{servicioActivo.destinoDireccion || "Dirección de Destino"}</p>
                    </div>
                  </div>

                  {servicioActivo.detallesCarga && (
                    <div className="bg-black/40 p-2.5 border border-white/5 rounded-lg text-[10px] text-zinc-300 font-bold uppercase tracking-wide">
                      <span className="text-amber-400 font-black">📦 Manifiesto:</span> {servicioActivo.detallesCarga}
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-3 mt-2 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-black">
                      <CircleDollarSign size={14} className="text-amber-500" strokeWidth={2.5} />
                      <span>Valor Liquidado:</span>
                    </div>
                    <span className="text-xs font-black text-white bg-black/50 border border-white/10 rounded-md px-2.5 py-1">
                      ${Number(servicioActivo.valor || 0).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  {servicioActivo.estado === 'ACEPTADO' && (
                    <button 
                      onClick={() => transicionarEstadoViaje('EN_SITIO')}
                      className="w-full bg-amber-400/90 hover:bg-amber-400 text-black text-xs font-black uppercase py-3.5 border border-white/10 rounded-lg tracking-widest transition-all shadow-lg shadow-amber-400/20"
                    >
                      Confirmar: Llegada a Punto de Carga
                    </button>
                  )}
                  {servicioActivo.estado === 'EN_SITIO' && (
                    <button 
                      onClick={() => transicionarEstadoViaje('EN_VIAJE')}
                      className="w-full bg-orange-400/90 text-black text-xs font-black uppercase py-3.5 border border-white/10 rounded-lg tracking-widest transition-all shadow-lg shadow-orange-400/20"
                    >
                      Iniciar Ruta de Reparto
                    </button>
                  )}
                  {servicioActivo.estado === 'EN_VIAJE' && (
                    <button 
                      onClick={() => transicionarEstadoViaje('FINALIZADO')}
                      className="w-full bg-emerald-400/90 text-black text-xs font-black uppercase py-3.5 border border-white/10 rounded-lg tracking-widest transition-all shadow-lg shadow-emerald-400/20"
                    >
                      Finalizar Entrega y Cobrar
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* CASO 2: CARD FLOTANTE DE ENTRADA WEBSOCKET EN VIVO */}
                {solicitudViaje && (
                  <div className="w-full bg-zinc-900/80 backdrop-blur-xl border border-amber-400/50 p-5 rounded-xl shadow-2xl shadow-amber-500/10 space-y-4 mb-6 animate-pulse">
                    <div className="flex justify-between items-start border-b border-white/10 pb-3">
                      <span className="bg-amber-400/20 text-amber-400 text-[9px] font-black px-2 py-1 border border-amber-400/30 rounded uppercase tracking-wider">
                        📦 SOLICITUD DE FLETE REAL-TIME
                      </span>
                      <span className="text-sm font-black text-amber-400 bg-black/50 rounded-lg px-2.5 py-0.5 border border-white/5">
                        ${Number(solicitudViaje?.tarifa || solicitudViaje?.valor || 0).toLocaleString('es-CO')}
                      </span>
                    </div>
                    
                    <div className="space-y-2.5 text-xs text-zinc-300 bg-black/40 p-3 rounded-lg border border-white/5">
                      <p className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-black shrink-0">📍</span>
                        <span className="leading-tight"><strong className="text-zinc-500 uppercase text-[9px] block">Origen:</strong> {solicitudViaje?.origenTexto || solicitudViaje?.origenDireccion || "Punto de Carga"}</span>
                      </p>
                      <div className="border-t border-dashed border-white/10 my-1.5"></div>
                      <p className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-black shrink-0">🏁</span>
                        <span className="leading-tight"><strong className="text-zinc-500 uppercase text-[9px] block">Destino:</strong> {solicitudViaje?.destinoTexto || solicitudViaje?.destinoDireccion || "Destino de Despacho"}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={() => setSolicitudViaje(null)}
                        disabled={loading}
                        className="bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 py-2 rounded-lg font-bold text-xs uppercase tracking-wider border border-white/5 transition-all disabled:opacity-50"
                      >
                        Ignorar
                      </button>
                      <button
                        onClick={aceptarViaje}
                        disabled={loading}
                        className="bg-amber-400/90 hover:bg-amber-400 text-black py-2 rounded-lg font-black text-xs uppercase tracking-widest border border-white/10 transition-all disabled:opacity-50 shadow-lg shadow-amber-400/20"
                      >
                        {loading ? 'ASIGNANDO...' : 'TOMAR FLETE'}
                      </button>
                    </div>
                  </div>
                )}

                {/* CASO 3: HISTORIAL EN RADAR FIRESTORE DE OFERTAS DISPONIBLES */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-amber-500 animate-pulse" strokeWidth={2.5} />
                      <h2 className="text-[10px] uppercase font-black tracking-widest text-zinc-400">
                        Fletes Libres en Radar ({ofertasDisponibles.length})
                      </h2>
                    </div>
                    <span className="text-[9px] text-zinc-400 bg-zinc-900/50 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5 font-bold">
                      <MapPin size={11} className="text-amber-400" strokeWidth={3} />
                      GPS: [{coordenadas?.lng?.toFixed(4)}, {coordenadas?.lat?.toFixed(4)}]
                    </span>
                  </div>

                  {cargandoOfertas ? (
                    <div className="text-center py-12 text-zinc-500 font-bold text-xs uppercase tracking-wider bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-xl flex items-center justify-center gap-3">
                      <Loader size={14} className="animate-spin text-amber-400" /> Sincronizando malla de fletes...
                    </div>
                  ) : ofertasDisponibles.length === 0 ? (
                    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-xl p-8 text-center text-zinc-500 text-xs uppercase tracking-widest font-black">
                      Sin solicitudes de carga pendientes en la zona.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ofertasDisponibles.map((oferta) => (
                        <div 
                          key={oferta.id} 
                          className="bg-zinc-900/60 backdrop-blur-lg p-4 border border-white/5 rounded-xl flex flex-col gap-3 hover:bg-zinc-800/60 transition-all duration-150"
                        >
                          <div className="text-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded border border-white/5">
                                MOTOCARGA
                              </span>
                              <span className="font-black text-white text-sm">${Number(oferta.valor || 0).toLocaleString('es-CO')}</span>
                            </div>
                            <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
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
                              className="w-full bg-amber-400/90 text-black disabled:bg-zinc-800/50 disabled:border-white/5 disabled:text-zinc-600 font-black text-[10px] py-2.5 px-4 rounded-lg uppercase tracking-wider border border-white/10 transition-all"
                            >
                              {Number(saldoVivo) < 2000 ? 'SALDO BLOQUEADO' : 'CAPTURAR FLETE'}
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

      {/* 🛠️ MODAL GLASSMORPHISM DE AJUSTE DE DATOS PERSONALES / VEHÍCULO */}
      {mostrarModalPerfil && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest">
                <UserSquare2 size={16} className="text-amber-400" />
                <span>Perfil Operador</span>
              </div>
              <button 
                onClick={() => setMostrarModalPerfil(false)}
                className="text-[10px] font-black bg-zinc-800/50 border border-white/5 text-zinc-400 px-2 py-0.5 rounded uppercase hover:bg-zinc-700/50"
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
                  className="w-full bg-black/50 text-zinc-100 border border-white/10 p-2 rounded-lg font-bold focus:outline-none focus:border-amber-400/50 placeholder-zinc-700 uppercase transition-colors"
                  placeholder="Ej: MARCOS DIAZ"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Celular / Contacto (telefonoMovil)</label>
                <input 
                  type="tel" 
                  required
                  value={datosPerfil.telefono}
                  onChange={(e) => setDatosPerfil({...datosPerfil, telefono: e.target.value})}
                  className="w-full bg-black/50 text-zinc-100 border border-white/10 p-2 rounded-lg font-bold focus:outline-none focus:border-amber-400/50 placeholder-zinc-700 transition-colors"
                  placeholder="Ej: 3157654321"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">URL Foto Perfil (foto_perfil)</label>
                <input 
                  type="url" 
                  value={datosPerfil.foto_perfil}
                  onChange={(e) => setDatosPerfil({...datosPerfil, foto_perfil: e.target.value})}
                  className="w-full bg-black/50 text-zinc-100 border border-white/10 p-2 rounded-lg font-bold focus:outline-none focus:border-amber-400/50 placeholder-zinc-700 transition-colors"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Placa Motocarga</label>
                  <input 
                    type="text" 
                    required
                    value={datosPerfil.placa}
                    onChange={(e) => setDatosPerfil({...datosPerfil, placa: e.target.value})}
                    className="w-full bg-black/50 text-zinc-100 border border-white/10 p-2 rounded-lg font-bold focus:outline-none focus:border-amber-400/50 placeholder-zinc-700 uppercase transition-colors"
                    placeholder="Ej: ABC45F"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Cilindraje / Modelo</label>
                  <input 
                    type="text" 
                    required
                    value={datosPerfil.motoModelo}
                    onChange={(e) => setDatosPerfil({...datosPerfil, motoModelo: e.target.value})}
                    className="w-full bg-black/50 text-zinc-100 border border-white/10 p-2 rounded-lg font-bold focus:outline-none focus:border-amber-400/50 placeholder-zinc-700 transition-colors"
                    placeholder="Ej: Torito RE 205"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={guardandoPerfil}
                  className="w-full bg-amber-400/90 hover:bg-amber-400 text-black font-black uppercase py-3 border border-white/10 rounded-lg tracking-widest shadow-lg shadow-amber-400/20 transition-all disabled:opacity-50"
                >
                  {guardandoPerfil ? 'GUARDANDO CAMBIOS...' : 'ACTUALIZAR DATOS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🧭 BARRA DE NAVEGACIÓN INFERIOR */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#121214]/90 backdrop-blur-lg border-t border-white/5 p-3 flex justify-around items-center z-50">
        <button className="text-amber-400 flex flex-col items-center gap-0.5 transition-transform active:scale-95">
          <Truck size={18} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-wider">Radar Fletes</span>
        </button>
        {/* ENLACE DE ACCESO AL MODAL DE PERFIL */}
        <button 
          onClick={() => setMostrarModalPerfil(true)}
          className="text-zinc-400 hover:text-amber-400 flex flex-col items-center gap-0.5 transition-transform active:scale-95"
        >
          <UserSquare2 size={18} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-wider">Perfil</span>
        </button>
        <button 
          onClick={() => window.location.href = '/wallet'} 
          className="text-zinc-400 hover:text-amber-400 flex flex-col items-center gap-0.5 transition-transform active:scale-95 cursor-pointer"
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
          viajeId={datosParaCalificar?.id}
          usuarioRol="conductor"
          nombreContraparte={datosParaCalificar?.clienteNombre}
        />
      )}
    </div>
  );
}