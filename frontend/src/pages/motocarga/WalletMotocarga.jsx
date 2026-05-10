// Versión Arquitectura: V1.0 - Pasarela de Recargas Wompi
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, CreditCard, TrendingUp, ShieldCheck } from 'lucide-react';

const WalletMotocarga = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [monto, setMonto] = useState(5000);

    useEffect(() => {
        if (!user) return;
        return onSnapshot(doc(db, `artifacts/taxiacimco-app/public/data/wallets`, user.uid), (snap) => {
            if (snap.exists()) setBalance(snap.data().balance || 0);
        });
    }, [user]);

    const abrirPasarelaWompi = () => {
        const checkout = new WidgetCheckout({
            currency: 'COP',
            amountInCents: monto * 100,
            reference: `RECARGA-${user.uid}-${Date.now()}`,
            publicKey: 'pub_test_tu_llave_aqui', // Reemplazar con tu llave de Wompi
            redirectUrl: 'https://tu-app-cimco.web.app/wallet'
        });
        checkout.open((result) => console.log("Wompi Result:", result));
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 font-mono">
            <div className="border-4 border-yellow-400 p-6 shadow-[8px_8px_0px_0px_#fff]">
                <div className="flex justify-between items-start mb-8">
                    <h1 className="text-3xl font-black italic uppercase">Billetera <span className="text-yellow-400">CIMCO</span></h1>
                    <Wallet size={40} className="text-yellow-400" />
                </div>

                <div className="bg-zinc-900 border-2 border-zinc-800 p-6 mb-8 text-center">
                    <p className="text-zinc-500 font-bold uppercase text-xs mb-2">Saldo Disponible</p>
                    <h2 className="text-5xl font-black text-green-400">${balance.toLocaleString()}</h2>
                </div>

                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-yellow-400 uppercase">Selecciona monto a recargar</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[5000, 10000, 20000].map(val => (
                            <button key={val} onClick={() => setMonto(val)} 
                                className={`p-3 border-2 font-black ${monto === val ? 'bg-yellow-400 text-black border-black' : 'border-zinc-800 text-zinc-500'}`}>
                                ${val/1000}K
                            </button>
                        ))}
                    </div>

                    <button onClick={abrirPasarelaWompi} className="w-full bg-white text-black py-4 font-black uppercase text-lg border-4 border-black shadow-[6px_6px_0px_0px_#facc15] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 mt-4">
                        <CreditCard /> Recargar con Wompi
                    </button>
                </div>

                <div className="mt-8 border-t-2 border-zinc-800 pt-4 flex items-center gap-2 text-zinc-500">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-bold uppercase">Transacción protegida por Wompi & CIMCO-Security</span>
                </div>
            </div>
        </div>
    );
};

export default WalletMotocarga;