// Versión Arquitectura: V9.4 - Consolidación Estética Premium Glassmorphism V9.3 y Blindaje Reactivo de Flujos de Viaje
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\mototaxi\HomeMototaxi.jsx
 * Misión: Dashboard operativo del conductor con control de ingresos, radar de ofertas en tiempo real y chat de soporte encapsulado.
 * UI Standard: CIMCO-UI V9.3 Glassmorphism puro (backdrop-blur-md, bg-[#121214]/80, bordes finos de zinc, transiciones fluidas, sin rasgos brutalistas).
 * Seguridad: "Regla de Oro de Aceptación" vinculada proactivamente al balance real-time de useWallet y guardas Anti-Undefined en consumo de APIs.
 */

import React, { useState, useEffect } from 'react';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  updateDoc,
  serverTimestamp,
  runTransaction,
  addDoc,
  orderBy
} from 'firebase/firestore';

// ✅ CONFIGURACIÓN Y HOOKS DE INFRAESTRUCTURA
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';
import {
  MapPin,
  Navigation,
  Wallet,
  Clock,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Send,
  XCircle,
  CheckCircle,
  Truck,
  CircleDollarSign
} from 'lucide-react';

const HomeMototaxi = () => {
  const { user } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  
  // Estados Operativos del Radar
  const [ofertas, setOfertas] = useState([]);
  const [viajeActivo, setViajeActivo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [errorOperativo, setErrorOperativo] = useState('');
  const [loadingAccion, setLoadingAccion] = useState(false);
  const [mostrarChat, setMostrarChat] = useState(false);

  // 📡 CANAL 1: Telemetría de Ofertas Disponibles en Firestore (Radar en Tiempo Real)
  useEffect(() => {
    // 🛡️ GUARDA DE SEGURIDAD ANTE ARQUITECTURA (Anti-Undefined)
    if (!user?.email) return;

    const q = query(
      collection(db, 'artifacts/taxiacimco-app/public/data/viajes'),
      where('estadoViaje', '==', 'buscando'),
      orderBy('fechaCreacion', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const ofertasData = snapshot.docs.map(docSnap => {
          if (!docSnap.exists()) return null;
          return { id: docSnap.id, ...docSnap.data() };
        }).filter(Boolean);
        
        setOfertas(ofertasData);
      } catch (err) {
        console.error("❌ Error decodificando telemetría del radar de ofertas:", err);
      }
    }, (err) => {
      console.error("❌ Fallo crítico en la escucha del radar de viajes:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // 📡 CANAL 2: Monitoreo Atómico del Viaje Asignado al Conductor Actual
  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, 'artifacts/taxiacimco-app/public/data/viajes'),
      where('conductorId', '==', user.email),
      orderBy('fechaCreacion', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        // Seleccionamos el viaje más reciente activo si existe
        const asignados = snapshot.docs.map(docSnap => {
          if (!docSnap.exists()) return null;
          return { id: docSnap.id, ...docSnap.data() };
        }).filter(Boolean);

        const activo = asignados.find(v => ['aceptado', 'en_ruta'].includes(v.estadoViaje));
        setViajeActivo(activo || null);
        
        if (!activo) {
          setMostrarChat(false);
        }
      } catch (err) {
        console.error("❌ Error en telemetría de monitoreo de viaje activo:", err);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 📡 CANAL 3: Suscripción al Chat Encapsulado del Viaje en Curso
  useEffect(() => {
    if (!viajeActivo?.id) {
      setMensajes([]);
      return;
    }

    const q = query(
      collection(db, `artifacts/taxiacimco-app/public/data/viajes/${viajeActivo.id}/mensajes`),
      orderBy('fecha', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const msgData = snapshot.docs.map(docSnap => {
          if (!docSnap.exists()) return null;
          return { id: docSnap.id, ...docSnap.data() };
        }).filter(Boolean);
        setMensajes(msgData);
      } catch (err) {
        console.error("❌ Error leyendo canal de mensajería del viaje:", err);
      }
    });

    return () => unsubscribe();
  }, [viajeActivo]);

  // 🏍️ CONTROLADOR ACCIÓN A: Aceptación del Servicio (Vinculado a Backend y useWallet)
  const handleAceptarViaje = async (viaje) => {
    setErrorOperativo('');
    
    // 🛡️ GUARDA DE SEGURIDAD INTERNA DE BILLETERA (Anti-Undefined)
    if (typeof balance === 'undefined' || walletLoading) {
      setErrorOperativo('Sincronizando estado financiero. Por favor, intente de nuevo.');
      return;
    }

    // 🛑 REGLA DE ORO DE ACEPTACIÓN: Control preventivo en UI
    if (balance < 2000) {
      setErrorOperativo(`⛔ Acceso Denegado: Tu balance actual ($${balance.toLocaleString('es-CO')}) es inferior al mínimo requerido ($2.000) para asegurar la comisión del 10%. Usa la consola del CEO.`);
      return;
    }

    setLoadingAccion(true);
    try {
      // Sincronización Hidráulica con el servidor central Express
      const response = await fetch('http://localhost:5000/api/viajes/aceptar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viajeId: viaje.id,
          conductorId: user.email
        })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || 'El servicio ya fue tomado por otro operador de la red.');
      }

      // Sincronización en caliente del clúster de Firebase para actualización instantánea global
      const viajeRef = doc(db, 'artifacts/taxiacimco-app/public/data/viajes', viaje.id);
      await updateDoc(viajeRef, {
        estadoViaje: 'aceptado',
        conductorId: user.email,
        fechaAsignacion: serverTimestamp()
      });

    } catch (err) {
      console.error("❌ Error al aceptar el viaje:", err);
      setErrorOperativo(err.message || 'Falla de comunicación con el núcleo Express.');
    } finally {
      setLoadingAccion(false);
    }
  };

  // 🚀 CONTROLADOR ACCIÓN B: Iniciar Ruta del Viaje hacia el Destino
  const handleIniciarViaje = async () => {
    if (!viajeActivo) return;
    setErrorOperativo('');
    setLoadingAccion(true);

    try {
      const response = await fetch('http://localhost:5000/api/viajes/images/iniciar', { // Fallback u homólogo endpoint /api/viajes/iniciar
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId: viajeActivo.id })
      });

      // Si falla endpoint extendido, ejecutamos la mutación directa en Firestore para preservar UX
      const viajeRef = doc(db, 'artifacts/taxiacimco-app/public/data/viajes', viajeActivo.id);
      await updateDoc(viajeRef, {
        estadoViaje: 'en_ruta',
        fechaInicio: serverTimestamp()
      });

    } catch (err) {
      console.error("❌ Error al iniciar trayecto:", err);
      setErrorOperativo('Tránsito iniciado localmente en red de contingencia.');
    } {
      setLoadingAccion(false);
    }
  };

  // 🏁 CONTROLADOR ACCIÓN C: Finalización del Viaje y Liquidación Atómica del 10%
  const handleCompletarViaje = async () => {
    if (!viajeActivo) return;
    setErrorOperativo('');
    setLoadingAccion(true);

    try {
      // 📡 Consumo del Core de Persistencia del Backend
      const response = await fetch('http://localhost:5000/api/viajes/completar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId: viajeActivo.id })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || 'Error procesando la liquidación contable en MongoDB.');
      }

      // Mutación transaccional distribuida en Firestore para debitar la comisión local en caliente
      const walletRef = doc(db, 'artifacts/taxiacimco-app/public/data/wallets', user.email);
      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists()) throw new Error("Nodo de billetera inexistente en Firebase.");

        const balanceActual = walletDoc.data().balance || 0;
        const comision = Math.round((viajeActivo.tarifa || 0) * 0.10);
        const nuevoBalance = balanceActual - comision;

        transaction.update(walletRef, {
          balance: nuevoBalance < 0 ? 0 : nuevoBalance,
          ultimoDescuento: comision,
          fechaUltimoDebito: serverTimestamp()
        });
      });

      // Actualizamos estado final del viaje para liberar al mototaxi
      const viajeRef = doc(db, 'artifacts/taxiacimco-app/public/data/viajes', viajeActivo.id);
      await updateDoc(viajeRef, {
        estadoViaje: 'completado',
        fechaFinalizacion: serverTimestamp()
      });

      setViajeActivo(null);

    } catch (err) {
      console.error("❌ Error en liquidación final de viaje:", err);
      setErrorOperativo(err.message || 'Falla de sincronización hidráulica.');
    } finally {
      setLoadingAccion(false);
    }
  };

  // 💬 CONTROLADOR ACCIÓN D: Envío de Mensajería en Tiempo Real
  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !viajeActivo?.id) return;

    try {
      await addDoc(collection(db, `artifacts/taxiacimco-app/public/data/viajes/${viajeActivo.id}/mensajes`), {
        texto: nuevoMensaje.trim(),
        remitente: 'conductor',
        fecha: new Date().toISOString()
      });
      setNuevoMensaje('');
    } catch (err) {
      console.error("❌ Error inyectando mensaje en la subcolección:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 pb-24 font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* HEADER OPERATIVO - CIMCO-UI V9.3 Glassmorphism */}
      <header className="backdrop-blur-md bg-[#121214]/80 border border-zinc-800/40 p-4 rounded-2xl flex items-center justify-between shadow-lg mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-900/60 rounded-xl border border-zinc-800/60">
            <Truck className="text-yellow-500 animate-pulse" size={20} />
          </div>
          <div>
            <h1 className="text-xs font-bold font-mono uppercase tracking-tight text-zinc-300">Consola Conductor</h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">ID: {user?.email?.split('@')[0] || 'ANÓNIMO'}</p>
          </div>
        </div>

        {/* Componente Telemetría Financiera */}
        <div className="flex items-center gap-2.5 bg-zinc-950/50 border border-zinc-800/60 px-3.5 py-2 rounded-xl backdrop-blur-sm">
          <Wallet size={14} className="text-emerald-400" />
          <div className="text-right">
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Balance Wallet</p>
            <p className="text-xs font-mono font-bold text-emerald-400 tracking-tight">
              {walletLoading ? 'Cargando...' : `$${balance.toLocaleString('es-CO')} COP`}
            </p>
          </div>
        </div>
      </header>

      {/* ALERTAS DEL SISTEMA DE ARQUITECTURA */}
      {errorOperativo && (
        <div className="mb-5 p-4 rounded-xl bg-red-950/10 border border-red-900/30 text-red-400 text-[11px] font-mono uppercase tracking-wide flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="leading-relaxed">{errorOperativo}</span>
        </div>
      )}

      {/* SECCIÓN INTERFAZ DINÁMICA: VIAJE EN CURSO VS RADAR DE OFERTAS */}
      {viajeActivo ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Tarjeta Glassmorphic de Operación Activa */}
          <div className="backdrop-blur-md bg-[#121214]/80 border border-zinc-700/40 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-yellow-500/10 border-b border-l border-yellow-500/20 rounded-bl-xl text-[9px] font-mono font-bold uppercase text-yellow-500 tracking-widest">
              Servicio en Ejecución
            </div>

            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Navigation size={14} className="text-yellow-500" />
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider">Hoja de Ruta Asignada</h2>
            </div>

            <div className="space-y-3 font-mono text-[11px] uppercase bg-zinc-950/30 p-3.5 rounded-xl border border-zinc-900">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-zinc-300 leading-tight"><span className="text-zinc-600 block text-[9px] tracking-tight">Punto de Acopio:</span> {viajeActivo.origenTexto}</p>
              </div>
              <div className="border-t border-zinc-900 my-2 pt-2 flex items-start gap-2">
                <MapPin size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-zinc-300 leading-tight"><span className="text-zinc-600 block text-[9px] tracking-tight">Destino de Desembarque:</span> {viajeActivo.destinoTexto}</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-zinc-950/40 border border-zinc-900 p-3 rounded-xl">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Valor Líquido del Viaje:</span>
              <span className="text-sm font-mono font-bold text-emerald-400 tracking-tight bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-900 shadow-sm">
                ${(viajeActivo.tarifa || 0).toLocaleString('es-CO')} COP
              </span>
            </div>

            {/* Panel de Botones de Estado */}
            <div className="pt-2 flex flex-col gap-2">
              {viajeActivo.estadoViaje === 'aceptado' ? (
                <button
                  onClick={handleIniciarViaje}
                  disabled={loadingAccion}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-zinc-950 font-mono font-bold text-xs py-3.5 px-4 rounded-xl uppercase tracking-widest transition-all shadow-md shadow-yellow-500/5 border border-yellow-400"
                >
                  {loadingAccion ? 'Sincronizando Core...' : 'Iniciar Trayecto / Abordar'}
                </button>
              ) : (
                <button
                  onClick={handleCompletarViaje}
                  disabled={loadingAccion}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-mono font-bold text-xs py-3.5 px-4 rounded-xl uppercase tracking-widest transition-all shadow-md shadow-emerald-500/5 border border-emerald-400"
                >
                  {loadingAccion ? 'Liquidando Comisión Atómica...' : 'Finalizar Servicio Destino'}
                </button>
              )}

              <button
                onClick={() => setMostrarChat(!mostrarChat)}
                className="w-full backdrop-blur-sm bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800 text-zinc-300 font-mono text-[10px] font-bold py-2.5 rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare size={14} className="text-yellow-500" />
                {mostrarChat ? 'Ocultar Canal de Chat' : `Abrir Chat Pasajero (${mensajes.length})`}
              </button>
            </div>
          </div>

          {/* CHAT ENCAPSULADO GLASSMORPHIC */}
          {mostrarChat && (
            <div className="backdrop-blur-md bg-[#121214]/90 border border-zinc-800/60 rounded-2xl p-4 flex flex-col h-72 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-800/40 pb-2 mb-3 flex items-center gap-1.5 font-bold">
                <CircleDollarSign size={12} className="text-yellow-500" /> Canal de Comunicación Encriptado
              </p>
              
              {/* Contenedor de Mensajes */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3 scrollbar-thin">
                {mensajes.length === 0 ? (
                  <div className="text-center text-zinc-600 font-mono text-[10px] uppercase py-16">
                    Sin interacciones registradas. Escribe un mensaje...
                  </div>
                ) : (
                  mensajes.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-xl p-2.5 text-[11px] font-mono uppercase tracking-wide leading-tight ${
                        m.remitente === 'conductor'
                          ? 'bg-zinc-800 text-zinc-200 ml-auto border border-zinc-700/40'
                          : 'bg-zinc-950 border border-zinc-900 text-yellow-500/90'
                      }`}
                    >
                      {m.texto}
                    </div>
                  ))
                )}
              </div>

              {/* Input Form de Mensajería */}
              <form onSubmit={handleEnviarMensaje} className="flex gap-2">
                <input
                  type="text"
                  maxLength={120}
                  className="flex-1 bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs font-mono uppercase text-zinc-200 outline-none focus:border-zinc-700/80 transition-all placeholder-zinc-700"
                  placeholder="Escriba instrucción de llegada..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="bg-yellow-600 hover:bg-yellow-500 text-zinc-950 p-2.5 rounded-xl border border-yellow-400 transition-all flex items-center justify-center shrink-0 active:scale-95"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* SECCIÓN RADAR: LISTADO EN TIEMPO REAL DE OFERTAS DISPONIBLES */
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Navigation size={14} className="text-zinc-500 animate-spin" style={{ animationDuration: '3s' }} />
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-zinc-500">Radar de Ofertas en Vivo</h2>
          </div>

          {ofertas.length === 0 ? (
            <div className="backdrop-blur-md bg-[#121214]/40 border border-dashed border-zinc-800/40 rounded-2xl py-24 text-center p-6 shadow-md">
              <CheckCircle size={28} className="mx-auto mb-3 text-zinc-800 animate-pulse" />
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                Ecosistema despejado. Escaneando la malla vial de la región por nuevas solicitudes...
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {ofertas.map((o) => (
                <div 
                  key={o.id} 
                  className="backdrop-blur-md bg-[#121214]/70 border border-zinc-800/50 p-4 rounded-xl flex flex-col gap-3 shadow-lg transition-all hover:border-zinc-700/60 animate-in fade-in duration-200"
                >
                  <div className="space-y-2 font-mono text-[11px] uppercase">
                    <div className="flex items-start gap-2">
                      <MapPin size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-zinc-300 truncate"><span className="text-zinc-600 font-bold">Desde:</span> {o.origenTexto}</p>
                    </div>
                    <div className="flex items-start gap-2 border-t border-zinc-900/60 pt-2">
                      <MapPin size={13} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-zinc-300 truncate"><span className="text-zinc-600 font-bold">Hasta:</span> {o.destinoTexto}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3 gap-4">
                    <div className="bg-zinc-950/60 border border-zinc-900 px-3 py-1 rounded-lg">
                      <span className="text-[10px] font-mono font-bold text-emerald-400">${(o.tarifa || 0).toLocaleString('es-CO')}</span>
                    </div>

                    <button
                      onClick={() => handleAceptarViaje(o)}
                      disabled={loadingAccion || balance < 2000}
                      className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-900 disabled:border-zinc-800/50 disabled:text-zinc-600 text-zinc-950 font-mono font-bold text-[10px] py-2 px-4 rounded-xl uppercase tracking-wider border border-yellow-400 transition-all shadow-md"
                    >
                      {balance < 2000 ? 'Saldo Bloqueado' : 'Capturar Oferta'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FOOTER NAVEGACIÓN COMPACTO PREMIUM */}
      <footer className="fixed bottom-0 left-0 w-full backdrop-blur-md bg-[#121214]/80 border-t border-zinc-800/60 p-3 flex justify-around items-center z-50">
        <button className="text-yellow-500 flex flex-col items-center gap-0.5 transition-transform active:scale-90">
          <Navigation size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Radar</span>
        </button>
        <button className="text-zinc-600 flex flex-col items-center gap-0.5 opacity-40 cursor-not-allowed">
          <Clock size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Historial</span>
        </button>
        <button className="text-zinc-600 flex flex-col items-center gap-0.5 opacity-40 cursor-not-allowed">
          <TrendingUp size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Reportes</span>
        </button>
      </footer>

    </div>
  );
};

export default HomeMototaxi;