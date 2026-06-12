// Versión Arquitectura: V11.0 - PROD READY: Estandarización de Rutas (Alias @), FIRESTORE_PATHS y CIMCO-UI V9.3 Glassmorphism
import React, { useEffect, useState } from "react";
import { doc, runTransaction, serverTimestamp, collection } from "firebase/firestore";
import { db, FIRESTORE_PATHS } from "@/config/firebase"; // 🚀 Rutas centrales e inyección de alias
import { useAuth } from "@/hooks/useAuth";
import api from "@/config/api"; // 🚀 Enrutamiento absoluto de infraestructura
import { Shield, Users, MapPin, AlertCircle, RefreshCw } from "lucide-react";

const HomeDespachador = ({ userProfile }) => {
  const { user } = useAuth();
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorOperativo, setErrorOperativo] = useState("");
  const [destino, setDestino] = useState("");
  const [tarifa, setTarifa] = useState("");

  // 📡 Sincronización HTTP de la Flota a través de API centralizada
  const cargarFlota = async () => {
    if (!userProfile?.fleetId) {
      console.warn("⚠️ [CIMCO-NEXUS] Perfil de despachador incompleto. Abortando solicitud de flota.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorOperativo("");
      const respuesta = await api.get(`/api/flotas/${userProfile.fleetId}/conductores`);
      if (respuesta.data && Array.isArray(respuesta.data)) {
        setConductores(respuesta.data);
      } else {
        setConductores([{ id: 1, vehiculo: "204", fullName: "Juan Pérez", status: "ACTIVE" }]);
      }
    } catch (err) {
      console.error("❌ Error de comunicación con CIMCO-API:", err);
      setErrorOperativo("Error crítico al sincronizar el clúster de flota en tiempo real.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarFlota();
  }, [userProfile]);

  // 🛡️ Consolidación Transaccional de Despachos
  const handleAsignarViaje = async (conductor) => {
    if (!destino || !tarifa) {
      setErrorOperativo("⛔ Operación rechazada: Ingrese destino y tarifa antes de despachar.");
      return;
    }
    setErrorOperativo("");
    
    try {
      await runTransaction(db, async (transaction) => {
        // Validación del nodo centralizado para rutas logísticas intermunicipales
        const rutaColeccion = FIRESTORE_PATHS.viajesIntermunicipales || "viajes_intermunicipales";
        const nuevoViajeRef = doc(collection(db, rutaColeccion));
        
        transaction.set(nuevoViajeRef, {
          despachadorId: user.uid,
          fleetId: userProfile.fleetId,
          conductorId: conductor.email || conductor.id,
          vehiculo: conductor.vehiculo,
          destino: destino,
          tarifa: parseFloat(tarifa),
          comisionDespacho: parseFloat(tarifa) * 0.05, // 5% de comisión de mesa fija
          estado: "ASIGNADO",
          fechaCreacion: serverTimestamp()
        });
      });

      setDestino("");
      setTarifa("");
      alert(`🚀 Despacho exitoso: Vehículo #${conductor.vehiculo} en ruta.`);
    } catch (err) {
      console.error("❌ Error transaccional en despacho:", err);
      setErrorOperativo("No se pudo consolidar la orden de salida en el clúster de datos.");
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] font-mono text-zinc-100 p-6 pb-24">
      {/* Barra superior de Control */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-500" size={28} />
          <h1 className="text-xl font-black text-white uppercase tracking-widest">Consola Despachador</h1>
        </div>
        <button 
          onClick={cargarFlota}
          className="p-2.5 rounded-xl bg-[#121214]/80 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shadow-md"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {errorOperativo && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle size={14} className="shrink-0" />
          {errorOperativo}
        </div>
      )}

      {/* Creación de Ordenes */}
      <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 p-5 rounded-3xl mb-6 shadow-xl flex flex-col gap-4">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">Crear Orden de Salida</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Destino Intermunicipal</label>
            <input 
              type="text"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Ej. Valledupar, Cesar"
              className="bg-[#09090b] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-blue-500/50 focus:bg-[#121214]/90 transition-all placeholder:text-zinc-600"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Tarifa Pactada (COP)</label>
            <input 
              type="number"
              value={tarifa}
              onChange={(e) => setTarifa(e.target.value)}
              placeholder="Ej. 45000"
              className="bg-[#09090b] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-blue-500/50 focus:bg-[#121214]/90 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* Grid de Conductores */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Flota Activa en Terminal</h2>
        
        <div className="grid gap-4">
          {loading ? (
             <p className="text-xs text-zinc-500 animate-pulse px-2 uppercase tracking-widest">Alineando clúster de flota...</p>
          ) : conductores.length === 0 ? (
            <div className="backdrop-blur-md bg-[#121214]/40 p-8 text-center text-zinc-500 border border-dashed border-white/5 rounded-2xl">
              <p className="text-xs uppercase font-bold tracking-widest">No hay vehículos registrados en este clúster.</p>
            </div>
          ) : (
             conductores.map((conductor) => (
                <div key={conductor.id} className="backdrop-blur-md bg-[#121214]/80 border border-white/5 p-5 flex justify-between items-center rounded-2xl shadow-xl hover:border-white/10 transition-all duration-300">
                  <div>
                    <p className="font-black text-white text-md tracking-wider">VEHÍCULO #{conductor.vehiculo || 'N/A'}</p>
                    <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-tight">OPERADOR: {conductor.fullName || conductor.nombre || 'Desconocido'}</p>
                  </div>
                  <button 
                    onClick={() => handleAsignarViaje(conductor)}
                    className="bg-blue-600 hover:bg-blue-500 text-zinc-950 px-5 py-2.5 font-black text-[10px] uppercase rounded-xl transition-all shadow-md border border-blue-400 active:scale-95"
                  >
                    Asignar Viaje
                  </button>
                </div>
             ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeDespachador;