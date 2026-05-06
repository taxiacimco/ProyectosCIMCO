// Versión Arquitectura: V5.0 - Motor de Cálculo de Saldo en Tiempo Real (Event Sourcing)
/**
 * ARCHIVO: BilleteraPanel.jsx
 * PROYECTO: TAXIA CIMCO
 * MISIÓN: Interfaz de Billetera. Ahora el saldo se calcula dinámicamente sumando
 * las transacciones confirmadas, eliminando la dependencia de un documento estático.
 */

import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { doc, onSnapshot, getDoc, setDoc, collection, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ✅ ÚNICA FUENTE DE VERDAD: Importamos desde nuestro cerebro central
import { auth, db } from '../firebase/firebaseConfig'; 

import WompiCheckout from '../components/wallet/WompiCheckout';
import TransactionHistory from '../components/wallet/TransactionHistory';

const appId = 'taxiacimco-app'; 

const BilleteraPanel = () => {
  const [user, setUser] = useState(null);
  const [saldoTotal, setSaldoTotal] = useState(0); // ✅ Nuevo estado para el cálculo dinámico
  const [userRole, setUserRole] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState(20000);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // 1. Obtener Perfil y Rol (Mantenemos la lógica de creación original)
        const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        
        let currentRole = 'CONDUCTOR';
        if (profileSnap.exists()) {
          currentRole = profileSnap.data().rol || 'CONDUCTOR';
        } else {
          await setDoc(profileRef, {
            rol: 'CONDUCTOR',
            nombre: currentUser.displayName || 'Piloto CIMCO',
            email: currentUser.email || 'admin@cimco.com',
            fecha_registro: new Date().toISOString(),
            estado: 'activo'
          }, { merge: true });
        }
        
        setUserRole(currentRole);

        // 2. MOTOR DE CÁLCULO DE SALDO (Cerebro Central)
        // Apuntamos a la colección de transacciones para calcular la verdad financiera
        const transaccionesRef = collection(db, 'artifacts', appId, 'public', 'data', 'transacciones');
        
        // Filtramos por targetUid como llave primaria
        const q = query(transaccionesRef, where("targetUid", "==", currentUser.uid)); 

        const unsubSaldo = onSnapshot(q, (querySnapshot) => {
          let acumulado = 0;
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Validamos que la transacción sea válida antes de sumar
            if (data.status === 'COMPLETED' || data.status === 'SUCCESS' || data.status === 'APPROVED') {
              const valor = Number(data.amount) || 0;
              acumulado += valor;
            }
          });
          setSaldoTotal(acumulado);
          setLoading(false);
        });

        return () => unsubSaldo();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handlePaymentAttempt = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center font-mono text-blue-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="uppercase font-black tracking-widest text-xs">Sincronizando con Cerebro Central...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans selection:bg-blue-500/30">
      <header className="bg-slate-900 border-4 border-slate-800 p-8 rounded-[3rem] shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] mb-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <Zap size={120} className="text-blue-500" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
              <Wallet className="text-white" size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Saldo en Tiempo Real</span>
          </div>
          
          <h1 className="text-6xl font-black tracking-tighter text-white italic">
             ${saldoTotal.toLocaleString()}
             <span className="text-blue-500 not-italic ml-2">.</span>
          </h1>
          
          <div className="mt-4 flex items-center gap-2">
            <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[9px] font-black text-green-400 uppercase tracking-widest">
              Cuenta Activa
            </span>
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              CIMCO-ID: {user?.uid.slice(0, 8)}
            </span>
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-6 max-w-2xl">
        <h2 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-2 px-2 text-slate-400">
          <Plus size={16} className="text-blue-500" /> Carga de Créditos
        </h2>
        
        <div className="grid grid-cols-4 gap-3">
          {[10000, 20000, 50000, 100000].map(val => (
            <button 
              key={val}
              onClick={() => setRechargeAmount(val)}
              className={`py-4 rounded-2xl font-black text-xs border-2 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-1 ${
                rechargeAmount === val 
                ? 'bg-blue-600 border-blue-400 text-white scale-105' 
                : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              ${val / 1000}K
            </button>
          ))}
        </div>

        <div className="mt-4" onClick={handlePaymentAttempt}>
          {userRole && (
            <WompiCheckout 
              amount={rechargeAmount} 
              reference={`TXC-${user?.uid?.slice(0,5)}-${Date.now()}`}
              userType={userRole} 
            />
          )}
        </div>
      </section>

      <section className="mt-12 max-w-2xl">
        <TransactionHistory refreshTrigger={refreshTrigger} />
      </section>

      <footer className="mt-12 px-2 max-w-2xl pb-10">
        <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-2xl flex gap-3">
          <ShieldCheck className="text-blue-500 shrink-0" size={18} />
          <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed tracking-wider">
            Transacción Segura vía Nodo Central TAXIA CIMCO.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BilleteraPanel;