// Versión Arquitectura: V2.7 - Corrección de Enrutamiento y Motor de Liquidación Híbrido
// Misión: Resolver Import Analysis, implementar escucha reactiva de ingresos diarios, 
// y ejecutar runTransaction con el Custom Hook de Autenticación.

import React, { useState, useEffect } from 'react';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  updateDoc, 
  serverTimestamp, 
  runTransaction 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { MapPin, Navigation, Wallet, CheckCircle, TrendingUp, Clock } from 'lucide-react';

const HomeMototaxi = () => {
  const { user } = useAuth(); // Dependencia arquitectónica corregida
  const [saldoBilletera, setSaldoBilletera] = useState(0);
  const [ingresosHoy, setIngresosHoy] = useState(0);
  const [viajesDisponibles, setViajesDisponibles] = useState([]);
  const [viajeActivo, setViajeActivo] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. ESCUCHA DE BILLETERA (Saldo Digital)
  useEffect(() => {
    if (!user?.uid) return;
    const walletPath = `artifacts/taxiacimco-app/public/data/wallets/${user.uid}`;
    
    const unsub = onSnapshot(doc(db, walletPath), (docSnap) => {
      if (docSnap.exists()) {
        setSaldoBilletera(docSnap.data().saldo || 0);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // 2. MOTOR DE INGRESOS REACTIVO (Ganancia Hoy)
  useEffect(() => {
    if (!user?.uid) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Inicio del día para resetear el contador diario

    const viajesRef = collection(db, "artifacts/taxiacimco-app/public/data/viajes");
    const q = query(
      viajesRef, 
      where("mototaxiId", "==", user.uid),
      where("estado", "==", "FINALIZADO"), // Usamos el estado en español como definimos antes
      where("finalizadoAt", ">=", hoy)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.forEach((doc) => {
        // Sumamos el valor ofertado por el pasajero a la ganancia del día
        total += doc.data().pago?.tarifaOfertada || doc.data().oferta || 0; 
      });
      setIngresosHoy(total);
    });

    return () => unsub();
  }, [user]);

  // 3. ESCUCHA DE VIAJES DISPONIBLES (Radar de Solicitudes)
  useEffect(() => {
    const viajesRef = collection(db, "artifacts/taxiacimco-app/public/data/viajes");
    const q = query(viajesRef, where("estado", "==", "BUSCANDO")); // Ajustado a la nomenclatura original

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setViajesDisponibles(docs);
    });

    return () => unsub();
  }, []);

  // 4. TRANSACCIÓN ATÓMICA PARA ACEPTAR SERVICIO
  const aceptarViaje = async (viaje) => {
    if (viajeActivo) {
      alert("⚠️ ALERTA: Ya tienes un servicio en curso. Finalízalo primero.");
      return;
    }

    const valorServicio = viaje.pago?.tarifaOfertada || viaje.oferta || 0;
    const comision = valorServicio * 0.10;

    if (saldoBilletera < comision) {
      alert(`❌ Saldo insuficiente. Necesitas $${comision} en tu Billetera App para tomar este servicio.`);
      return;
    }

    const tripRef = doc(db, "artifacts/taxiacimco-app/public/data/viajes", viaje.id);
    const walletRef = doc(db, "artifacts/taxiacimco-app/public/data/wallets", user.uid);
    // Generamos una referencia vacía en la subcolección correcta para inyectarla en la transacción
    const transRef = doc(collection(db, `artifacts/taxiacimco-app/public/data/wallets/${user.uid}/transacciones`));

    try {
      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        const tripDoc = await transaction.get(tripRef);

        if (tripDoc.data().estado !== 'BUSCANDO') throw "El viaje ya fue tomado por otro mototaxi.";

        const saldoActual = walletDoc.data().saldo || 0;
        if (saldoActual < comision) throw "Fondos insuficientes al verificar en el servidor.";

        // OPERACIÓN 1: Descontar comisión (Billetera App)
        transaction.update(walletRef, {
          saldo: saldoActual - comision,
          lastUpdate: serverTimestamp()
        });

        // OPERACIÓN 2: Actualizar Viaje
        transaction.update(tripRef, {
          estado: 'ACEPTADO',
          mototaxiId: user.uid,
          mototaxiNombre: user.displayName || 'Mototaxi CIMCO',
          aceptadoAt: serverTimestamp()
        });

        // OPERACIÓN 3: Registro de Auditoría
        transaction.set(transRef, {
          monto: comision,
          tipo: 'DEBITO_COMISION',
          viajeId: viaje.id,
          concepto: `Comisión 10% - Viaje de ${viaje.pasajeroNombre || 'Pasajero'}`,
          fecha: serverTimestamp(),
          saldoResultante: saldoActual - comision
        });
      });

      setViajeActivo(viaje);
    } catch (e) {
      alert("Error en la transacción financiera: " + e);
    }
  };

  // 5. FINALIZAR VIAJE (Cierre de Ciclo e Impacto de Ganancia)
  const finalizarViaje = async () => {
    if (!viajeActivo) return;

    try {
      const tripRef = doc(db, "artifacts/taxiacimco-app/public/data/viajes", viajeActivo.id);
      
      await updateDoc(tripRef, {
        estado: 'FINALIZADO',
        finalizadoAt: serverTimestamp()
      });

      setViajeActivo(null);
      alert("✅ ¡Servicio Finalizado! Tu ganancia se ha sumado a la caja del día.");
    } catch (err) {
      alert("Error de red al finalizar el servicio.");
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-yellow-500"></div></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans p-4">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 border-b-2 border-yellow-500 pb-2">
        <div>
          <h1 className="text-yellow-500 font-black text-2xl uppercase tracking-tighter">TAXIA CIMCO</h1>
          <p className="text-green-500 text-xs font-bold">CONDUCTOR ONLINE</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs font-bold">ID: {user?.uid.slice(0, 5)}</p>
        </div>
      </div>

      {/* DASHBOARD DE ESTADÍSTICAS (Neo-Brutalismo Híbrido) */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#1A1A1A] border-l-4 border-yellow-500 p-4 shadow-lg border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Wallet size={14} className="text-yellow-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Billetera App</span>
          </div>
          <div className="text-xl font-black text-white">${saldoBilletera.toLocaleString()}</div>
          <div className="text-[8px] text-gray-500 mt-1 uppercase">Para pagar comisiones</div>
        </div>
        
        <div className="bg-[#1A1A1A] border-l-4 border-green-500 p-4 shadow-lg border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <TrendingUp size={14} className="text-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Ganancia Hoy</span>
          </div>
          <div className="text-xl font-black text-white">${ingresosHoy.toLocaleString()}</div>
          <div className="text-[8px] text-gray-500 mt-1 uppercase">Dinero en tu bolsillo</div>
        </div>
      </div>

      {/* ESTADO DE SERVICIO */}
      {viajeActivo ? (
        <div className="bg-yellow-500 text-black p-5 border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] mb-8">
          <div className="flex justify-between items-start mb-4">
            <h2 className="font-black italic uppercase text-xl">Servicio en Curso</h2>
            <div className="bg-black text-white text-[10px] px-2 py-1 font-bold animate-pulse">ACTIVO</div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-2">
              <MapPin size={18} className="mt-1" />
              <div>
                <p className="text-[10px] font-bold opacity-70 uppercase text-black">Pasajero / Destino:</p>
                <p className="font-black text-lg leading-tight uppercase">{viajeActivo.pasajeroNombre} → {viajeActivo.detallesManuales?.destino || viajeActivo.destino}</p>
              </div>
            </div>
            <div className="flex items-center justify-between bg-black/10 p-2 border border-black/20">
              <span className="font-bold uppercase text-sm">Cobrar al usuario:</span>
              <span className="text-2xl font-black">${(viajeActivo.pago?.tarifaOfertada || viajeActivo.oferta || 0).toLocaleString()}</span>
            </div>
          </div>

          <button 
            onClick={finalizarViaje}
            className="w-full bg-black text-white font-black py-4 uppercase border-2 border-black hover:bg-gray-900 transition-all active:scale-95"
          >
            Finalizar y Registrar Ingreso
          </button>
        </div>
      ) : (
        <div className="space-y-4 pb-20">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-yellow-500" />
            <h3 className="font-black uppercase text-xs tracking-tighter text-gray-300">Radar La Jagua</h3>
          </div>

          {viajesDisponibles.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-gray-800 opacity-60">
              <p className="text-sm font-bold text-gray-500 uppercase">Esperando solicitudes...</p>
            </div>
          ) : (
            viajesDisponibles.map((v) => {
              const valorOferta = v.pago?.tarifaOfertada || v.oferta || 0;
              const comisionCalculada = valorOferta * 0.10;
              
              return (
                <div key={v.id} className="bg-[#151515] border-2 border-gray-800 p-4 flex justify-between items-center group hover:border-yellow-500 transition-colors">
                  <div className="flex-1 pr-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                      {v.detallesManuales?.recogida || v.origen || 'Ubicación GPS'}
                    </p>
                    <p className="font-black text-white uppercase tracking-tight mt-1 truncate">
                      {v.detallesManuales?.destino || v.destino}
                    </p>
                    <p className="text-[10px] text-red-400 font-bold mt-1">Comisión App: -${comisionCalculada}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-green-500 mb-2">${valorOferta}</div>
                    <button 
                      onClick={() => aceptarViaje(v)}
                      className="bg-yellow-500 text-black text-[10px] font-black px-6 py-2 uppercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* FOOTER NAV CIBER-NEO-BRUTALISTA */}
      <div className="fixed bottom-0 left-0 w-full bg-[#0A0A0A] border-t-4 border-yellow-500 p-3 flex justify-around items-center z-50">
        <button className="flex flex-col items-center gap-1 text-yellow-500">
          <Navigation size={22} />
          <span className="text-[9px] font-black uppercase">Radar</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors">
          <CheckCircle size={22} />
          <span className="text-[9px] font-black uppercase">Historial</span>
        </button>
      </div>
    </div>
  );
};

export default HomeMototaxi;