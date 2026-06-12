// Versión Arquitectura: V3.1 - Blindaje Paramétrico y Normalización de Identidad Operativa
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useWallet.js
 * Misión: Escuchar en tiempo real el balance financiero del conductor en Firestore.
 * Integridad: Fusión Atómica que preserva la reactividad en tiempo real (onSnapshot).
 * Seguridad: Guarda Avanzada Anti-Undefined para mitigar desbordamientos por discrepancias de Claims de Rol.
 */

import { useState, useEffect } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth'; 

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

        // 🔄 RESOLUCIÓN POLIMÓRFICA DE LLAVES: Detecta la firma de identidad disponible de forma segura
        const walletKey = user.id || user.uid || user.email || user._id;

        if (!walletKey) {
            console.warn("⚠️ [CIMCO-WALLET] No se pudo determinar una llave válida de billetera para el usuario actual.");
            setLoading(false);
            return;
        }

        // 🚨 CONFIGURACIÓN GOBERNADA: Consumo dinámico usando la ruta centralizada sin harcodear cadenas largas
        const baseWalletPath = FIRESTORE_PATHS.wallets || "artifacts/taxiacimco-app/public/data/wallets";
        
        // Sanitización y limpieza de la llave de consulta
        const safeWalletKey = String(walletKey).trim();
        const walletRef = doc(db, baseWalletPath, safeWalletKey);

        console.log(`📡 [CIMCO-WALLET-SYNC] Abriendo pasarela Firestore en sub-nodo: ${baseWalletPath}/${safeWalletKey}`);

        const unsubscribe = onSnapshot(walletRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // 🛡️ Blindaje estricto de tipo de dato numérico primario (Evita NaN en producción)
                if (data && data.balance !== undefined && data.balance !== null) {
                    setBalance(Number(data.balance));
                } else {
                    setBalance(0);
                }
            } else {
                console.warn(`📡 [CIMCO-WALLET] Documento de billetera no encontrado para la llave: ${safeWalletKey}. Asumiendo base $0.`);
                setBalance(0);
            }
            setLoading(false);
        }, (error) => {
            console.error("❌ [CIMCO-WALLET-FATAL] Error crítico en la suscripción real-time de Firestore:", error);
            setLoading(false);
        });

        // Limpieza atómica del listener para prevenir fugas de memoria (Memory Leaks)
        return () => unsubscribe();

    }, [user]);

    return { balance, loading };
};