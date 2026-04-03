import React, { useState } from 'react';
import { 
  X, Wallet, ArrowUpCircle, ArrowDownCircle, 
  Smartphone, CreditCard, CheckCircle2, Loader2, Info
} from 'lucide-react';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const ModalFinanciero = ({ isOpen, onClose, type, user, userData, db, appId }) => {
  const [step, setStep] = useState('input'); // input, processing, success
  const [amount, setAmount] = useState('');
  const [metodo, setMetodo] = useState('nequi'); // nequi, transfiya, efectivo

  if (!isOpen) return null;

  const handleAction = async () => {
    if (!amount || parseInt(amount) <= 0) return;
    setStep('processing');

    try {
      const valor = parseInt(amount);
      const transactionRef = collection(db, 'artifacts', appId, 'public', 'data', 'transacciones');
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid);

      if (type === 'recarga') {
        // Lógica de Recarga / Nequi
        await addDoc(transactionRef, {
          userId: user.uid,
          tipo: 'ingreso',
          metodo: metodo,
          monto: valor,
          estado: 'completado',
          detalle: `Recarga vía ${metodo}`,
          createdAt: serverTimestamp()
        });
        await updateDoc(userRef, { saldoWallet: increment(valor) });
      } else {
        // Lógica de Gasto / Retiro
        if ((userData?.saldoWallet || 0) < valor) {
          throw new Error("Saldo insuficiente");
        }
        await addDoc(transactionRef, {
          userId: user.uid,
          tipo: 'egreso',
          monto: valor,
          estado: 'completado',
          detalle: 'Retiro/Gasto de billetera',
          createdAt: serverTimestamp()
        });
        await updateDoc(userRef, { saldoWallet: increment(-valor) });
      }

      setStep('success');
      setTimeout(() => {
        onClose();
        setStep('input');
        setAmount('');
      }, 2000);

    } catch (err) {
      console.error(err);
      setStep('input');
      alert(err.message || "Error en la transacción");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${type === 'recarga' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
              {type === 'recarga' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
            </div>
            <h3 className="text-sm font-black uppercase italic tracking-tighter">
              {type === 'recarga' ? 'Recargar Billetera' : 'Gasto / Retiro'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 'input' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Ingresa el monto</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black text-cyan-500">$</span>
                  <input 
                    type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent text-5xl font-black w-full text-center outline-none tracking-tighter placeholder:text-slate-800"
                  />
                </div>
              </div>

              {type === 'recarga' && (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setMetodo('nequi')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${metodo === 'nequi' ? 'bg-white text-slate-950 border-white' : 'bg-slate-800/50 border-white/5 text-slate-500'}`}
                  >
                    <Smartphone size={18} />
                    <span className="text-[9px] font-black uppercase">Nequi</span>
                  </button>
                  <button 
                    onClick={() => setMetodo('transfiya')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${metodo === 'transfiya' ? 'bg-white text-slate-950 border-white' : 'bg-slate-800/50 border-white/5 text-slate-500'}`}
                  >
                    <CreditCard size={18} />
                    <span className="text-[9px] font-black uppercase">TransfiYa</span>
                  </button>
                </div>
              )}

              <button 
                onClick={handleAction}
                className={`w-full py-5 rounded-2xl font-black uppercase italic text-[11px] tracking-[0.2em] transition-all shadow-xl ${type === 'recarga' ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'}`}
              >
                Confirmar Operación
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center">
              <Loader2 size={48} className="text-cyan-500 animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Procesando pago seguro...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 flex flex-col items-center animate-in zoom-in duration-300">
              <CheckCircle2 size={60} className="text-emerald-500 mb-4" />
              <p className="text-lg font-black uppercase italic tracking-tighter">¡Transacción Exitosa!</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase mt-2">El saldo se ha actualizado</p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-6 bg-black/20 flex items-center gap-3">
          <Info size={14} className="text-cyan-500" />
          <p className="text-[8px] text-slate-400 leading-tight uppercase font-bold">
            Esta transacción está protegida por el sistema de seguridad encriptada de CIMCO V3.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModalFinanciero;