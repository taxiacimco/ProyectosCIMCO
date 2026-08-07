// Versión Arquitectura: V8.3 - Control Anti-Ráfaga con Memorización de Dependencias
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useWallet.js
 * Misión: Sincronización exacta de saldo por rol con detención de bucles de re-renderizado, redundancia en tiempo real vía Firestore y resiliencia transaccional.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import api from '@/config/api';

export const useWallet = () => {
    const { user, actualizarEstadoLocal } = useAuth();
    
    // Referencia mutable estable para evitar la recreación de callbacks y la destrucción cíclica de listeners
    const actualizarEstadoLocalRef = useRef(actualizarEstadoLocal);
    useEffect(() => {
        actualizarEstadoLocalRef.current = actualizarEstadoLocal;
    }, [actualizarEstadoLocal]);

    // Referencia mutable estable para el usuario actual para evitar re-evaluaciones innecesarias en callbacks
    const userRef = useRef(user);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // Asignación inicial resiliente con fallback a propiedades conocidas del usuario
    const [saldo, setSaldo] = useState(() => {
        return Number(user?.saldoWallet ?? user?.saldo ?? user?.balance ?? user?.billetera?.saldo ?? 0);
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMutating, setIsMutating] = useState(false);

    const idCrudo = user ? (user.uid || user._id || user.id || user.conductorId || user.pasajeroId) : null;
    const idDocumentoUnificado = idCrudo ? String(idCrudo).trim() : null;

    // Normalización polimórfica del rol del usuario
    const rolNormalizado = String(user?.rol || user?.role || user?.tipo || 'usuario').toLowerCase();

    // Determinación dinámica de la colección de Firestore basada en el rol
    const coleccionDestino = (() => {
        if (rolNormalizado === 'conductor' && FIRESTORE_PATHS?.conductores) {
            return FIRESTORE_PATHS.conductores;
        }
        if (rolNormalizado === 'pasajero' && FIRESTORE_PATHS?.pasajeros) {
            return FIRESTORE_PATHS.pasajeros;
        }
        if (FIRESTORE_PATHS?.wallets) {
            return FIRESTORE_PATHS.wallets;
        }
        return (FIRESTORE_PATHS?.usuarios) ? FIRESTORE_PATHS.usuarios : 'wallets';
    })();

    /**
     * 🌐 Consulta SSOT directa a la API REST de Node/MongoDB con enrutamiento dinámico por rol
     * Memorizada sin dependencia directa del objeto `user` para prevenir bucles infinitos de consultas.
     */
    const obtenerSaldoDesdeBackend = useCallback(async () => {
        if (!idDocumentoUnificado) return null;
        
        // Determinación de la ruta API REST según el rol del usuario
        let endpoint = `/conductores/${idDocumentoUnificado}`;
        if (rolNormalizado === 'pasajero') {
            endpoint = `/pasajeros/${idDocumentoUnificado}`;
        } else if (rolNormalizado === 'admin' || rolNormalizado === 'usuario') {
            endpoint = `/usuarios/${idDocumentoUnificado}`;
        }

        try {
            const respuesta = await api.get(endpoint);
            const datosBackend = respuesta.data?.conductor || respuesta.data?.pasajero || respuesta.data?.usuario || respuesta.data?.user || respuesta.data;
            
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
            // Manejo controlado y silencioso de respuestas 404 (recurso no existente en la colección específica)
            if (apiErr.response?.status === 404) {
                const currentUser = userRef.current;
                const saldoFallback = Number(currentUser?.saldoWallet ?? currentUser?.saldo ?? currentUser?.balance ?? 0);
                setSaldo(saldoFallback);
                return saldoFallback;
            }
            console.warn("⚠️ [CIMCO-WALLET] No se pudo obtener saldo via REST API (MongoDB):", apiErr.message);
        }
        return null;
    }, [idDocumentoUnificado, rolNormalizado]);

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
                        setLoading(false);
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
                concepto: motivo,
                rol: rolNormalizado
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
                console.warn("⚠️ [CIMCO-WALLET] Sync en Firestore falló o documento no existe:", fsErr.message);
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