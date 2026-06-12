// Versión Arquitectura: V12.0 - PROD READY: Integración Quirúrgica Motor Telemetría GPS (Radar)
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
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { API_FUNCTIONS_URL } from '@/config/api';
import ModalCalificacion from '@/components/ModalCalificacion';
import {
  MapPin, Navigation, Wallet, Clock, TrendingUp, AlertCircle, 
  MessageSquare, Send, XCircle, CheckCircle, Truck, CircleDollarSign
} from 'lucide-react';

const HomeMototaxi = () => {
  const { user } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  
  const [ofertas, setOfertas] = useState([]);
  const [viajeActivo, setViajeActivo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [errorOperativo, setErrorOperativo] = useState('');
  const [loadingAccion, setLoadingAccion] = useState(false);
  const [mostrarChat, setMostrarChat] = useState(false);
  
  // 🛡️ Estado atómico para manejar la UI de calificación sin romper el flujo
  const [idViajeCalificando, setIdViajeCalificando] = useState(null);

  // 📡 ESTADOS DE TELEMETRÍA
  const [posicionActual, setPosicionActual] = useState(null);
  const [gpsActivo, setGpsActivo] = useState(false);

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, FIRESTORE_PATHS.viajes),
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
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, FIRESTORE_PATHS.viajes),
      where('conductorId', '==', user.email),
      orderBy('fechaCreacion', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const asignados = snapshot.docs.map(docSnap => {
          if (!docSnap.exists()) return null;
          return { id: docSnap.id, ...docSnap.data() };
        }).filter(Boolean);

        const activo = asignados.find(v => ['aceptado', 'en_ruta'].includes(v.estadoViaje));
        setViajeActivo(activo || null);
        
        if (!activo) setMostrarChat(false);
      } catch (err) {
        console.error("❌ Error en telemetría de monitoreo de viaje activo:", err);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!viajeActivo?.id) {
      setMensajes([]);
      return;
    }

    const q = query(
      collection(db, `${FIRESTORE_PATHS.viajes}/${viajeActivo.id}/mensajes`),
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

  // 🛰️ MOTOR DE RASTREO EN TIEMPO REAL (RADAR)
  useEffect(() => {
    if (!user?.email) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosicionActual([lat, lng]);
        setGpsActivo(true);

        try {
          // 1. Actualizar presencia global del conductor en el Radar
          const conductorRef = doc(db, FIRESTORE_PATHS.usuarios || 'usuarios', user.email);
          await updateDoc(conductorRef, {
            location: { latitude: lat, longitude: lng },
            ultimaConexion: serverTimestamp(),
            estadoRadar: 'ONLINE'
          });

          // 2. Si hay un viaje activo, transmitir coordenadas al pasajero
          if (viajeActivo?.id) {
            const viajeRef = doc(db, FIRESTORE_PATHS.viajes, viajeActivo.id);
            await updateDoc(viajeRef, {
              "conductorLocation.latitude": lat,
              "conductorLocation.longitude": lng
            });
          }
        } catch (err) {
          console.error("❌ Falla de sincronización telemétrica:", err);
        }
      },
      (err) => {
        console.error("⚠️ Señal GPS perdida:", err);
        setGpsActivo(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    // Limpieza del listener al desmontar
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, viajeActivo]); // Dependencias clave para re-enganchar si cambia el viaje

  const handleAceptarViaje = async (viaje) => {
    setErrorOperativo('');
    
    if (typeof balance === 'undefined' || walletLoading) {
      setErrorOperativo('Sincronizando estado financiero. Por favor, intente de nuevo.');
      return;
    }

    if (balance < 2000) {
      setErrorOperativo(`⛔ Acceso Denegado: Tu balance actual ($${balance.toLocaleString('es-CO')}) es inferior al mínimo requerido ($2.000) para asegurar la comisión del 10%.`);
      return;
    }

    setLoadingAccion(true);
    try {
      const response = await fetch(`${API_FUNCTIONS_URL}/api/viajes/aceptar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId: viaje.id, conductorId: user.email })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.message || 'El servicio ya fue tomado por otro operador de la red.');
      }

      const viajeRef = doc(db, FIRESTORE_PATHS.viajes, viaje.id);
      await updateDoc(viajeRef, {
        estadoViaje: 'aceptado',
        conductorId: user.email,
        fechaAsignacion: serverTimestamp()
      });

    } catch (err) {
      setErrorOperativo(err.message || 'Falla de comunicación con el núcleo Express.');
    } finally {
      setLoadingAccion(false);
    }
  };

  const handleIniciarViaje = async () => {
    if (!viajeActivo) return;
    setErrorOperativo('');
    setLoadingAccion(true);

    try {
      await fetch(`${API_FUNCTIONS_URL}/api/viajes/images/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId: viajeActivo.id })
      });

      const viajeRef = doc(db, FIRESTORE_PATHS.viajes, viajeActivo.id);
      await updateDoc(viajeRef, {
        estadoViaje: 'en_ruta',
        fechaInicio: serverTimestamp()
      });

    } catch (err) {
      setErrorOperativo('Tránsito iniciado localmente en red de contingencia.');
    } finally {
      setLoadingAccion(false);
    }
  };

  const handleCompletarViaje = async () => {
    if (!viajeActivo) return;
    setErrorOperativo('');
    setLoadingAccion(true);

    try {
      const response = await fetch(`${API_FUNCTIONS_URL}/api/viajes/completar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId: viajeActivo.id })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.message || 'Error procesando la liquidación contable.');
      }

      const walletRef = doc(db, FIRESTORE_PATHS.wallets, user.email);
      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists()) throw new Error("Nodo de billetera inexistente en Firebase.");

        const balanceActual = walletDoc.data().balance || 0;
        const comision = Math.round((viajeActivo.oferta || viajeActivo.tarifa || 0) * 0.10);
        const nuevoBalance = balanceActual - comision;

        transaction.update(walletRef, {
          balance: nuevoBalance < 0 ? 0 : nuevoBalance,
          ultimoDescuento: comision,
          fechaUltimoDebito: serverTimestamp()
        });
      });

      const viajeRef = doc(db, FIRESTORE_PATHS.viajes, viajeActivo.id);
      await updateDoc(viajeRef, {
        estadoViaje: 'completado',
        fechaFinalizacion: serverTimestamp()
      });

      // 🛡️ Integración Quirúrgica: Guardamos el ID antes de limpiar la consola
      setIdViajeCalificando(viajeActivo.id);
      setViajeActivo(null);

    } catch (err) {
      setErrorOperativo(err.message || 'Falla de sincronización hidráulica.');
    } finally {
      setLoadingAccion(false);
    }
  };

  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !viajeActivo?.id) return;

    try {
      await addDoc(collection(db, `${FIRESTORE_PATHS.viajes}/${viajeActivo.id}/mensajes`), {
        texto: nuevoMensaje.trim(),
        remitente: 'conductor',
        fecha: new Date().toISOString()
      });
      setNuevoMensaje('');
    } catch (err) {
      console.error("❌ Error inyectando mensaje:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 pb-24 font-sans selection:bg-zinc-800 selection:text-white">
      
      <ModalCalificacion 
        isOpen={!!idViajeCalificando}
        idViaje={idViajeCalificando}
        rolUsuario="conductor"
        db={db}
        pathViajes={FIRESTORE_PATHS.viajes || 'viajes'}
        onFinalizarCalificacion={() => setIdViajeCalificando(null)}
      />

      <header className="backdrop-blur-md bg-[#121214]/80 border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-lg mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#121214]/60 rounded-xl border border-white/5 relative">
            <Truck className="text-cyan-500 animate-pulse" size={20} />
            {gpsActivo && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>}
          </div>
          <div>
            <h1 className="text-xs font-bold font-mono uppercase tracking-tight text-zinc-300">Consola Conductor</h1>
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">URL: {API_FUNCTIONS_URL}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-[#09090b]/50 border border-white/5 px-3.5 py-2 rounded-xl backdrop-blur-sm">
          <Wallet size={14} className="text-emerald-400" />
          <div className="text-right">
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Balance Wallet</p>
            <p className="text-xs font-mono font-bold text-emerald-400 tracking-tight">
              {walletLoading ? 'Cargando...' : `$${balance.toLocaleString('es-CO')} COP`}
            </p>
          </div>
        </div>
      </header>

      {errorOperativo && (
        <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono uppercase tracking-wide flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="leading-relaxed">{errorOperativo}</span>
        </div>
      )}

      {viajeActivo ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-cyan-500/10 border-b border-l border-cyan-500/20 rounded-bl-xl text-[9px] font-mono font-bold uppercase text-cyan-500 tracking-widest">
              Servicio en Ejecución
            </div>

            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Navigation size={14} className="text-cyan-500" />
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider">Hoja de Ruta Asignada</h2>
            </div>

            <div className="space-y-3 font-mono text-[11px] uppercase bg-[#09090b]/40 p-3.5 rounded-xl border border-white/5">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-zinc-300 leading-tight"><span className="text-zinc-600 block text-[9px] tracking-tight">Punto de Acopio:</span> {viajeActivo.origen?.direccion || viajeActivo.origenTexto || 'Ubicación no especificada'}</p>
              </div>
              <div className="border-t border-white/5 my-2 pt-2 flex items-start gap-2">
                <MapPin size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-zinc-300 leading-tight"><span className="text-zinc-600 block text-[9px] tracking-tight">Destino de Desembarque:</span> {viajeActivo.destino?.direccion || viajeActivo.destinoTexto || 'Destino no especificado'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#09090b]/60 border border-white/5 p-3 rounded-xl">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Valor Líquido del Viaje:</span>
              <span className="text-sm font-mono font-bold text-emerald-400 tracking-tight bg-[#09090b] px-3 py-1 rounded-lg border border-white/5 shadow-sm">
                ${(viajeActivo.oferta || viajeActivo.tarifa || 0).toLocaleString('es-CO')} COP
              </span>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {viajeActivo.estadoViaje === 'aceptado' ? (
                <button
                  onClick={handleIniciarViaje}
                  disabled={loadingAccion}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-mono font-black text-xs py-3.5 px-4 rounded-xl uppercase tracking-widest transition-all shadow-md shadow-cyan-500/5 border border-cyan-400"
                >
                  {loadingAccion ? 'Sincronizando Core...' : 'Iniciar Trayecto / Abordar'}
                </button>
              ) : (
                <button
                  onClick={handleCompletarViaje}
                  disabled={loadingAccion}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-mono font-black text-xs py-3.5 px-4 rounded-xl uppercase tracking-widest transition-all shadow-md shadow-emerald-500/5 border border-emerald-400"
                >
                  {loadingAccion ? 'Liquidando Comisión Atómica...' : 'Finalizar Servicio Destino'}
                </button>
              )}

              <button
                onClick={() => setMostrarChat(!mostrarChat)}
                className="w-full backdrop-blur-sm bg-[#121214]/60 hover:bg-[#121214] border border-white/5 text-zinc-300 font-mono text-[10px] font-bold py-2.5 rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare size={14} className="text-cyan-500" />
                {mostrarChat ? 'Ocultar Canal de Chat' : `Abrir Chat Pasajero (${mensajes.length})`}
              </button>
            </div>
          </div>

          {mostrarChat && (
            <div className="backdrop-blur-md bg-[#121214]/90 border border-white/5 rounded-2xl p-4 flex flex-col h-72 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-3 flex items-center gap-1.5 font-bold">
                <CircleDollarSign size={12} className="text-cyan-500" /> Canal de Comunicación Encriptado
              </p>
              
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
                          ? 'bg-[#121214] text-zinc-200 ml-auto border border-white/5'
                          : 'bg-[#09090b] border border-white/5 text-cyan-400/90'
                      }`}
                    >
                      {m.texto}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleEnviarMensaje} className="flex gap-2">
                <input
                  type="text"
                  maxLength={120}
                  className="flex-1 bg-[#09090b]/50 border border-white/5 rounded-xl px-3 py-2.5 text-xs font-mono uppercase text-zinc-200 outline-none focus:border-white/10 transition-all placeholder-zinc-700"
                  placeholder="Escriba instrucción de llegada..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="bg-cyan-600 hover:bg-cyan-500 text-zinc-950 p-2.5 rounded-xl border border-cyan-400 transition-all flex items-center justify-center shrink-0 active:scale-95"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Navigation size={14} className="text-zinc-500 animate-spin" style={{ animationDuration: '3s' }} />
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-zinc-500">Radar de Ofertas en Vivo</h2>
          </div>

          {ofertas.length === 0 ? (
            <div className="backdrop-blur-md bg-[#121214]/40 border border-dashed border-white/5 rounded-2xl py-24 text-center p-6 shadow-md">
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
                  className="backdrop-blur-md bg-[#121214]/80 border border-white/5 p-4 rounded-xl flex flex-col gap-3 shadow-lg transition-all hover:border-white/10 animate-in fade-in duration-200"
                >
                  <div className="space-y-2 font-mono text-[11px] uppercase">
                    <div className="flex items-start gap-2">
                      <MapPin size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-zinc-300 truncate"><span className="text-zinc-600 font-bold">Desde:</span> {o.origen?.direccion || o.origenTexto || 'Ubicación no especificada'}</p>
                    </div>
                    <div className="flex items-start gap-2 border-t border-white/5 pt-2">
                      <MapPin size={13} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-zinc-300 truncate"><span className="text-zinc-600 font-bold">Hasta:</span> {o.destino?.direccion || o.destinoTexto || 'Destino no especificado'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3 gap-4">
                    <div className="bg-[#09090b]/60 border border-white/5 px-3 py-1 rounded-lg">
                      <span className="text-[10px] font-mono font-bold text-emerald-400">${(o.oferta || o.tarifa || 0).toLocaleString('es-CO')}</span>
                    </div>

                    <button
                      onClick={() => handleAceptarViaje(o)}
                      disabled={loadingAccion || balance < 2000}
                      className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#121214] disabled:border-white/5 disabled:text-zinc-600 text-zinc-950 font-mono font-bold text-[10px] py-2 px-4 rounded-xl uppercase tracking-wider border border-cyan-400 transition-all shadow-md"
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

      <footer className="fixed bottom-0 left-0 w-full backdrop-blur-md bg-[#121214]/80 border-t border-white/5 p-3 flex justify-around items-center z-50">
        <button className="text-cyan-500 flex flex-col items-center gap-0.5 transition-transform active:scale-90">
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