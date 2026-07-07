// Versión Arquitectura: V12.0 - Optimización de Canal WebSocket Persistente y Blindaje de Entrega de Ráfagas
/**
 * Ubicación: frontend\src\pages\despachador\HomeDespachador.jsx
 * Misión: Registro manual de solicitudes e inyección activa de telemetría y asignaciones de viaje a la flota disponible.
 * Ajuste V12.0: Migración a Socket persistente enlazado al ciclo de vida del componente para mitigar 
 *               desconexiones síncronas truncadas y asegurar la notificación a la flota intermunicipal.
 */

import React, { useEffect, useState, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, FIRESTORE_PATHS } from "@/config/firebase"; 
import { useAuth } from "@/hooks/useAuth";
import api, { VIAJES_ENDPOINTS, HOST_IP } from "@/config/api"; 
import { io } from "socket.io-client"; 
import { Shield, Users, MapPin, AlertCircle, RefreshCw, Send, CheckCircle, Bus } from "lucide-react";
import { formatHoraColombia } from '@/utils/dateFormatter';

const HomeDespachador = ({ userProfile }) => {
  const { user } = useAuth();
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorOperativo, setErrorOperativo] = useState("");
  const [loadingAccion, setLoadingAccion] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Estados para el registro manual de solicitudes de pasajeros
  const [destino, setDestino] = useState("");
  const [tarifa, setTarifa] = useState("");
  const [nombrePasajero, setNombrePasajero] = useState("");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [tipoVehiculo, setTipoVehiculo] = useState("mototaxi");

  const isFormInvalid = !destino || !tarifa || !nombrePasajero;

  // 🛡️ REFERENCIA MUTABLE: Canal persistente de WebSockets de fondo
  const socketRef = useRef(null);

  // ⚡ GESTIÓN DEL CICLO DE VIDA DEL CANAL WEBSOCKET
  useEffect(() => {
    if (!user?.uid) return;

    // Inicialización del Socket persistente de la central
    socketRef.current = io(HOST_IP, {
      transports: ['websocket'],
      upgrade: false
    });

    socketRef.current.on("connect", () => {
      console.log("⚡ [CIMCO-SOCKET] Bus de despacho central enlazado.");
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("⚠️ [CIMCO-SOCKET-ERR] Error en canal de ráfagas:", err);
    });

    // Desconexión limpia y controlada estrictamente al desmontar el componente de despacho
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log("⚡ [CIMCO-SOCKET] Bus de despacho central liberado.");
      }
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const pathConductores = FIRESTORE_PATHS?.users || 'usuarios';
    const q = query(
      collection(db, pathConductores),
      where("role", "in", ["mototaxi", "intermunicipal", "motocarga"]),
      where("isActive", "==", true)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const lista = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setConductores(lista);
        setLoading(false);
      },
      (err) => {
        console.error("❌ Error cargando flota activa:", err);
        setErrorOperativo("No se pudo sincronizar el estado de la flota activa.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleRegistrarYDistribuirViaje = async (conductor) => {
    if (isFormInvalid) return;
    setLoadingAccion(true);
    setErrorOperativo("");
    setSuccessMessage("");

    try {
      const payloadViaje = {
        pasajeroNombre: nombrePasajero,
        destino: destino,
        tarifa: parseFloat(tarifa),
        metodoPago: metodoPago,
        tipoVehiculo: tipoVehiculo,
        status: 'ASIGNADO',
        dispatcherUid: user.uid,
        driverUid: conductor.id,
        driverName: conductor.fullName || conductor.nombre || 'Desconocido',
        driverPlaca: conductor.vehiculo || conductor.placa || 'N/A',
        createdAt: new Date()
      };

      // 1. Persistencia REST atómica del nuevo Manifiesto de Viaje
      await api.post(VIAJES_ENDPOINTS.crear, payloadViaje);

      // 2. Inyección y distribución segura por ráfaga WebSocket reutilizando el canal persistente
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("NUEVO_DESPACHO_CENTRAL", { driverUid: conductor.id });
      } else {
        console.warn("⚠️ [CIMCO-SOCKET] Canal desconectado. Intentando reenvío rápido...");
        // Fallback resiliente temporal si el canal principal fluctúa
        const tempSocket = io(HOST_IP);
        tempSocket.emit("NUEVO_DESPACHO_CENTRAL", { driverUid: conductor.id });
        setTimeout(() => tempSocket.disconnect(), 2000); // Retardo seguro de desconexión
      }

      setSuccessMessage(`¡Servicio asignado con éxito a ${conductor.fullName || conductor.nombre}!`);
      setDestino("");
      setTarifa("");
      setNombrePasajero("");
    } catch (err) {
      console.error("❌ Error en despacho atómico:", err);
      setErrorOperativo(err.response?.data?.message || "Falla en la compuerta de red del servidor central.");
    } finally {
      setLoadingAccion(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121214] text-zinc-100 p-4 md:p-8 font-sans selection:bg-amber-500/30 selection:text-yellow-200">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABECERA OPERATIVA DE LA CENTRAL */}
        <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-white">Módulo Central de Despacho</h1>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wider">Operador ID: {user?.uid?.substring(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase bg-zinc-950/50 border border-white/5 px-3 py-1.5 rounded-xl text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Terminal Conectada a Core ({HOST_IP})
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* PANEL DE REGISTRO DE SOLICITUD DE VIAJE */}
          <div className="lg:col-span-1 backdrop-blur-md bg-[#121214]/60 border border-white/5 rounded-3xl p-6 shadow-xl h-fit space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Users size={16} className="text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Nueva Solicitud Manual</h2>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={12} className="text-zinc-500" /> Nombre del Pasajero
                </label>
                <input 
                  type="text"
                  value={nombrePasajero}
                  onChange={(e) => setNombrePasajero(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-[#0c0c0e] border border-white/5 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-cyan-500/40 transition-all font-mono placeholder:text-zinc-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={12} className="text-zinc-500" /> Dirección de Destino
                </label>
                <input 
                  type="text"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  placeholder="Ej: Calle 4 #12-45 Barrio Centro"
                  className="w-full bg-[#0c0c0e] border border-white/5 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-cyan-500/40 transition-all font-mono placeholder:text-zinc-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                  Tarifa Estimada (COP)
                </label>
                <input 
                  type="number"
                  value={tarifa}
                  onChange={(e) => setTarifa(e.target.value)}
                  placeholder="Ej: 5000"
                  className="w-full bg-[#0c0c0e] border border-white/5 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-cyan-500/40 transition-all font-mono placeholder:text-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Método de Pago</label>
                  <select 
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full bg-[#0c0c0e] border border-white/5 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-cyan-500/40 transition-all font-mono"
                  >
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="WALLET">WALLET</option>
                    <option value="QR">CÓDIGO QR</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Tipo Flota</label>
                  <select 
                    value={tipoVehiculo}
                    onChange={(e) => setTipoVehiculo(e.target.value)}
                    className="w-full bg-[#0c0c0e] border border-white/5 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-cyan-500/40 transition-all font-mono"
                  >
                    <option value="mototaxi">MOTOTAXI</option>
                    <option value="intermunicipal">INTERMUNICIPAL</option>
                    <option value="motocarga">MOTOCARGA</option>
                  </select>
                </div>
              </div>
            </div>

            {errorOperativo && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-[11px] font-mono uppercase tracking-wide">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{errorOperativo}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-[11px] font-mono uppercase tracking-wide animate-in fade-in duration-200">
                <CheckCircle size={14} className="shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* GRILLA DE UNIDADES ACTIVAS DISPONIBLES PARA DESPACHO */}
          <div className="lg:col-span-2 backdrop-blur-md bg-[#121214]/60 border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Bus size={16} className="text-orange-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Flota Activa Homologada</h2>
              </div>
              <span className="text-[9px] bg-zinc-950/80 px-2.5 py-1 rounded-md text-zinc-500 border border-white/5 font-mono uppercase font-bold tracking-wider">
                Unidades: {conductores.filter(c => c.role === tipoVehiculo).length}
              </span>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-zinc-500 font-mono text-[11px] uppercase tracking-widest gap-2">
                <RefreshCw size={16} className="animate-spin text-orange-400" />
                Escaneando Operadores en Ruta...
              </div>
            ) : conductores.filter(c => c.role === tipoVehiculo).length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-zinc-600 font-mono text-[11px] uppercase tracking-widest border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                No hay operadores de tipo [{tipoVehiculo.toUpperCase()}] disponibles.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {conductores.filter(c => c.role === tipoVehiculo).map((conductor) => (
                  <div 
                    key={conductor.id} 
                    className="backdrop-blur-md bg-[#161619]/40 p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/10 transition-all duration-300 animate-in fade-in duration-200"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded font-bold uppercase tracking-wider">
                          {conductor.role}
                        </span>
                        <p className="font-black text-white text-sm tracking-wider">VEHÍCULO: {conductor.vehiculo || conductor.placa || 'N/A'}</p>
                        <span className="text-cyan-400 font-mono text-xs ml-auto sm:ml-2">
                          {formatHoraColombia(conductor.updatedAt || new Date())}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-bold mt-1.5 uppercase tracking-tight">
                        OPERADOR: {conductor.fullName || conductor.nombre || 'Desconocido'}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-medium mt-0.5 truncate max-w-[280px]">
                        ID: {conductor.id}
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => handleRegistrarYDistribuirViaje(conductor)}
                      disabled={loadingAccion || isFormInvalid}
                      className="bg-cyan-600 hover:bg-cyan-500 text-zinc-950 px-5 py-3 font-black text-[10px] uppercase rounded-xl transition-all shadow-md border border-cyan-400 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <Send size={12} />
                      {loadingAccion ? "Despachando..." : "Asignar y Despachar"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomeDespachador;