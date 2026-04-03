import React, { useState, useEffect } from 'react';
import { 
  Wallet, Plus, ArrowUpRight, ArrowDownLeft, 
  History, Smartphone, CreditCard, ChevronRight,
  ShieldCheck, Receipt, Zap, Navigation
} from 'lucide-react';
import { 
  getFirestore, collection, onSnapshot, 
  doc, query, where, orderBy 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import ModalFinanciero from '../components/ModalFinanciero';

// ==========================================
// CONFIGURACIÓN Y ECOSISTEMA TAXIA CIMCO
// ==========================================
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Prioridad de AppId: Entorno inyectado > Hardcoded (taxiacimco-app) > Legacy (cimco-v3)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app'; 

const BilleteraPanel = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('recarga');
  const [loading, setLoading] = useState(true);

  // 1. Gestión de Autenticación (Silent Init)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // 2. Suscripción en Tiempo Real (Saldo y Movimientos)
  useEffect(() => {
    if (!user) return;

    // Referencia Maestra: artifacts/[appId]/public/data/usuarios/[uid]
    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid);
    const transRef = collection(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid, 'transacciones');
    const q = query(transRef, orderBy('createdAt', 'desc'));

    // Escucha de Perfil y Saldo
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUserData(snap.data());
      }
      setLoading(false);
    }, (error) => {
      console.error("Error Billetera (User):", error);
      setLoading(false);
    });

    // Escucha de Transacciones
    const unsubTrans = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error Billetera (Trans):", error);
    });

    return () => {
      unsubUser();
      unsubTrans();
    };
  }, [user]);

  /**
   * Identificación visual según lógica de negocio:
   * Detecta 'despacho' para destacar cobros operativos del Despachador.
   */
  const getTransactionStyle = (t) => {
    const detalle = t.detalle?.toLowerCase() || '';
    if (detalle.includes('despacho')) {
      return { 
        icon: <Navigation size={18} />, 
        color: 'text-cyan-500', 
        bg: 'bg-cyan-500/10',
        label: 'SERVICIO ASIGNADO'
      };
    }
    if (t.tipo === 'ingreso') {
      return { 
        icon: <ArrowDownLeft size={18} />, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/10',
        label: 'RECARGA EXITOSA'
      };
    }
    return { 
      icon: <ArrowUpRight size={18} />, 
      color: 'text-rose-500', 
      bg: 'bg-rose-500/10',
      label: 'PAGO PROCESADO'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="font-black italic text-cyan-500 tracking-widest text-xs">ACCEDIENDO A BÓVEDA...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      {/* HEADER DE SALDO DINÁMICO */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 pt-16 border-b border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Saldo Disponible</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black italic tracking-tighter">
                  ${userData?.saldo?.toLocaleString() || '0'}
                </span>
                <span className="text-cyan-500 font-black text-xs uppercase tracking-widest">COP</span>
              </div>
            </div>
            <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
              <Wallet className="text-cyan-500" size={24} />
            </div>
          </div>
          
          <div className="flex gap-3 mt-8">
            <button 
              onClick={() => { setModalType('recarga'); setIsModalOpen(true); }}
              className="flex-1 bg-white text-slate-950 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-white/5"
            >
              <Plus size={16} strokeWidth={3} /> Recargar
            </button>
            <button 
              onClick={() => { setModalType('retiro'); setIsModalOpen(true); }}
              className="flex-1 bg-white/5 border border-white/10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
            >
              <Smartphone size={16} /> Retirar
            </button>
          </div>
        </div>
      </div>

      {/* HISTORIAL DE MOVIMIENTOS EN TIEMPO REAL */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-400">
            <History size={14} /> Movimientos Recientes
          </h2>
          <div className="h-px flex-1 mx-4 bg-white/5"></div>
          <span className="text-[8px] font-black text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded">LIVE</span>
        </div>

        <div className="space-y-3">
          {transactions.length > 0 ? transactions.map((t) => {
            const style = getTransactionStyle(t);
            return (
              <div key={t.id} className="bg-slate-900/50 border border-white/5 p-4 rounded-[1.8rem] flex items-center justify-between group hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${style.bg} ${style.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                    {style.icon}
                  </div>
                  <div>
                    <p className="text-sm font-black italic tracking-tight group-hover:text-cyan-400 transition-colors uppercase">
                      {t.detalle || 'Transacción Sin Nombre'}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      {t.createdAt?.toDate?.()?.toLocaleString() || 'Pendiente de sincronizar'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${t.tipo === 'ingreso' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.tipo === 'ingreso' ? '+' : '-'}${t.monto?.toLocaleString() || '0'}
                  </p>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">
                    {style.label}
                  </p>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[3rem] opacity-50">
              <Receipt size={40} className="mx-auto text-slate-800 mb-4" />
              <p className="text-[10px] font-black text-slate-600 uppercase italic tracking-widest">Sin actividad financiera registrada</p>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER DECORATIVO - ESTILO TERMINAL */}
      <div className="px-8 mt-10">
        <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl flex items-start gap-3">
          <ShieldCheck size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[9px] text-slate-500 leading-relaxed font-bold uppercase">
            Tus transacciones están protegidas por el protocolo de seguridad <span className="text-blue-400">TAXIA CIMCO V3</span>.
            Cualquier anomalía será reportada al Panel de Launch Control.
          </p>
        </div>
      </div>

      <ModalFinanciero 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
        currentBalance={userData?.saldo || 0}
      />
    </div>
  );
};

export default BilleteraPanel;