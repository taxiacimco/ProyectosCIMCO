// Versión Arquitectura: V3.6 - Sincronización de Contexto de Usuario
/**
 * Componente: BilleteraPanel
 * PROYECTO: TAXIA CIMCO
 * Estética: Ciber-Neo-Brutalista.
 */

import React, { useState, useEffect } from 'react';
import { 
  Wallet, Plus, History, ShieldCheck, Receipt, Zap 
} from 'lucide-react';
import { 
  getFirestore, doc, onSnapshot, collection, 
  query, where, orderBy, limit 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import WompiCheckout from '../components/wallet/WompiCheckout';

const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'taxiacimco-app'; 

const BilleteraPanel = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [rechargeAmount, setRechargeAmount] = useState(20000);
  const [paymentReference, setPaymentReference] = useState('');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setPaymentReference(`TXC-${currentUser.uid.slice(0, 4)}-${Date.now()}`);
        
        // 1. Escuchar datos del perfil (incluye el ROLE)
        onSnapshot(doc(db, `artifacts/${appId}/public/data/usuarios`, currentUser.uid), (snap) => {
          if (snap.exists()) setUserData(snap.data());
        });

        // 2. Escuchar historial de transacciones (Ruta Sagrada)
        const q = query(
          collection(db, `artifacts/${appId}/public/data/historial_recargas`),
          where("targetUid", "==", currentUser.uid),
          orderBy("fecha", "desc"),
          limit(5)
        );
        onSnapshot(q, (snap) => {
          setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans">
      {/* HEADER CARD: SALDO ACTUAL */}
      <header className="bg-slate-900 border-4 border-slate-800 p-8 rounded-[3rem] shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Zap size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Wallet className="text-white" size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Saldo Disponible</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white italic">
            ${userData?.saldoWallet?.toLocaleString() || '0'}
          </h1>
          <div className="mt-4 flex items-center gap-2">
            <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[9px] font-black text-green-400 uppercase">
              Cuenta Verificada
            </span>
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              ID: {user?.uid.slice(0, 8)}...
            </span>
          </div>
        </div>
      </header>

      {/* SECCIÓN DE RECARGA */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Plus size={16} className="text-blue-500" /> Inyectar Capital
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[10000, 20000, 50000, 100000].map(val => (
            <button 
              key={val}
              onClick={() => {
                setRechargeAmount(val);
                setPaymentReference(`TXC-${user?.uid.slice(0, 4)}-${Date.now()}`);
              }}
              className={`py-4 rounded-2xl font-black text-xs border-2 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-1 ${
                rechargeAmount === val 
                ? 'bg-blue-600 border-blue-400 text-white scale-105' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              ${val / 1000}K
            </button>
          ))}
        </div>

        {/* 🚀 COMPONENTE WOMPI: Conexión de Datos Sagrada */}
        <WompiCheckout 
          amount={rechargeAmount} 
          reference={paymentReference}
          userType={userData?.role || 'CONDUCTOR'} 
          onPaymentSuccess={() => alert("¡Recarga procesada exitosamente!")} 
        />
      </section>

      {/* HISTORIAL RECIENTE */}
      <section className="mt-12">
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6 px-2">
          <History size={16} className="text-slate-500" /> Actividad Reciente
        </h2>
        
        <div className="flex flex-col gap-3">
          {transactions.length > 0 ? transactions.map((tx) => (
            <div key={tx.id} className="bg-slate-900/50 border-2 border-slate-800 p-4 rounded-3xl flex items-center justify-between group hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-500">
                  <Zap size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-tighter text-white">Recarga Wompi</p>
                  <p className="text-[8px] font-bold text-slate-600">{new Date(tx.fecha?.toDate()).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black tracking-tighter text-green-500">+${tx.amount?.toLocaleString()}</p>
                <p className="text-[8px] font-black text-slate-600 uppercase italic">CONFIRMADO</p>
              </div>
            </div>
          )) : (
            <div className="py-12 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center opacity-40">
              <Receipt size={32} className="mb-2 text-slate-600" />
              <p className="text-[10px] font-black uppercase tracking-widest">Sin actividad en radar</p>
            </div>
          )}
        </div>
      </section>

      <footer className="mt-12 px-2">
        <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-2xl flex gap-3">
          <ShieldCheck className="text-blue-500 shrink-0" size={18} />
          <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">
            Transacciones encriptadas bajo el estándar <span className="text-blue-400 italic font-black">TAXIA CIMCO V3.6</span>. 
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BilleteraPanel;