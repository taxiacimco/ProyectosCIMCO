// Versión Arquitectura: V1.0 - Hook de Suscripción Real-Time a Billetera
import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './useAuth';

export const useWallet = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.email) return;
        const walletRef = doc(db, "artifacts/taxiacimco-app/public/data/wallets", user.email);
        const unsubscribe = onSnapshot(walletRef, (docSnap) => {
            if (docSnap.exists()) {
                setBalance(docSnap.data().balance || 0);
            }
            setLoading(false);
        }, (error) => {
            console.error("❌ Error en billetera:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    return { balance, loading };
};