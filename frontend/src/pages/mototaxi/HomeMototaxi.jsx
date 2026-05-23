// Versión Arquitectura: V8.2 - Blindaje Financiero Proactivo y Liquidación Atómica del 10%
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\mototaxi\HomeMototaxi.jsx
 * Misión: Dashboard operativo del conductor con control de ingresos y radar de ofertas.
 * Ajuste: Se implementa la "Regla de Oro de Aceptación": No se puede aceptar un viaje sin saldo previo para la comisión.
 * Se integra la transacción atómica para la liquidación final del 10% según el valor de la oferta.
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

  // ESTADOS OPERATIVOS
  const [ofertasDisponibles, setOfertasDisponibles] = useState([]);
  const [viajeActivo, setViajeActivo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [mostrandoChat, setMostrandoChat] = useState(false);

  // 🛰️ RADAR DE VIAJES: Escucha ofertas de pasajeros en tiempo real (Path Sagrado)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "artifacts/taxiacimco-app/public/data/viajes"),
      where("estado", "==", "buscando")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ofertas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOfertasDisponibles(ofertas);
    });

    return () => unsubscribe();
  }, [user]);

  // 📡 LISTENER DE VIAJE ACTIVO: Monitorea el estado del servicio asignado al conductor
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "artifacts/taxiacimco-app/public/data/viajes"),
      where("conductorId", "==", user.uid),
      where("estado", "in", ["aceptado", "en_camino", "iniciado"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setViajeActivo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setViajeActivo(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 💬 LISTENER DE CHAT: Terminal de comunicación bidireccional
  useEffect(() => {
    if (!viajeActivo) {
      setMensajes([]);
      return;
    }

    const q = query(
      collection(db, `artifacts/taxiacimco-app/public/data/viajes/${viajeActivo.id}/chats`),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMensajes(msgs);
    });

    return () => unsubscribe();
  }, [viajeActivo]);

  // ⚡ ACCIÓN: ACEPTAR VIAJE (Con Blindaje Financiero Preventivo)
  const aceptarViaje = async (viaje) => {
    const COMISION_PREVISTA = (viaje.oferta || 0) * 0.10;

    // ⚠️ ALERTA DE ARQUITECTURA: Validación de saldo antes de la aceptación
    if ((balance || 0) < COMISION_PREVISTA) {
      alert(`⚠️ BLOQUEO FINANCIERO: Tu saldo ($${balance}) es insuficiente para cubrir la comisión de este viaje ($${COMISION_PREVISTA}). Por favor, recarga tu billetera CIMCO.`);
      return;
    }

    try {
      const viajeRef = doc(db, "artifacts/taxiacimco-app/public/data/viajes", viaje.id);
      await updateDoc(viajeRef, {
        conductorId: user.uid,
        conductorNombre: user.displayName || 'Unidad CIMCO',
        estado: 'aceptado',
        aceptadoEn: serverTimestamp()
      });
      console.log("🚀 Viaje capturado con éxito.");
    } catch (err) {
      console.error("⚠️ ALERTA DE ARQUITECTURA: Fallo en captura de viaje", err);
    }
  };

  // 🏁 ACCIÓN: FINALIZAR VIAJE CON LIQUIDACIÓN ATÓMICA DEL 10%
  const finalizarViaje = async () => {
    if (!viajeActivo) return;

    try {
      await runTransaction(db, async (transaction) => {
        const viajeRef = doc(db, "artifacts/taxiacimco-app/public/data/viajes", viajeActivo.id);
        const walletRef = doc(db, "artifacts/taxiacimco-app/public/data/wallets", user.uid);

        // Obtener estado actual de la billetera en la transacción
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists()) {
          throw new Error("⚠️ Error Crítico: Billetera no encontrada. Operación abortada.");
        }

        const saldoActual = walletDoc.data().balance || 0;
        const valorServicio = viajeActivo.oferta || 0;
        const COMISION_CIMCO = valorServicio * 0.10; 

        // Doble validación de seguridad
        if (saldoActual < COMISION_CIMCO) {
          throw new Error(`❌ Saldo insuficiente para liquidar comisión ($${COMISION_CIMCO}).`);
        }

        // Ejecución de cambios en el Path Sagrado
        transaction.update(viajeRef, {
          estado: 'completado',
          finalizadoEn: serverTimestamp(),
          comisionAplicada: COMISION_CIMCO,
          valorTotal: valorServicio
        });

        transaction.update(walletRef, {
          balance: saldoActual - COMISION_CIMCO,
          ultimaOperacion: 'comision_viaje',
          fechaUltimaOperacion: serverTimestamp()
        });
      });

      console.log("✅ Liquidación exitosa. Comisión del 10% descontada.");
      setMostrandoChat(false);
      
    } catch (err) {
      console.error("❌ Fallo en liquidación atómica:", err);
      alert(err.message || err); 
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !viajeActivo) return;

    try {
      await addDoc(collection(db, `artifacts/taxiacimco-app/public/data/viajes/${viajeActivo.id}/chats`), {
        texto: nuevoMensaje,
        senderId: user.uid,
        senderNombre: user.displayName || 'Conductor',
        timestamp: serverTimestamp()
      });
      setNuevoMensaje('');
    } catch (err) {
      console.error("Error en terminal de chat:", err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-mono">
      {/* HEADER CONDUCTOR - CIBER-NEO-BRUTALISTA */}
      <header className="bg-black border-b-4 border-white p-4 flex justify-between items-center z-50">
        <div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase">Driver <span className="text-yellow-500">Cimco</span></h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]" />
            <span className="text-[8px] font-black uppercase text-zinc-500 italic">Core: {user?.uid?.substring(0,6).toUpperCase()}</span>
          </div>
        </div>
        <div className="bg-zinc-900 border-2 border-white px-3 py-1 flex items-center gap-2 shadow-[3px_3px_0px_0px_#eab308]">
          <Wallet size={16} className="text-yellow-500" />
          <span className="font-black text-sm">${balance?.toLocaleString() || '0'}</span>
        </div>
      </header>

      {/* TERMINAL OPERATIVA */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        
        {!viajeActivo ? (
          <>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Navigation size={12} className="text-yellow-500" /> Radar de Ofertas
            </h2>
            
            {ofertasDisponibles.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-800 p-8 text-center opacity-40">
                <AlertCircle size={32} className="mx-auto mb-2 text-zinc-600" />
                <p className="text-[10px] font-black uppercase tracking-widest">Escaneando Red de La Jagua...</p>
              </div>
            ) : (
              ofertasDisponibles.map((oferta) => (
                <div key={oferta.id} className="bg-black border-4 border-white p-4 shadow-[6px_6px_0px_0px_#fff] active:translate-x-1 active:translate-y-1 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xl font-black text-yellow-500 font-mono italic">${oferta.oferta?.toLocaleString()}</span>
                    <span className="bg-white text-black px-2 py-0.5 text-[8px] font-black uppercase">{oferta.distancia || '0'} KM</span>
                  </div>
                  <p className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-tighter">Pasajero: {oferta.pasajeroNombre}</p>
                  <button 
                    onClick={() => aceptarViaje(oferta)}
                    className="w-full bg-yellow-500 text-black py-3 font-black uppercase italic hover:bg-white transition-colors flex items-center justify-center gap-2 border-2 border-black"
                  >
                    <CheckCircle size={18} /> Capturar Servicio
                  </button>
                </div>
              ))
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-500 text-black p-4 border-4 border-black shadow-[6px_6px_0px_0px_#fff]">
              <div className="flex justify-between items-center mb-2">
                <span className="font-black uppercase text-xs italic tracking-tighter">Misión en curso</span>
                <button 
                  onClick={() => setMostrandoChat(!mostrandoChat)} 
                  className="bg-black text-white p-2 border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                >
                  <MessageSquare size={20} />
                </button>
              </div>
              <p className="text-2xl font-black italic mb-4 uppercase leading-none">Punto: {viajeActivo.pasajeroNombre}</p>
              <div className="grid grid-cols-2 gap-2 font-black text-[10px] uppercase">
                <div className="bg-black/10 p-2 border border-black/20 italic">Ruta: {viajeActivo.distancia} km</div>
                <div className="bg-black/10 p-2 border border-black/20 italic">Bóveda: ${viajeActivo.oferta}</div>
              </div>
            </div>

            <button 
              onClick={finalizarViaje}
              className="w-full bg-white text-black border-4 border-black py-4 font-black uppercase hover:bg-green-500 transition-colors shadow-[6px_6px_0px_0px_#eab308]"
            >
              Finalizar y Cobrar Tasa
            </button>
          </div>
        )}
      </main>

      {/* OVERLAY DE COMUNICACIÓN BRUTALISTA */}
      {mostrandoChat && viajeActivo && (
        <div className="absolute inset-0 bg-black/98 z-[100] flex flex-col p-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b-4 border-white pb-4 mb-4">
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Terminal Chat</h2>
            <button onClick={() => setMostrandoChat(false)} className="text-white hover:text-yellow-500 transition-colors">
              <XCircle size={32}/>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 p-2 scrollbar-hide">
            {mensajes.map((m) => (
              <div key={m.id} className={`flex ${m.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 max-w-[85%] border-2 ${m.senderId === user.uid ? 'bg-yellow-500 text-black border-black shadow-[4px_4px_0_0_#fff]' : 'bg-zinc-900 text-white border-zinc-700 shadow-[-4px_4px_0_0_#333]'}`}>
                  <p className="text-[8px] font-black uppercase opacity-50 mb-1">{m.senderNombre}</p>
                  <p className="text-xs font-bold leading-tight">{m.texto}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={enviarMensaje} className="mt-4 flex gap-2">
            <input 
              className="flex-1 bg-zinc-900 border-2 border-zinc-700 p-3 text-xs font-bold outline-none focus:border-yellow-500 text-white placeholder-zinc-600"
              placeholder="Instrucción de llegada..."
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
            />
            <button type="submit" className="bg-yellow-500 text-black p-3 border-2 border-black hover:bg-white transition-all shadow-[2px_2px_0_0_#fff]">
              <Send size={20} />
            </button>
          </form>
        </div>
      )}

      {/* FOOTER NAVEGACIÓN */}
      <footer className="fixed bottom-0 left-0 w-full bg-black border-t-4 border-white p-4 flex justify-around items-center z-50">
        <button className="text-yellow-500 flex flex-col items-center gap-1 transition-transform active:scale-90">
          <Navigation size={24} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Radar</span>
        </button>
        <button className="text-zinc-700 flex flex-col items-center gap-1 opacity-50 cursor-not-allowed">
          <Clock size={24} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Log</span>
        </button>
        <button className="text-zinc-700 flex flex-col items-center gap-1 opacity-50 cursor-not-allowed">
          <TrendingUp size={24} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Caja</span>
        </button>
      </footer>
    </div>
  );
};

export default HomeMototaxi;