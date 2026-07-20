// Versión Arquitectura: V12.18 - Sincronización Unificada de Radar GPS e Integración de Mutación de Perfil/Vehículo
// Refactorización Estética: Cyber-Neo-Brutalismo Industrial Puro (Bordes Macizos, Hard Shadows y Cero Curvas)
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { doc, onSnapshot, collection, query, where, updateDoc, serverTimestamp, runTransaction, orderBy } from 'firebase/firestore';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import api from '@/config/api'; 
import ModalCalificacion from '@/components/ModalCalificacion';
import {
  MapPin, Navigation, Wallet, Clock, TrendingUp, AlertCircle, 
  CircleDollarSign, Signal, LogOut, Package, Truck, Loader, UserSquare2
} from 'lucide-react';

const BACKEND_URL = "https://globosely-appreciative-zander.ngrok-free.dev";

export default function HomeMotocarga() {
  // 🛡️ ESTADOS DEL OPERADOR Y LOGÍSTICA DEL SISTEMA
  const { user, logout } = useAuth(); 
  const { walletData, loading: walletLoading } = useWallet();

  const nombreInicialFallback = user?.email ? user.email.split('@')[0].toUpperCase() : "CIMCO CARGA";
  const [nombreConductor, setNombreConductor] = useState(nombreInicialFallback); 

  // 📝 ESTADOS COMPLEMENTARIOS DE VEHÍCULO / PERFIL
  const [datosPerfil, setDatosPerfil] = useState({
    nombre: '',
    telefono: '',
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

  const socketRef = useRef(null);
  const geoWatchRef = useRef(null);

  const conductorId = user?.uid || user?.id || localStorage.getItem('conductorId') || "MOCK_CARGA_JAGUA_01"; 
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
        const nombreCompleto = data?.nombre || data?.displayName || data?.nombreCompleto;
        if (nombreCompleto) {
          setNombreConductor(nombreCompleto.toUpperCase());
        }

        // Sincronizar datos locales para el formulario de edición
        setDatosPerfil({
          nombre: nombreCompleto || '',
          telefono: data?.telefono || '',
          placa: data?.placa || data?.vehiculo?.placa || '',
          motoModelo: data?.motoModelo || data?.vehiculo?.modelo || ''
        });
      }
    }, (error) => {
      console.error("🚨 [CIMCO-CARGA-IDENTITY-ERROR] Fallo en lectura de perfil:", error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // ==================================================================
  // 2. ACTUALIZACIÓN MUTABLE DE DATOS (FIRESTORE)
  // ==================================================================
  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setGuardandoPerfil(true);
    
    try {
      const pathConductores = FIRESTORE_PATHS?.conductores || 'conductores';
      const conductorRef = doc(db, pathConductores, user.uid);
      
      await updateDoc(conductorRef, {
        nombre: datosPerfil.nombre,
        nombreCompleto: datosPerfil.nombre,
        telefono: datosPerfil.telefono,
        placa: datosPerfil.placa.toUpperCase(),
        motoModelo: datosPerfil.motoModelo,
        fechaActualizacion: serverTimestamp()
      });
      
      setMostrarModalPerfil(false);
      alert("✅ PERFIL Y VEHÍCULO DE CARGA ACTUALIZADOS EN RED");
    } catch (error) {
      console.error("🚨 [CIMCO-CARGA-PROFILE-UPDATE-ERR] No se pudieron salvar los datos:", error);
      alert("Error al actualizar los datos en el servidor de carga.");
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // ==================================================================
  // 3. GOBERNANZA DEL CANAL WEBSOCKET Y TELEMETRÍA (MOTOCARGA)
  // ==================================================================
  useEffect(() => {
    if (isOnline) {
      if (Number(saldoVivo) < 2000) {
        alert("⚠️ FONDO INSUFICIENTE: Su cuenta TAXIA CIMCO requiere un saldo mínimo de $2.000 COP para activarse en la red de carga.");
        setIsOnline(false);
        return;
      }

      console.log(`📡 [CIMCO-CARGA-SOCKET] Inicializando canal hacia: ${BACKEND_URL}`);
      
      socketRef.current = io(BACKEND_URL, {
        auth: { token },
        transports: ['websocket']
      });

      socketRef.current.on('connect', () => {
        console.log(`✅ [CIMCO-CARGA-SOCKET] Conectado exitosamente con ID: ${socketRef.current.id}`);
        socketRef.current.emit('registrar_conductor', { 
          conductorId, 
          tipoServicio: 'motocarga',
          email: user?.email || localStorage.getItem('conductorEmail') || ''
        });
      });

      socketRef.current.on('nueva_solicitud_viaje', (data) => {
        console.log("🔥 [CIMCO-RADAR-CARGA] Flete detectado en el perímetro de asignación!", data);
        if (!servicioActivo && !solicitudViaje) {
          setSolicitudViaje(data);
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log("⚠️ [CIMCO-CARGA-SOCKET] Canal perimetral desconectado.");
      });

      iniciarTrackingGPS();

    } else {
      desconectarEcosistema();
    }

    return () => {
      desconectarEcosistema();
    };
  }, [isOnline, conductorId, token, saldoVivo]);

  // ==================================================================
  // 4. TRANSMISIÓN DE TELEMETRÍA GEOESPACIAL (COMPATIBLE 2DSPHERE [LNG, LAT])
  // ==================================================================
  const iniciarTrackingGPS = () => {
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

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('actualizar_radar_gps', {
            conductorId,
            lat: latitude,
            lng: longitude
          });
          console.log(`🎯 [RADAR-BURST-CARGA] Ubicación enviada: [${longitude}, ${latitude}]`);
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
      console.log("🛰️ [CIMCO-TELEMETRIA] Receptor GPS de carga apagado.");
    }
    if (socketRef.current) {
      socketRef.current.emit('desactivar_conductor', { conductorId });
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log("📡 [CIMCO-SOCKET] Canal de red purgado limpiamente.");
    }
  };

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
  }, [user?.uid]);

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
      
      const respuesta = await api.post(`/api/viajes/aceptar`, {
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
    <div className="min-h-screen bg-[#0e0e11] text-zinc-100 font-mono antialiased pb-28 relative selection:bg-amber-400 selection:text-black">
      
      {/* 🔝 ENCABEZADO DE CONTROL MAESTRO */}
      <header className="sticky top-0 z-50 bg-zinc-900 border-b-4 border-black p-4 flex justify-between items-center shadow-[0_4px_0px_0px_#000]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* BOTÓN OPERATIVO PARA ABRIR MODAL DESDE EL ICONO */}
          <button 
            onClick={() => setMostrarModalPerfil(true)}
            title="Editar Perfil y Vehículo"
            className="p-2 bg-amber-400 text-black border-2 border-black font-black text-base flex items-center justify-center shadow-[2px_2px_0px_0px_#000] select-none shrink-0 rounded-none hover:bg-amber-300 transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            🚚
          </button>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setMostrarModalPerfil(true)}>
            <h1 className="text-xs font-black tracking-widest text-white uppercase truncate flex items-center gap-1.5" title={nombreConductor}>
              {nombreConductor} <span className="text-[9px] text-amber-400 underline lowercase font-normal">(editar)</span>
            </h1>
            <p className="text-[9px] text-zinc-400 font-bold tracking-widest uppercase flex items-center gap-1 mt-1">
              <Signal size={10} className={isOnline ? "text-amber-400 animate-pulse" : "text-zinc-600"} strokeWidth={3} /> 
              {isOnline ? 'MALLA CARGA ACTIVA' : 'NODO DESCONECTADO'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1.5 rounded-none font-black text-[10px] uppercase tracking-wider border-2 border-black transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_0px_#000] ${
              isOnline ? 'bg-amber-400 text-black font-black' : 'bg-zinc-800 text-zinc-400 border-black hover:bg-zinc-700'
            }`}
          >
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </button>

          <div className="flex items-center gap-2 bg-black border-2 border-black px-2.5 py-1.5 rounded-none shadow-[2px_2px_0px_0px_#000]">
            <Wallet size={13} className="text-amber-400" strokeWidth={2.5} />
            <span className="text-[10px] font-black text-zinc-200">
              {walletLoading ? '...' : `$${Number(saldoVivo).toLocaleString('es-CO')}`}
            </span>
          </div>

          <button 
            onClick={handleCerrarSesion}
            className="p-2 bg-red-500 text-black border-2 border-black rounded-none hover:bg-red-600 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center shadow-[2px_2px_0px_0px_#000] shrink-0"
          >
            <LogOut size={13} strokeWidth={3} />
          </button>
        </div>
      </header>

      {/* BLOQUEO POR SALDO INSOLVENTE */}
      {Number(saldoVivo) < 2000 && !walletLoading && (
        <div className="m-4 p-3 bg-red-500 text-black border-4 border-black rounded-none flex items-center gap-2.5 font-black text-[10px] uppercase tracking-wider shadow-[4px_4px_0px_0px_#000] relative z-10 animate-pulse">
          <AlertCircle size={16} strokeWidth={2.5} className="shrink-0" />
          <span>Radar Inactivo: Recargar saldo para fletes ($2.000 COP mín)</span>
        </div>
      )}

      {/* 🗺️ CONTENEDOR CENTRAL LOGÍSTICO */}
      <main className="p-4 z-10 relative max-w-md mx-auto space-y-6">
        
        {!isOnline && (
          <div className="text-center p-6 bg-zinc-900 border-4 border-black shadow-[4px_4px_0px_0px_#000] rounded-none my-8">
            <div className="w-12 h-12 bg-black border-2 border-black rounded-none flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_0px_#000]">
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
              <div className="bg-zinc-900 p-5 border-4 border-black shadow-[4px_4px_0px_0px_#000] rounded-none space-y-4">
                <div className="flex justify-between items-center border-b-4 border-black pb-3">
                  <div className="flex items-center gap-1.5">
                    <Truck className="text-amber-400 animate-pulse" size={14} strokeWidth={3} />
                    <span className="text-[9px] font-black tracking-widest bg-yellow-400 text-black border-2 border-black px-2 py-0.5 uppercase">
                      FLETE: {servicioActivo.estado}
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
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-black">Punto de Carga / Origen</p>
                      <p className="text-zinc-200 font-bold text-[11px] mt-0.5 leading-tight">{servicioActivo.origenDireccion || "Dirección de Origen"}</p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-zinc-800 my-2"></div>

                  <div className="flex items-start gap-2.5">
                    <Navigation size={14} className="text-cyan-400 mt-0.5 shrink-0" strokeWidth={2.5} />
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-black">Punto de Descarga / Destino</p>
                      <p className="text-zinc-200 font-bold text-[11px] mt-0.5 leading-tight">{servicioActivo.destinoDireccion || "Dirección de Destino"}</p>
                    </div>
                  </div>

                  {servicioActivo.detallesCarga && (
                    <div className="bg-black/60 p-2.5 border border-zinc-800 text-[10px] text-zinc-400 font-bold uppercase tracking-wide">
                      <span className="text-amber-400 font-black">📦 Manifiesto:</span> {servicioActivo.detallesCarga}
                    </div>
                  )}

                  <div className="border-t border-4 border-black pt-3 mt-2 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-black">
                      <CircleDollarSign size={14} className="text-amber-500" strokeWidth={2.5} />
                      <span>Valor Liquidado:</span>
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
                      className="w-full bg-amber-400 hover:bg-amber-500 text-black text-xs font-black uppercase py-3.5 border-2 border-black rounded-none tracking-widest shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#000] transition-all"
                    >
                      Confirmar: Llegada a Punto de Carga
                    </button>
                  )}
                  {servicioActivo.estado === 'EN_SITIO' && (
                    <button 
                      onClick={() => transicionarEstadoViaje('EN_VIAJE')}
                      className="w-full bg-orange-400 text-black text-xs font-black uppercase py-3.5 border-2 border-black rounded-none tracking-widest shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#000] transition-all"
                    >
                      Iniciar Ruta de Reparto
                    </button>
                  )}
                  {servicioActivo.estado === 'EN_VIAJE' && (
                    <button 
                      onClick={() => transicionarEstadoViaje('FINALIZADO')}
                      className="w-full bg-emerald-400 text-black text-xs font-black uppercase py-3.5 border-2 border-black rounded-none tracking-widest shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#000] transition-all"
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
                  <div className="w-full bg-zinc-900 border-4 border-amber-400 p-5 rounded-none shadow-[6px_6px_0px_0px_#000] space-y-4 mb-6 animate-pulse">
                    <div className="flex justify-between items-start border-b-2 border-black pb-3">
                      <span className="bg-amber-400 text-black text-[9px] font-black px-2 py-1 border border-black uppercase tracking-wider">
                        📦 SOLICITUD DE FLETE REAL-TIME
                      </span>
                      <span className="text-sm font-black text-amber-400 bg-black px-2.5 py-0.5 border border-zinc-800">
                        ${Number(solicitudViaje?.tarifa || solicitudViaje?.valor || 0).toLocaleString('es-CO')}
                      </span>
                    </div>
                    
                    <div className="space-y-2.5 text-xs text-zinc-300 bg-black/40 p-3 border-2 border-black">
                      <p className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-black shrink-0">📍</span>
                        <span className="leading-tight"><strong className="text-zinc-500 uppercase text-[9px] block">Origen:</strong> {solicitudViaje?.origenTexto || solicitudViaje?.origenDireccion || "Punto de Carga"}</span>
                      </p>
                      <div className="border-t border-dashed border-zinc-800 my-1.5"></div>
                      <p className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-black shrink-0">🏁</span>
                        <span className="leading-tight"><strong className="text-zinc-500 uppercase text-[9px] block">Destino:</strong> {solicitudViaje?.destinoTexto || solicitudViaje?.destinoDireccion || "Destino de Despacho"}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={() => setSolicitudViaje(null)}
                        disabled={loading}
                        className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 py-2 rounded-none font-bold text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
                      >
                        Ignorar
                      </button>
                      <button
                        onClick={aceptarViaje}
                        disabled={loading}
                        className="bg-amber-400 hover:bg-amber-500 text-black py-2 rounded-none font-black text-xs uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
                      >
                        {loading ? 'ASIGNANDO...' : 'TOMAR FLETE'}
                      </button>
                    </div>
                  </div>
                )}

                {/* CASO 3: HISTORIAL EN RADAR FIRESTORE DE OFERTAS DISPONIBLES */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1 border-b-2 border-black pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-amber-500 animate-pulse" strokeWidth={2.5} />
                      <h2 className="text-[10px] uppercase font-black tracking-widest text-zinc-400">
                        Fletes Libres en Radar ({ofertasDisponibles.length})
                      </h2>
                    </div>
                    <span className="text-[9px] text-zinc-400 bg-zinc-900 px-2 py-1 border-2 border-black flex items-center gap-1.5 font-bold shadow-[1px_1px_0px_0px_#000]">
                      <MapPin size={11} className="text-amber-400" strokeWidth={3} />
                      GPS: [{coordenadas?.lng?.toFixed(4)}, {coordenadas?.lat?.toFixed(4)}]
                    </span>
                  </div>

                  {cargandoOfertas ? (
                    <div className="text-center py-12 text-zinc-500 font-bold text-xs uppercase tracking-wider bg-zinc-900 border-4 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-3">
                      <Loader size={14} className="animate-spin text-amber-400" /> Sincronizando malla de fletes...
                    </div>
                  ) : ofertasDisponibles.length === 0 ? (
                    <div className="bg-zinc-900 border-4 border-black rounded-none p-8 text-center text-zinc-500 text-xs uppercase tracking-widest font-black shadow-[4px_4px_0px_0px_#000]">
                      Sin solicitudes de carga pendientes en la zona.
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
                              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-black px-2 py-0.5 border border-zinc-800">
                                MOTOCARGA
                              </span>
                              <span className="font-black text-white text-sm">${Number(oferta.valor || 0).toLocaleString('es-CO')}</span>
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
                              className="w-full bg-amber-400 text-black disabled:bg-zinc-800 disabled:border-zinc-700 disabled:text-zinc-600 font-black text-[10px] py-2.5 px-4 rounded-none uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
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

      {/* 🛠️ MODAL NEO-BRUTALISTA DE AJUSTE DE DATOS PERSONALES / VEHÍCULO */}
      {mostrarModalPerfil && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border-4 border-black shadow-[8px_8px_0px_0px_#000] p-5 space-y-4 font-mono">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest">
                <UserSquare2 size={16} className="text-amber-400" />
                <span>Perfil Operador</span>
              </div>
              <button 
                onClick={() => setMostrarModalPerfil(false)}
                className="text-[10px] font-black bg-zinc-800 border-2 border-black text-zinc-400 px-2 py-0.5 uppercase hover:bg-zinc-700 active:translate-x-[1px]"
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
                  className="w-full bg-black text-zinc-100 border-2 border-black p-2 font-bold focus:outline-none focus:border-amber-400 rounded-none placeholder-zinc-700 uppercase"
                  placeholder="Ej: MARCOS DIAZ"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Celular / Contacto</label>
                <input 
                  type="tel" 
                  required
                  value={datosPerfil.telefono}
                  onChange={(e) => setDatosPerfil({...datosPerfil, telefono: e.target.value})}
                  className="w-full bg-black text-zinc-100 border-2 border-black p-2 font-bold focus:outline-none focus:border-amber-400 rounded-none placeholder-zinc-700"
                  placeholder="Ej: 3157654321"
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
                    className="w-full bg-black text-zinc-100 border-2 border-black p-2 font-bold focus:outline-none focus:border-amber-400 rounded-none placeholder-zinc-700 uppercase"
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
                    className="w-full bg-black text-zinc-100 border-2 border-black p-2 font-bold focus:outline-none focus:border-amber-400 rounded-none placeholder-zinc-700"
                    placeholder="Ej: Torito RE 205"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={guardandoPerfil}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-black font-black uppercase py-3 border-2 border-black tracking-widest shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
                >
                  {guardandoPerfil ? 'GUARDANDO CAMBIOS...' : 'ACTUALIZAR DATOS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🧭 BARRA DE NAVEGACIÓN INFERIOR */}
      <footer className="fixed bottom-0 left-0 w-full bg-zinc-900 border-t-4 border-black p-3 flex justify-around items-center z-50 shadow-[0_-4px_0px_0px_#000]">
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
        <button className="text-zinc-600 flex flex-col items-center gap-0.5 cursor-not-allowed opacity-50">
          <Wallet size={18} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-wider">Cuentas</span>
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