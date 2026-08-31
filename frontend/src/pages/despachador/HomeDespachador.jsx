// Versión Arquitectura: V19.6 - Fusión Atómica, Exportación Default y Blindaje de Payload Transaccional Completo
/**
 * Ubicación: frontend\src\pages\despachador\HomeDespachador.jsx
 * Misión: Registro manual de solicitudes, inyección de asignaciones con identidad completa, calcomanía QR de autogestión,
 * monitoreo de saldo operativo, radar satelital en tiempo real y tabla de pujas/ofertas activas en tiempo real.
 * Ajuste V19.6: Exportación por defecto para React.lazy() e inclusión garantizada del payload de identidad completo en WebSocket y REST.
 */

import React, { useEffect, useState, Suspense } from "react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db, FIRESTORE_PATHS } from "@/config/firebase"; 
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket"; 
import { useWallet } from "@/hooks/useWallet";
import api, { VIAJES_ENDPOINTS } from "@/config/api"; 
import { 
  Shield, Users, MapPin, AlertCircle, RefreshCw, Send, CheckCircle, Bus, Tag, 
  QrCode, Download, Map, Settings, Wallet, Building2, User, Phone, FileText, 
  Gavel, DollarSign, Clock, AlertTriangle
} from "lucide-react";
import { formatHoraColombia } from "@/utils/dateFormatter";
import { QRCodeSVG } from "qrcode.react"; 

// 🗺️ CARGA PEREZOSA DEL RADAR GPS OPERATIVO Y COMPONENTE DE AJUSTES DE PERFIL
const MapaOperativo = React.lazy(() => import("@/config/firebase").then(() => import("@/components/admin/MapaOperativo")));
import AjustesPerfil from "@/components/shared/AjustesPerfil";

// 💳 CONSTANTE DE NEGOCIO: UMBRAL MÍNIMO OPERATIVO DE BILLETERA DE DESPACHADOR
const UMBRAL_MINIMO_SALDO = 2000;

export default function HomeDespachador() {
  // 🛡️ Guardas de Seguridad y Consumo del Contexto Centralizado
  const authContext = useAuth ? useAuth() : {};
  const user = authContext?.user || null;
  const setUser = authContext?.setUser || null;
  const token = authContext?.token || localStorage.getItem("token") || user?.token || "";
  
  // 📡 Consumo Resiliente del Socket Centralizado (Canal de Empresa y Pujas)
  const socketContext = useSocket ? useSocket() : {};
  const socket = socketContext?.socket || null;
  const isConnected = socketContext?.isConnected ?? Boolean(socket?.connected);
  const ofertas = socketContext?.ofertas || [];
  const crearSolicitud = socketContext?.crearSolicitud || null;
  const aceptarOferta = socketContext?.aceptarOferta || null;

  // 💳 CONSUMO DEL HOOK UNIFICADO USEWALLET
  const walletContext = useWallet ? useWallet() : {};
  const wallet = walletContext?.wallet || null;
  const saldo = walletContext?.saldo ?? walletContext?.balance ?? 0;
  const loadingWallet = walletContext?.loading ?? walletContext?.loadingWallet ?? false;

  // 🛡️ EVALUACIÓN DE BLOQUEO POR SALDO INSUFICIENTE
  const saldoInsuficiente = Number(saldo) < UMBRAL_MINIMO_SALDO;

  // 📝 ESTADOS DE CONTROL OPERATIVO
  const [conductores, setConductores] = useState([]);
  const [loadingConductores, setLoadingConductores] = useState(true);
  const [errorConductores, setErrorConductores] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loadingAceptarId, setLoadingAceptarId] = useState(null);

  // 🎫 ESTADOS DE FORMULARIO DE RUTA (INYECCIÓN DE VIAJES MANUALES)
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [valorPasaje, setValorPasaje] = useState("");
  const [loadingAccion, setLoadingAccion] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  // 👤 ESTADOS DE IDENTIDAD Y PARÁMETROS OPERATIVOS EN VIVO
  const [datosOperativos, setDatosOperativos] = useState({
    nombre: "",
    telefono: "",
    empresa: "",
    terminal: "",
    placaVehiculo: "",
    numeroInterno: ""
  });

  // 🛠️ Normalización atómica de metadatos de la Cooperativa/Empresa para evitar quiebres por Undefined
  const idOperadorLogistico = user?.id || user?._id || user?.uid || "";
  const cooperativaDespachador = datosOperativos.empresa || user?.cooperativa || user?.empresa || "";
  const empresaId = user?.empresaId || user?.empresa_id || user?.empresa || cooperativaDespachador || "";
  const terminalDespachador = datosOperativos.terminal || user?.terminal || user?.terminalOrigen || "";

  // 🔄 MANEJADOR DE ACTUALIZACIÓN DE USUARIO DESDE AJUSTESPERFIL
  const handleUpdateUser = (updatedUser) => {
    console.log("Perfil de central sincronizado en sesión:", updatedUser);
    if (updatedUser) {
      setDatosOperativos(prev => ({
        ...prev,
        nombre: updatedUser?.fullName || updatedUser?.nombre || prev.nombre,
        telefono: updatedUser?.telefonoMovil || updatedUser?.telefono || prev.telefono,
        empresa: updatedUser?.empresa || updatedUser?.cooperativa || prev.empresa,
        terminal: updatedUser?.terminal || updatedUser?.terminalOrigen || prev.terminal,
        placaVehiculo: updatedUser?.placaVehiculo || prev.placaVehiculo,
        numeroInterno: updatedUser?.numeroInterno || prev.numeroInterno
      }));

      if (setUser && typeof setUser === "function") {
        setUser(prev => ({
          ...prev,
          ...updatedUser,
          rol: updatedUser?.rol || prev?.rol,
          role: updatedUser?.role || prev?.role,
          cooperativa: updatedUser?.cooperativa || updatedUser?.empresa || prev?.cooperativa,
          empresa: updatedUser?.empresa || updatedUser?.cooperativa || prev?.empresa,
          empresaId: updatedUser?.empresaId || updatedUser?.empresa_id || prev?.empresaId,
          terminal: updatedUser?.terminal || updatedUser?.terminalOrigen || prev?.terminal
        }));
      }
    }
  };

  // 1. ESCUCHA REACTIVA DE PERFIL Y PARÁMETROS EN FIRESTORE
  useEffect(() => {
    if (!user?.uid && !idOperadorLogistico) return;

    const pathUsuarios = FIRESTORE_PATHS?.users || FIRESTORE_PATHS?.usuarios || "usuarios";
    const targetUid = user?.uid || idOperadorLogistico;
    const despachadorRef = doc(db, pathUsuarios, targetUid);

    const unsubscribe = onSnapshot(despachadorRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDatosOperativos({
          nombre: data?.fullName || data?.nombre || user?.fullName || user?.nombre || "",
          telefono: data?.telefonoMovil || data?.telefono || user?.telefonoMovil || user?.telefono || "",
          empresa: data?.empresa || data?.cooperativa || data?.empresaTransporte || user?.empresa || user?.cooperativa || "",
          terminal: data?.terminal || data?.terminalOrigen || user?.terminal || "",
          placaVehiculo: data?.placaVehiculo || data?.placa || user?.placaVehiculo || "",
          numeroInterno: data?.numeroInterno || user?.numeroInterno || ""
        });
      } else {
        setDatosOperativos({
          nombre: user?.fullName || user?.nombre || "",
          telefono: user?.telefonoMovil || user?.telefono || "",
          empresa: user?.empresa || user?.cooperativa || "",
          terminal: user?.terminal || "",
          placaVehiculo: user?.placaVehiculo || "",
          numeroInterno: user?.numeroInterno || ""
        });
      }
    }, (err) => {
      console.error("🚨 [CIMCO-DESPACHADOR-IDENTITY-ERR] Error al sincronizar perfil:", err);
    });

    return () => unsubscribe();
  }, [user, idOperadorLogistico]);

  // 📡 STREAM EN TIEMPO REAL: Conductores Homologados a la misma Cooperativa
  useEffect(() => {
    if (!cooperativaDespachador) {
      setErrorConductores("No se detectó ninguna cooperativa asociada a la sesión de este despachador.");
      setLoadingConductores(false);
      return;
    }

    setLoadingConductores(true);
    setErrorConductores(null);

    const pathUsuarios = FIRESTORE_PATHS?.users || FIRESTORE_PATHS?.usuarios || "usuarios";
    
    const q = query(
      collection(db, pathUsuarios),
      where("cooperativa", "==", cooperativaDespachador),
      where("role", "==", "conductor")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const listado = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: docSnap.id,
            fullName: data?.fullName || data?.nombre || "Operador Sin Nombre",
            telefonoMovil: data?.telefonoMovil || data?.telefono || "",
            placaVehiculo: data?.placaVehiculo || data?.placa || "N/A",
            numeroInterno: data?.numeroInterno || "N/A",
            isActive: data?.isActive ?? true,
            ...data,
          };
        });
        setConductores(listado);
        setLoadingConductores(false);
      },
      (err) => {
        console.error("🚨 [CIMCO-DESPACHADOR-STREAM] Error al sincronizar red de conductores:", err);
        setErrorConductores("Error de red satelital al recuperar la malla de conductores.");
        setLoadingConductores(false);
      }
    );

    return () => unsubscribe();
  }, [cooperativaDespachador]);

  // 🚀 DISPARADOR TRANSACCIONAL: Registro centralizado e inyección del viaje en el pool logístico con payload de identidad completo
  const handleRegistrarYDistribuirViaje = async (conductorSeleccionado) => {
    if (saldoInsuficiente) {
      setMensajeError(`Operación bloqueada. Billetera por debajo del umbral mínimo ($${UMBRAL_MINIMO_SALDO.toLocaleString('es-CO')} COP). Recargue saldo.`);
      return;
    }

    if (!conductorSeleccionado || !origen.trim() || !destino.trim() || !valorPasaje) {
      setMensajeError("Verifique los parámetros de la ruta. Faltan datos obligatorios.");
      return;
    }

    setLoadingAccion(true);
    setMensajeExito("");
    setMensajeError("");

    // 🛡️ Payload estandardizado inyectando el objeto de identidad completo
    const payloadInyeccion = {
      conductorId: conductorSeleccionado?.id || conductorSeleccionado?._id || conductorSeleccionado?.uid || "",
      conductor: conductorSeleccionado?.id || conductorSeleccionado?._id || conductorSeleccionado?.uid || "",
      despachadorId: String(idOperadorLogistico || ""),
      despachador: String(idOperadorLogistico || ""),
      empresaId: String(empresaId || ""),
      cooperativa: String(cooperativaDespachador || ""),
      empresa: String(cooperativaDespachador || ""),
      terminal: String(terminalDespachador || ""),
      origen: origen.trim().toUpperCase(),
      destino: destino.trim().toUpperCase(),
      valorPasaje: Number(valorPasaje),
      tarifa: Number(valorPasaje),
      tipoViaje: "intermunicipal",
      creadoManualmente: true,
      estado: "asignado"
    };

    const axiosConfig = token ? {
      headers: { Authorization: `Bearer ${token}` }
    } : {};

    try {
      // 1. Invocar wrapper de socket si existe en el contexto para emitir al canal de la empresa
      if (typeof crearSolicitud === 'function') {
        crearSolicitud(payloadInyeccion);
      } else if (socket && isConnected) {
        socket.emit("crear_solicitud", payloadInyeccion);
      }

      // 2. Persistencia REST de respaldo
      const endpoint = VIAJES_ENDPOINTS?.crear || "/api/viajes/crear";
      const response = await api.post(endpoint, payloadInyeccion, axiosConfig);

      if (response?.data?.success || response?.data?.viaje || response?.status === 200 || response?.status === 201) {
        const viajeCreado = response?.data?.viaje || response?.data?.data || response?.data;

        if (socket && isConnected) {
          socket.emit("nuevo_viaje", {
            viaje: viajeCreado,
            payload: payloadInyeccion,
            empresaId: String(empresaId || ""),
            cooperativa: String(cooperativaDespachador || ""),
            terminal: String(terminalDespachador || ""),
            despachadorId: String(idOperadorLogistico || ""),
            timestamp: new Date().toISOString()
          });

          socket.emit("alerta_despacho_central", {
            mensaje: `Nueva ruta asignada a la unidad ${conductorSeleccionado?.placaVehiculo || ''}`,
            empresaId: String(empresaId || ""),
            cooperativa: String(cooperativaDespachador || ""),
            terminal: String(terminalDespachador || ""),
            despachadorId: String(idOperadorLogistico || ""),
            conductorId: conductorSeleccionado?.id
          });
        }

        setMensajeExito(`¡Ruta asignada con éxito al conductor ${conductorSeleccionado.fullName}!`);
        setOrigen("");
        setDestino("");
        setValorPasaje("");
        
        setTimeout(() => setMensajeExito(""), 5000);
      } else {
        setMensajeError(response?.data?.message || "La compuerta central denegó la inyección de la ruta.");
      }
    } catch (err) {
      console.error("🚨 [CIMCO-DESPACHADOR-MUTATION] Fallo crítico en POST /viajes:", err);
      setMensajeError(err?.response?.data?.message || "Error físico de conexión con el Core de despacho.");
    } finally {
      setLoadingAccion(false);
    }
  };

  // 🔨 ASIGNACIÓN DE OFERTA / PUJA DESDE LA TABLA EN TIEMPO REAL CON IDENTIDAD COMPLETA
  const handleAceptarOfertaPuja = async (ofertaItem) => {
    if (saldoInsuficiente) {
      setMensajeError(`Asignación bloqueada. Billetera por debajo del umbral mínimo ($${UMBRAL_MINIMO_SALDO.toLocaleString('es-CO')} COP). Recargue saldo.`);
      return;
    }

    if (!ofertaItem) return;
    const ofertaId = ofertaItem?.id || ofertaItem?._id || ofertaItem?.ofertaId;
    
    setLoadingAceptarId(ofertaId);
    setMensajeExito("");
    setMensajeError("");

    try {
      const payloadAceptacion = {
        ofertaId: ofertaId,
        viajeId: ofertaItem?.viajeId || ofertaItem?.solicitudId,
        conductorId: ofertaItem?.conductorId || ofertaItem?.conductor?.id || ofertaItem?.uid,
        despachadorId: String(idOperadorLogistico || ""),
        empresaId: String(empresaId || ""),
        cooperativa: String(cooperativaDespachador || ""),
        terminal: String(terminalDespachador || ""),
        monto: ofertaItem?.monto || ofertaItem?.valor || ofertaItem?.tarifa,
        timestamp: new Date().toISOString()
      };

      if (typeof aceptarOferta === "function") {
        aceptarOferta(payloadAceptacion);
      } else if (socket && isConnected) {
        socket.emit("aceptar_oferta", payloadAceptacion);
      }

      setMensajeExito(`¡Oferta de $${Number(payloadAceptacion.monto || 0).toLocaleString('es-CO')} asignada exitosamente!`);
      setTimeout(() => setMensajeExito(""), 5000);
    } catch (err) {
      console.error("🚨 Error al procesar asignación de oferta:", err);
      setMensajeError("No se pudo completar la asignación de la oferta.");
    } finally {
      setLoadingAceptarId(null);
    }
  };

  const isFormInvalid = !origen.trim() || !destino.trim() || !valorPasaje || Number(valorPasaje) <= 0;

  // 📄 CADENA DE AUTOGESTIÓN: Payload vectorizado para la calcomanía QR impresa en la central
  const urlCalcomaniaAutogestion = `https://taxiacimco.com/register?cooperativa=${encodeURIComponent(cooperativaDespachador)}&empresaId=${encodeURIComponent(empresaId)}&role=conductor`;

  const handleDescargarQR = () => {
    const svgElement = document.getElementById("qr-cooperativa-svg");
    if (!svgElement) return;
    
    try {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      
      const downloadLink = document.createElement("a");
      downloadLink.href = blobURL;
      downloadLink.download = `QR_AUTOGESTION_${(cooperativaDespachador || 'FLOTA').replace(/\s+/g, '_').toUpperCase()}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (e) {
      console.error("No se pudo exportar el vector QR:", e);
    }
  };

  // Filtrado resiliente de ofertas asociadas a la empresa del despachador
  const ofertasFiltradas = ofertas.filter((o) => {
    if (!empresaId) return true;
    const targetEmpresa = o?.empresaId || o?.empresa_id || o?.empresa || o?.cooperativa || "";
    return !targetEmpresa || targetEmpresa === empresaId || targetEmpresa === cooperativaDespachador;
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-8 font-sans antialiased selection:bg-orange-500 selection:text-zinc-950">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABECERA OPERATIVA DE LA CENTRAL */}
        <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-white">
                Módulo Central de Despacho Intermunicipal
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wider">
                EMPRESA: {cooperativaDespachador || "Flota Asignada"} | EMPRESA_ID: {empresaId || "N/A"} | TERMINAL: {terminalDespachador || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            {/* 💳 BANDEROLA DE SALDO OPERATIVO UNIFICADO Y ESTADO DE UMBRAL */}
            <div className={`flex items-center gap-2 font-mono text-[10px] uppercase border px-3 py-2 rounded-xl transition-all ${
              saldoInsuficiente 
                ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]" 
                : "bg-zinc-950/50 border-white/5 text-zinc-400"
            }`}>
              {saldoInsuficiente ? (
                <AlertTriangle size={13} className="text-red-400 shrink-0 animate-pulse" />
              ) : (
                <Wallet size={13} className="text-emerald-400 shrink-0" />
              )}
              <span>
                Saldo Operativo:{" "}
                <strong className={`font-bold ${saldoInsuficiente ? "text-red-400" : "text-emerald-400"}`}>
                  {loadingWallet ? "Cargando..." : `$${Number(saldo).toLocaleString('es-CO')} COP`}
                </strong>
              </span>
            </div>

            {/* ⚙️ BOTÓN DE CONFIGURACIÓN DE CENTRAL */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-white border border-white/5 hover:border-orange-500/30 px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
            >
              <Settings size={14} className="text-orange-400" />
              Editar Perfil
            </button>

            <div className="flex items-center gap-2 font-mono text-[10px] uppercase bg-zinc-950/50 border border-white/5 px-3 py-2 rounded-xl text-zinc-400">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
              {isConnected ? "Radar Radial Activo (WSS://)" : "Radar Desconectado"}
            </div>
          </div>
        </div>

        {/* 🚨 ALERTA BANDEROLA DE BLOQUEO POR SALDO MÍNIMO OPERATIVO */}
        {saldoInsuficiente && (
          <div className="backdrop-blur-md bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 text-red-400 font-mono text-xs shadow-lg animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="shrink-0 text-red-400" />
              <div>
                <p className="font-black uppercase tracking-wider">Módulo de Despacho Bloqueado por Saldo Insuficiente</p>
                <p className="text-[10px] text-red-300/80 uppercase mt-0.5">
                  Su billetera actual (${Number(saldo).toLocaleString('es-CO')} COP) es inferior al umbral mínimo requerido de ${UMBRAL_MINIMO_SALDO.toLocaleString('es-CO')} COP. Recargue saldo para habilitar las asignaciones.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* REJILLA TÁCTICA PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA 1: FORMULARIO DE ASIGNACIÓN + CALCOMANÍA QR */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* PANEL DE CONTROL DE RUTAS */}
            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <MapPin size={16} className="text-orange-400" />
                <h2 className="text-[11px] font-black tracking-widest uppercase text-zinc-200">
                  Parámetros de Ruta Activa
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Terminal Origen</label>
                  <input 
                    type="text" 
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    disabled={saldoInsuficiente}
                    placeholder={terminalDespachador ? `Ej. ${terminalDespachador}` : "Ej. AGUACHICA"}
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/50 uppercase font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Terminal Destino</label>
                  <input 
                    type="text" 
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    disabled={saldoInsuficiente}
                    placeholder="Ej. VALLEDUPAR"
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/50 uppercase font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Valor Pasaje contractual (COP)</label>
                  <input 
                    type="number" 
                    value={valorPasaje}
                    onChange={(e) => setValorPasaje(e.target.value)}
                    disabled={saldoInsuficiente}
                    placeholder="0"
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-orange-400 font-mono focus:outline-none focus:border-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {mensajeExito && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-[10px] font-mono flex items-center gap-2 uppercase tracking-wide">
                  <CheckCircle size={14} className="shrink-0" />
                  <span>{mensajeExito}</span>
                </div>
              )}

              {mensajeError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-[10px] font-mono flex items-center gap-2 uppercase tracking-wide">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{mensajeError}</span>
                </div>
              )}

              <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl text-[9px] text-zinc-500 font-mono uppercase tracking-wider leading-relaxed">
                Instrucción: Digite el trayecto y presione <span className="text-orange-400">"Asignar Ruta"</span> en la fila del conductor que se encuentra físicamente en rampa de salida.
              </div>
            </div>

            {/* VECTOR CALCOMANÍA QR DE VINCULACIÓN AUTÓNOMA */}
            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-xl text-center space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 text-left">
                <div className="flex items-center gap-2">
                  <QrCode size={16} className="text-orange-400" />
                  <h2 className="text-[11px] font-black tracking-widest uppercase text-zinc-200">
                    Calcomanía QR de Autogestión
                  </h2>
                </div>
                <button 
                  onClick={handleDescargarQR}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  title="Descargar Vector SVG para Impresión"
                >
                  <Download size={14} />
                </button>
              </div>

              <div className="bg-white p-4 rounded-2xl inline-block shadow-inner shadow-black/40">
                <QRCodeSVG 
                  id="qr-cooperativa-svg"
                  value={urlCalcomaniaAutogestion}
                  size={140}
                  level={"H"}
                  includeMargin={false}
                  imageSettings={{
                    src: "https://cdnjs.cloudflare.com/ajax/libs/lucide/0.294.0/icons/shield.svg",
                    x: undefined,
                    y: undefined,
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-white font-black uppercase tracking-wider">Registro Rápido de Unidades</p>
                <p className="text-[9px] text-zinc-500 font-mono leading-relaxed px-2 uppercase">
                  Los nuevos conductores pueden escanear este código en la ventanilla para ingresar automáticamente a la flota de <span className="text-zinc-300">{cooperativaDespachador || "la cooperativa"}</span>.
                </p>
              </div>
            </div>

          </div>

          {/* COLUMNA 2 Y 3: RADAR SATELITAL, MALLA DE SELECCIÓN Y TABLA DE PUJAS EN TIEMPO REAL */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* RADAR OPERATIVO CON FILTRADO EN CALIENTE Y SUSPENSE */}
            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-2 shadow-xl overflow-hidden relative">
              <div className="absolute top-4 left-4 z-[1000] bg-zinc-950/80 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <Map size={12} className="text-orange-400 animate-pulse" />
                <span className="text-[9px] font-black tracking-widest uppercase text-white">Radar Satelital de Cooperativa</span>
              </div>
              
              <div className="h-[260px] w-full rounded-2xl overflow-hidden">
                <Suspense fallback={
                  <div className="w-full h-full bg-zinc-950/50 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-orange-500/20 border-t-orange-400 rounded-full animate-spin" />
                    <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Cargando Mapa Satelital...</span>
                  </div>
                }>
                  <MapaOperativo filtroCooperativa={cooperativaDespachador} />
                </Suspense>
              </div>
            </div>

            {/* TABLA DE PUJAS Y OFERTAS EN TIEMPO REAL (SOCKET STATE) */}
            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Gavel size={16} className="text-orange-400" />
                  <h2 className="text-[11px] font-black tracking-widest uppercase text-zinc-200">
                    Pujas y Ofertas en Tiempo Real ({ofertasFiltradas.length})
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono px-2 py-1 rounded-lg uppercase tracking-wider">
                  <Clock size={10} className="animate-spin" />
                  Canal Duplex Activo
                </div>
              </div>

              {ofertasFiltradas.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-white/5 rounded-2xl bg-zinc-950/20">
                  <DollarSign size={20} className="text-zinc-700 mx-auto mb-1" />
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Sin pujas pendientes en el canal</p>
                  <p className="text-[8px] text-zinc-600 font-mono mt-0.5 uppercase">Las ofertas emitidas por los conductores de la empresa aparecerán aquí automáticamente.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {ofertasFiltradas.map((oferta) => {
                    const idOferta = oferta?.id || oferta?._id || oferta?.ofertaId;
                    const conductorNombre = oferta?.nombreConductor || oferta?.conductorName || oferta?.conductor?.fullName || "Conductor";
                    const placa = oferta?.placa || oferta?.placaVehiculo || oferta?.conductor?.placaVehiculo || "N/A";
                    const monto = oferta?.monto || oferta?.valor || oferta?.tarifa || 0;

                    return (
                      <div 
                        key={idOferta || Math.random()} 
                        className="bg-zinc-950/60 border border-white/5 hover:border-orange-500/20 p-3 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center font-mono text-orange-400">
                            <DollarSign size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white uppercase">{conductorNombre}</span>
                              <span className="text-[9px] font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">{placa}</span>
                            </div>
                            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                              Oferta: <strong className="text-emerald-400 font-bold">${Number(monto).toLocaleString('es-CO')} COP</strong> | Trayecto: {oferta?.origen || 'N/A'} ➔ {oferta?.destino || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAceptarOfertaPuja(oferta)}
                          disabled={loadingAceptarId === idOferta || saldoInsuficiente}
                          title={saldoInsuficiente ? `Saldo insuficiente (Mínimo $${UMBRAL_MINIMO_SALDO.toLocaleString('es-CO')} COP)` : "Asignar Puja"}
                          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2 font-black text-[9px] uppercase rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          <CheckCircle size={12} />
                          {loadingAceptarId === idOferta ? "Asignando..." : saldoInsuficiente ? "Saldo Bloqueado" : "Asignar Puja"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MALLA DE CONDUCTORES DISPONIBLES EN CENTRAL */}
            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-orange-400" />
                  <h2 className="text-[11px] font-black tracking-widest uppercase text-zinc-200">
                    Malla de Operadores en Rampa ({conductores.length})
                  </h2>
                </div>
                
                <div className="flex items-center gap-1.5 text-[8px] bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono px-2 py-1 rounded-lg uppercase tracking-wider">
                  <RefreshCw size={8} className="animate-spin" />
                  Sincronización Atómica Activa
                </div>
              </div>

              {loadingConductores ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-orange-500/20 border-t-orange-400 rounded-full animate-spin" />
                  <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Escaneando espectro radial de la flota...</p>
                </div>
              ) : errorConductores ? (
                <div className="p-4 bg-red-500/5 border border-red-500/10 text-red-400 rounded-2xl text-xs font-mono flex items-center gap-2 uppercase tracking-wide">
                  <AlertCircle size={16} />
                  <span>{errorConductores}</span>
                </div>
              ) : conductores.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl bg-zinc-950/20">
                  <Bus size={24} className="text-zinc-700 mx-auto mb-2 animate-bounce" />
                  <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">No hay unidades en rampa</p>
                  <p className="text-[9px] text-zinc-600 font-mono mt-0.5 uppercase px-6">Imprima la calcomanía QR lateral para que los operadores se vinculen a su canal central.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {conductores.map((conductor) => (
                    <div 
                      key={conductor.id} 
                      className="bg-zinc-950/50 border border-white/5 hover:border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full sm:w-auto">
                        
                        {/* IDENTIFICACIÓN DEL MÓVIL */}
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded-xl bg-zinc-900 border border-white/5 flex flex-col items-center justify-center font-mono shadow-inner">
                            <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">NÚMERO</span>
                            <span className="text-xs font-black text-white leading-none mt-0.5">{conductor.numeroInterno}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black font-mono text-orange-400 tracking-wider bg-orange-500/5 border border-orange-500/10 px-1.5 py-0.5 rounded-md">
                                {conductor.placaVehiculo}
                              </span>
                              <span className={`w-1.5 h-1.5 rounded-full ${conductor.isActive ? 'bg-emerald-400' : 'bg-red-500'}`} />
                            </div>
                            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wide mt-1 flex items-center gap-1">
                              <Tag size={10} /> {conductor.telefonoMovil || 'Sin Teléfono'}
                            </p>
                          </div>
                        </div>

                        {/* DATOS DEL OPERADOR */}
                        <div>
                          <p className="text-[11px] text-zinc-300 font-black uppercase tracking-wide">
                            CONDUCTOR: <span className="text-white">{conductor.fullName || conductor.nombre || 'Desconocido'}</span>
                          </p>
                          <p className="text-[9px] text-zinc-500 font-mono mt-0.5 truncate max-w-[280px]">
                            ID Satelital: {conductor.id}
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleRegistrarYDistribuirViaje(conductor)}
                        disabled={loadingAccion || isFormInvalid || saldoInsuficiente}
                        title={saldoInsuficiente ? `Saldo insuficiente (Mínimo $${UMBRAL_MINIMO_SALDO.toLocaleString('es-CO')} COP)` : "Asignar Ruta e Inyectar"}
                        className="w-full sm:w-auto bg-orange-500 hover:bg-orange-400 text-zinc-950 px-5 py-3 font-black text-[10px] uppercase rounded-xl transition-all shadow-md border border-orange-400 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none shrink-0 cursor-pointer"
                      >
                        <Send size={12} />
                        {loadingAccion ? "Despachando..." : saldoInsuficiente ? "Saldo Bloqueado" : "Asignar Ruta e Inyectar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL GLOBAL PARA CONFIGURAR LA CENTRAL / PERFIL */}
      <AjustesPerfil 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        onUpdateSuccess={handleUpdateUser}
      />
    </div>
  );
}