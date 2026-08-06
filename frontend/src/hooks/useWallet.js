// Versión Arquitectura: V8.1 - Estabilización de Dependencias useCallback y Control de Listener Firestore
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useWallet.js
 * Misión: Sincronización exacta y resiliente de saldo consultando MongoDB via REST API con redundancia en tiempo real vía Firestore, libre de ráfagas e inestabilidades.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import api from '@/config/api';

export const useWallet = () => {
    const { user, actualizarEstadoLocal } = useAuth();
    
    // Referencia mutable estable para evitar la recreación de callbacks y la destrucción cíclica del listener de Firestore
    const actualizarEstadoLocalRef = useRef(actualizarEstadoLocal);
    useEffect(() => {
        actualizarEstadoLocalRef.current = actualizarEstadoLocal;
    }, [actualizarEstadoLocal]);

    // Asignación inicial resiliente con fallback a propiedades conocidas del usuario
    const [saldo, setSaldo] = useState(() => {
        return Number(user?.saldoWallet ?? user?.saldo ?? user?.balance ?? user?.billetera?.saldo ?? 0);
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMutating, setIsMutating] = useState(false);

    const idCrudo = user ? (user.uid || user._id || user.id || user.conductorId) : null;
    const idDocumentoUnificado = idCrudo ? String(idCrudo).trim() : null;

    const coleccionDestino = (FIRESTORE_PATHS && FIRESTORE_PATHS.wallets) 
        ? FIRESTORE_PATHS.wallets 
        : ((FIRESTORE_PATHS && FIRESTORE_PATHS.conductores) ? FIRESTORE_PATHS.conductores : 'wallets');

    /**
     * 🌐 Consulta SSOT directa a la API REST de Node/MongoDB
     * Memorizada exclusivamente sobre idDocumentoUnificado para prevenir bucles de refresco.
     */
    const obtenerSaldoDesdeBackend = useCallback(async () => {
        if (!idDocumentoUnificado) return null;
        try {
            // Intentar consultar endpoint dedicado o de perfil
            const respuesta = await api.get(`/conductores/${idDocumentoUnificado}`);
            const datosBackend = respuesta.data?.conductor || respuesta.data?.user || respuesta.data;
            
            const saldoBackend = datosBackend?.saldoWallet ?? datosBackend?.saldo ?? datosBackend?.balance ?? datosBackend?.billetera?.saldo;

            if (saldoBackend !== undefined && saldoBackend !== null) {
                const saldoNumerico = Number(saldoBackend);
                setSaldo(saldoNumerico);
                if (typeof actualizarEstadoLocalRef.current === 'function') {
                    actualizarEstadoLocalRef.current({ saldo: saldoNumerico, saldoWallet: saldoNumerico, balance: saldoNumerico });
                }
                return saldoNumerico;
            }
        } catch (apiErr) {
            console.warn("⚠️ [CIMCO-WALLET] No se pudo obtener saldo via REST API (MongoDB):", apiErr.message);
        }
        return null;
    }, [idDocumentoUnificado]);

    useEffect(() => {
        if (!idDocumentoUnificado) {
            setLoading(false);
            return;
        }

        let unsubscribeFirestore = null;

        const sincronizarBoveda = async () => {
            // 1. Carga prioritaria inmediata desde MongoDB (SSOT)
            await obtenerSaldoDesdeBackend();

            // 2. Suscripción en tiempo real vía Firestore
            try {
                const referenciaBilletera = doc(db, coleccionDestino, idDocumentoUnificado);
                
                unsubscribeFirestore = onSnapshot(referenciaBilletera, (snapshot) => {
                    if (snapshot.exists()) {
                        const datosEnVivo = snapshot.data();
                        const saldoDetectado = datosEnVivo.saldo ?? datosEnVivo.saldoWallet ?? datosEnVivo.balance;

                        if (saldoDetectado !== undefined && saldoDetectado !== null) {
                            const nuevoSaldo = Number(saldoDetectado);
                            setSaldo(nuevoSaldo);
                            
                            if (typeof actualizarEstadoLocalRef.current === 'function') {
                                actualizarEstadoLocalRef.current({ saldo: nuevoSaldo, saldoWallet: nuevoSaldo, balance: nuevoSaldo });
                            }
                        }
                    } else {
                        console.warn(`⚠️ [CIMCO-SYNC] Documento Firestore [${coleccionDestino}/${idDocumentoUnificado}] inexistente. Conservando saldo de API REST.`);
                    }
                    setLoading(false);
                }, (err) => {
                    console.error('🚨 [CIMCO-WALLET-FATAL] Fallo en el socket Firestore:', err.message);
                    setError(err.message);
                    setLoading(false);
                });

            } catch (err) {
                console.error('🚨 [CIMCO-WALLET-FATAL] Fallo al ensamblar listener:', err.message);
                setError(err.message);
                setLoading(false);
            }
        };

        sincronizarBoveda();

        return () => {
            if (unsubscribeFirestore) unsubscribeFirestore();
        };
    }, [idDocumentoUnificado, coleccionDestino, obtenerSaldoDesdeBackend]);

    /**
     * ⚡ MUTACIÓN TRANSACCIONAL DUAL (MongoDB REST Primario + Firestore Backup)
     */
    const procesarDebitoTransaccional = async (montoDebito, motivo = "DEBITO_OPERATIVO") => {
        if (!idDocumentoUnificado) throw new Error("No hay un identificador de usuario válido para la transacción.");
        if (montoDebito <= 0) throw new Error("El monto a debitar debe ser mayor a cero.");

        setIsMutating(true);

        try {
            // STEP 1: Transacción primaria en MongoDB vía API REST
            const respuestaBackend = await api.post('/wallet/debit', {
                usuarioId: idDocumentoUnificado,
                monto: montoDebito,
                concepto: motivo
            });

            const nuevoSaldoApi = respuestaBackend.data?.nuevoSaldo ?? respuestaBackend.data?.saldo;
            
            if (nuevoSaldoApi !== undefined) {
                setSaldo(Number(nuevoSaldoApi));
            }

            // STEP 2: Sincronización secundaria opcional en Firestore
            try {
                const referenciaBilletera = doc(db, coleccionDestino, idDocumentoUnificado);
                const coleccionHistorial = collection(db, 'historial_saldos');
                const nuevoDocHistorialRef = doc(coleccionHistorial);

                await runTransaction(db, async (transaction) => {
                    const sfDoc = await transaction.get(referenciaBilletera);
                    if (sfDoc.exists()) {
                        const datosActuales = sfDoc.data();
                        const saldoActual = Number(datosActuales.saldo ?? datosActuales.saldoWallet ?? datosActuales.balance ?? 0);
                        const nuevoSaldoCalculado = Math.max(0, saldoActual - montoDebito);

                        transaction.update(referenciaBilletera, {
                            saldo: nuevoSaldoCalculado,
                            saldoWallet: nuevoSaldoCalculado,
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
                    }
                });
            } catch (fsErr) {
                console.warn("⚠️ [CIMCO-WALLET] Sync en Firestore falló o documento no existe, pero MongoDB actualizó correctamente:", fsErr.message);
            }

            setIsMutating(false);
            return true;
        } catch (err) {
            console.error("❌ [CIMCO-WALLET-MUTATION-ERROR] Error en el débito:", err.message);
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
        refetchSaldo: obtenerSaldoDesdeBackend,
        procesarDebitoTransaccional
    };
};

export default useWallet;