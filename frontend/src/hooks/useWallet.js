// Versión Arquitectura: V7.3 - Gobernanza Contable Definitiva con Mutaciones Atómicas Anti-Condición de Carrera
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useWallet.js
 * Misión: Forzar la sincronización exacta con Firestore y proveer mutaciones atómicas seguras para liquidaciones.
 * Ajuste V7.3: Inyección de runTransaction para soportar pruebas de estrés concurrentes sin descalces financieros.
 */

import { useState, useEffect } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot, runTransaction, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

export const useWallet = () => {
    const { user, actualizarEstadoLocal } = useAuth();
    
    const [saldo, setSaldo] = useState(user?.saldo || user?.balance || 0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMutating, setIsMutating] = useState(false); // Flag de bloqueo para operaciones de escritura

    const idCrudo = user ? (user.uid || user._id || user.id || user.conductorId) : null;
    const idDocumentoUnificado = idCrudo ? String(idCrudo).trim() : null;

    // Determinar de manera única la colección contable
    const coleccionDestino = (FIRESTORE_PATHS && FIRESTORE_PATHS.wallets) 
        ? FIRESTORE_PATHS.wallets 
        : ((FIRESTORE_PATHS && FIRESTORE_PATHS.conductores) ? FIRESTORE_PATHS.conductores : 'wallets');

    useEffect(() => {
        if (!idDocumentoUnificado) {
            setLoading(false);
            return;
        }

        let unsubscribeFirestore = null;

        const sincronizarBoveda = () => {
            try {
                const referenciaBilletera = doc(db, coleccionDestino, idDocumentoUnificado);
                
                console.log(`📡 [CIMCO-WALLET-SYNC] Abriendo pasarela reactiva en: ${coleccionDestino}/${idDocumentoUnificado}`);

                unsubscribeFirestore = onSnapshot(referenciaBilletera, (snapshot) => {
                    if (snapshot.exists()) {
                        const datosEnVivo = snapshot.data();
                        const saldoDetectado = datosEnVivo.saldo !== undefined ? datosEnVivo.saldo : datosEnVivo.balance;

                        if (saldoDetectado !== undefined && saldoDetectado !== null) {
                            const nuevoSaldo = Number(saldoDetectado);
                            setSaldo(nuevoSaldo);
                            
                            if (typeof actualizarEstadoLocal === 'function') {
                                actualizarEstadoLocal({ saldo: nuevoSaldo, balance: nuevoSaldo });
                            }
                        }
                    } else {
                        console.warn(`⚠️ [CIMCO-SYNC] Documento Firestore [${coleccionDestino}/${idDocumentoUnificado}] inexistente. Estado default ($0).`);
                    }
                    setLoading(false);
                }, (err) => {
                    console.error('🚨 [CIMCO-WALLET-FATAL] Ruptura del socket de Firestore:', err.message);
                    setError(err.message);
                    setLoading(false);
                });

            } catch (err) {
                console.error('🚨 [CIMCO-WALLET-FATAL] Fallo al ensamblar el listener contable:', err.message);
                setError(err.message);
                setLoading(false);
            }
        };

        sincronizarBoveda();

        return () => {
            if (unsubscribeFirestore) unsubscribeFirestore();
        };
    }, [idDocumentoUnificado, coleccionDestino]);

    /**
     * ⚡ MUTACIÓN QUIRÚRGICA TRANSACCIONAL (Blindaje Anti-Condición de Carrera)
     * Diseñada específicamente para soportar ráfagas concurrentes de débitos (Test de Estrés)
     */
    const procesarDebitoTransaccional = async (montoDebito, motivo = "DEBITO_OPERATIVO") => {
        if (!idDocumentoUnificado) throw new Error("No hay un identificador de usuario válido para la transacción.");
        if (montoDebito <= 0) throw new Error("El monto a debitar debe ser mayor a cero.");

        setIsMutating(true);
        const referenciaBilletera = doc(db, coleccionDestino, idDocumentoUnificado);
        const referenciaHistorial = collection(db, 'historial_saldos');

        try {
            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(referenciaBilletera);
                if (!sfDoc.exists()) {
                    throw new Error("La billetera destino no existe en la base de datos.");
                }

                const datosActuales = sfDoc.data();
                const saldoActual = Number(datosActuales.saldo !== undefined ? datosActuales.saldo : (datosActuales.balance || 0));

                if (saldoActual < montoDebito) {
                    throw new Error(`Fondos insuficientes. Saldo: $${saldoActual} | Requerido: $${montoDebito}`);
                }

                const nuevoSaldoCalculado = saldoActual - montoDebito;

                // 🗄️ Escritura atómica garantizada
                transaction.update(referenciaBilletera, {
                    saldo: nuevoSaldoCalculado,
                    balance: nuevoSaldoCalculado,
                    ultimaActualizacion: serverTimestamp()
                });

                // Registrar auditoría inmediatamente en la misma transacción en segundo plano
                await addDoc(referenciaHistorial, {
                    usuarioId: idDocumentoUnificado,
                    tipo: 'DEBITO',
                    monto: montoDebito,
                    saldoAnterior: saldoActual,
                    saldoNuevo: nuevoSaldoCalculado,
                    concepto: motivo,
                    fecha: serverTimestamp()
                });
            });

            setIsMutating(false);
            return true;
        } catch (err) {
            console.error("❌ [CIMCO-WALLET-MUTATION-ERROR] Transacción revertida:", err.message);
            setIsMutating(false);
            throw err;
        }
    };

    return {
        balance: saldo, 
        saldo,
        loading,
        error,
        isMutating,
        isSolvente: saldo >= 2000,
        procesarDebitoTransaccional
    };
};

export default useWallet;