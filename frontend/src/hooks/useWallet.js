// Versión Arquitectura: V2.0 - Suscripción Polimórfica Real-Time con Blindaje de Identificadores Cruzados
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useWallet.js
 * Misión: Escuchar en tiempo real el balance financiero del conductor en Firestore.
 * NOTA DE ARQUITECTURA: Resuelve el descalce de llaves de indexación buscando dinámicamente por id, uid o email.
 */

import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './useAuth';

export const useWallet = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 🛡️ GUARDA DE SEGURIDAD INTERNA (Anti-Undefined)
        if (!user) {
            setLoading(false);
            return;
        }

        // 🔄 RESOLUCIÓN POLIMÓRFICA DE LLAVES: Detecta la firma de identidad disponible
        const walletKey = user.id || user.uid || user.email;

        if (!walletKey) {
            console.warn("⚠️ [CIMCO-WALLET] No se pudo determinar una llave válida de billetera para el usuario actual.");
            setLoading(false);
            return;
        }

        const walletRef = doc(db, "artifacts/taxiacimco-app/public/data/wallets", String(walletKey).trim());

        const unsubscribe = onSnapshot(walletRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // 🛡️ Blindaje de tipo de dato numérico primario
                setBalance(data.balance !== undefined && data.balance !== null ? Number(data.balance) : 0);
            } else {
                console.warn(`📡 [CIMCO-WALLET] Documento de billetera no encontrado para la llave: ${walletKey}. Asumiendo base $0.`);
                setBalance(0);
            }
            setLoading(false);
        }, (error) => {
            console.error("❌ [CIMCO-WALLET] Error crítico en la suscripción real-time:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { balance, loading };
};