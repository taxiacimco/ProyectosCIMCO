// Versión Arquitectura: V15.9 - Integración Quirúrgica del Módulo de Edición de Perfil de Central
/**
 * Ubicación: frontend\src\pages\despachador\HomeDespachador.jsx
 * Misión: Registro manual de solicitudes, inyección de asignaciones, calcomanía QR de autogestión
 * y despliegue del radar satelital en tiempo real para las unidades de la cooperativa autorizada.
 * Ajuste V15.9: Integración del subcomponente 'ModalEditarPerfil' y mapeo del disparador de configuración en la cabecera táctica.
 * Preservación estricta de la lógica de sockets unificados, filtros de telemetría y reglas estéticas CIMCO-UI V9.3.
 */

import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, FIRESTORE_PATHS } from "@/config/firebase"; 
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/SocketContext"; // ✅ Consumo del canal unificado blindado
import api, { VIAJES_ENDPOINTS } from "@/config/api"; 
import { Shield, Users, MapPin, AlertCircle, RefreshCw, Send, CheckCircle, Bus, Hash, Tag, QrCode, Download, Map, Settings } from "lucide-react";
import { formatHoraColombia } from '@/utils/dateFormatter';
import { QRCodeSVG } from "qrcode.react"; // ✅ Importación de componente vectorial para calcomanías seguras

// 🗺️ IMPORTACIÓN DEL RADAR GPS OPERATIVO DE CONFLICTOS DE RENDIMIENTO
import MapaOperativo from "@/components/admin/MapaOperativo";
import ModalEditarPerfil from "@/components/shared/ModalEditarPerfil"; // ✅ Inyección de subcomponente solicitado

const HomeDespachador = () => {
  // 🛡️ Guardas de Seguridad y Consumo del Contexto Centralizado
  const authContext = useAuth();
  const user = authContext?.user || null;
  const setUser = authContext?.setUser || null;
  
  const { socket, isConnected } = useSocket();

  // 📝 ESTADOS DE CONTROL OPERATIVO
  const [conductores, setConductores] = useState([]);
  const [loadingConductores, setLoadingConductores] = useState(true);
  const [errorConductores, setErrorConductores] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // ✅ Control de visibilidad del modal

  // 🎫 ESTADOS DE FORMULARIO DE RUTA (INYECCIÓN DE VIAJES MANUALES)
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [valorPasaje, setValorPasaje] = useState("");
  const [loadingAccion, setLoadingAccion] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  // 🛠️ Normalización atómica de metadatos de la Cooperativa para evitar quiebres por Undefined
  const cooperativaDespachador = user?.cooperativa || user?.empresa || "";
  const idOperadorLogistico = user?.id || user?._id || user?.uid || "";

  // 📡 STREAM EN TIEMPO REAL: Conductores Homologados a la misma Cooperativa
  useEffect(() => {
    if (!cooperativaDespachador) {
      setErrorConductores("No se detectó ninguna cooperativa asociada a la sesión de este despachador.");
      setLoadingConductores(false);
      return;
    }

    setLoadingConductores(true);
    setErrorConductores(null);

    const pathUsuarios = FIRESTORE_PATHS?.users || "usuarios";
    
    // Consulta indexada segura basada en cooperativa y rol operativo
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

  // 🚀 DISPARADOR TRANSACCIONAL: Registro centralizado e inyección del viaje en el pool logístico
  const handleRegistrarYDistribuirViaje = async (conductorSeleccionado) => {
    if (!conductorSeleccionado || !origen.trim() || !destino.trim() || !valorPasaje) {
      setMensajeError("Verifique los parámetros de la ruta. Faltan datos obligatorios.");
      return;
    }

    setLoadingAccion(true);
    setMensajeExito("");
    setMensajeError("");

    const payloadInyeccion = {
      conductorId: conductorSeleccionado.id,
      origen: origen.trim().toUpperCase(),
      destino: destino.trim().toUpperCase(),
      valorPasaje: Number(valorPasaje),
      cooperativa: cooperativaDespachador,
      despachadorId: idOperadorLogistico,
      creadoManualmente: true
    };

    try {
      const endpoint = VIAJES_ENDPOINTS?.crear || "/api/viajes/crear";
      const response = await api.post(endpoint, payloadInyeccion);

      if (response?.data?.success) {
        setMensajeExito(`¡Ruta asignada con éxito al conductor ${conductorSeleccionado.fullName}!`);
        // Limpiar el formulario para evitar duplicados accidentales
        setOrigen("");
        setDestino("");
        setValorPasaje("");
        
        // Desvanecer el banner de éxito de forma fluida
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

  const isFormInvalid = !origen.trim() || !destino.trim() || !valorPasaje || Number(valorPasaje) <= 0;

  // 📄 CADENA DE AUTOGESTIÓN: Payload vectorizado para la calcomanía QR impresa en la central
  const urlCalcomaniaAutogestion = `https://taxiacimco.com/register?cooperativa=${encodeURIComponent(cooperativaDespachador)}&role=conductor`;

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
      downloadLink.download = `QR_AUTOGESTION_${cooperativaDespachador.replace(/\s+/g, '_').toUpperCase()}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (e) {
      console.error("No se pudo exportar el vector QR:", e);
    }
  };

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
                COOPERATIVA: {cooperativaDespachador || "Flota Asignada"} | ID Operador: {String(idOperadorLogistico).substring(0, 8)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* ⚙️ BOTÓN DE CONFIGURACIÓN DE CENTRAL */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-white border border-white/5 hover:border-orange-500/30 px-4 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
            >
              <Settings size={14} className="text-orange-400" />
              Editar Perfil
            </button>

            <div className="flex items-center gap-2 font-mono text-[10px] uppercase bg-zinc-950/50 border border-white/5 px-3 py-1.5 rounded-xl text-zinc-400">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
              {isConnected ? "Radar Radial Activo (WSS://)" : "Radar Desconectado"}
            </div>
          </div>
        </div>

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
                    placeholder="Ej. AGUACHICA"
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/50 uppercase font-mono transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Terminal Destino</label>
                  <input 
                    type="text" 
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    placeholder="Ej. VALLEDUPAR"
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/50 uppercase font-mono transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Valor Pasaje contractual (COP)</label>
                  <input 
                    type="number" 
                    value={valorPasaje}
                    onChange={(e) => setValorPasaje(e.target.value)}
                    placeholder="0"
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-orange-400 font-mono focus:outline-none focus:border-orange-500/50 transition-all"
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

          {/* COLUMNA 2 Y 3: RADAR SATELITAL Y MALLA DE SELECCIÓN */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* COMPONENTE: RADAR OPERATIVO CON FILTRADO EN CALIENTE */}
            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-2 shadow-xl overflow-hidden relative">
              <div className="absolute top-4 left-4 z-[1000] bg-zinc-950/80 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <Map size={12} className="text-orange-400 animate-pulse" />
                <span className="text-[9px] font-black tracking-widest uppercase text-white">Radar Satelital de Cooperativa</span>
              </div>
              
              <div className="h-[280px] w-full rounded-2xl overflow-hidden">
                <MapaOperativo filtroCooperativa={cooperativaDespachador} />
              </div>
            </div>

            {/* COMPONENTE: MALLA DE CONDUCTORES DISPONIBLES EN CENTRAL */}
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
                  <p className="text-[9px] text-zinc-600 font-mono mt-0.5 uppercase px-6">Imprima el calcomanía QR lateral para que los operadores se vinculen a su canal central.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {conductores.map((conductor) => (
                    <div 
                      key={conductor.id} 
                      className="bg-zinc-950/50 border border-white/5 hover:border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full sm:w-auto">
                        
                        {/* FILA 1: IDENTIFICACIÓN DEL MÓVIL */}
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

                        {/* FILA 2: DATOS DEL OPERADOR DEL VEHÍCULO */}
                        <div>
                          <p className="text-[11px] text-zinc-300 font-black uppercase tracking-wide">
                            CONDUCTOR: <span className="text-white">{conductor.fullName || conductor.nombre || 'Desconocido'}</span>
                          </p>
                          <p className="text-[9px] text-zinc-500 font-mono mt-0.5 truncate max-w-[280px]\">
                            ID Satelital: {conductor.id}
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleRegistrarYDistribuirViaje(conductor)}
                        disabled={loadingAccion || isFormInvalid}
                        className="w-full sm:w-auto bg-orange-500 hover:bg-orange-400 text-zinc-950 px-5 py-3 font-black text-[10px] uppercase rounded-xl transition-all shadow-md border border-orange-400 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none shrink-0"
                      >
                        <Send size={12} />
                        {loadingAccion ? "Despachando..." : "Asignar Ruta e Inyectar"}
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
      <ModalEditarPerfil 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        user={user}
        onUpdateSuccess={(updatedUser) => {
          console.log("Perfil de central sincronizado en sesión:", updatedUser);
          if (setUser && typeof setUser === "function" && updatedUser) {
            setUser(prev => ({
              ...prev,
              ...updatedUser,
              // Mantener compatibilidad si se normalizan propiedades de la sesión corporativa
              rol: updatedUser?.rol || prev?.rol,
              cooperativa: updatedUser?.cooperativa || prev?.cooperativa
            }));
          }
        }}
      />
    </div>
  );
};

export default HomeDespachador;