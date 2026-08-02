// Versión Arquitectura: V7.5 - Gobernanza Contable Definitiva (Doble Sincronización SSOT MongoDB/Firestore)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useWallet.js
 * Misión: Forzar la sincronización exacta con Firestore y MongoDB Atlas tras débitos transaccionales.
 * Ajuste V7.5: Inyección de sincronización REST en segundo plano con MongoDB (SSOT) post-transacción Firestore.
 */

import { useState, useEffect } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import api from '@/config/api';

export const useWallet = () => {
    const { user, actualizarEstadoLocal } = useAuth();
    
    const [saldo, setSaldo] = useState(user?.saldo || user?.balance || 0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMutating, setIsMutating] = useState(false);

    const idCrudo = user ? (user.uid || user._id || user.id || user.conductorId) : null;
    const idDocumentoUnificado = idCrudo ? String(idCrudo).trim() : null;

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
                        console.warn(`⚠️ [CIMCO-SYNC] Documento Firestore [${coleccionDestino}/${idDocumentoUnificado}] inexistente.`);
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
     * ⚡ MUTACIÓN TRANSACCIONAL DUAL (Firestore + Sincronización REST MongoDB)
     */
    const procesarDebitoTransaccional = async (montoDebito, motivo = "DEBITO_OPERATIVO") => {
        if (!idDocumentoUnificado) throw new Error("No hay un identificador de usuario válido para la transacción.");
        if (montoDebito <= 0) throw new Error("El monto a debitar debe ser mayor a cero.");

        setIsMutating(true);
        const referenciaBilletera = doc(db, coleccionDestino, idDocumentoUnificado);
        
        const coleccionHistorial = collection(db, 'historial_saldos');
        const nuevoDocHistorialRef = doc(coleccionHistorial);

        try {
            // STEP 1: Escritura Atómica en Firestore (Garantiza respuesta rápida en UI)
            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(referenciaBilletera);
                if (!sfDoc.exists()) {
                    throw new Error("La billetera destino no existe en Firestore.");
                }

                const datosActuales = sfDoc.data();
                const saldoActual = Number(datosActuales.saldo !== undefined ? datosActuales.saldo : (datosActuales.balance || 0));

                if (saldoActual < montoDebito) {
                    throw new Error(`Fondos insuficientes. Saldo: $${saldoActual} | Requerido: $${montoDebito}`);
                }

                const nuevoSaldoCalculado = saldoActual - montoDebito;

                transaction.update(referenciaBilletera, {
                    saldo: nuevoSaldoCalculado,
                    balance: nuevoSaldoCalculado,
                    ultimaActualizacion: serverTimestamp()
                });

                transaction.set(nuevoDocHistorialRef, {
                    usuarioId: idDocumentoUnificado,
                    tipo: 'DEBITO',
                    monto: montoDebito,
                    saldoAnterior: saldoActual,
                    saldoNuevo: nuevoSaldoCalculado,
                    concepto: motivo,
                    fecha: serverTimestamp()
                });
            });

            // STEP 2: Sincronización en segundo plano con MongoDB Atlas (SSOT Backend)
            try {
                await api.post('/wallet/debit', {
                    usuarioId: idDocumentoUnificado,
                    monto: montoDebito,
                    concepto: motivo
                });
                console.log("🌐 [CIMCO-WALLET-SSOT] Sincronización con MongoDB Atlas completada con éxito.");
            } catch (apiErr) {
                console.warn("⚠️ [CIMCO-WALLET-SYNC-WARN] Transacción Firestore exitosa, pero falló el sync REST con MongoDB:", apiErr.message);
            }

            setIsMutating(false);
            return true;
        } catch (err) {
            console.error("❌ [CIMCO-WALLET-MUTATION-ERROR] Transacción revertida de forma segura:", err.message);
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