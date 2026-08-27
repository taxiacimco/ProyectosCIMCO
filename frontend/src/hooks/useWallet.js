// Versión Arquitectura: V24.2 - Corrección de Resiliencia en Bloque Catch de Billetera REST
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useWallet.js
 * Misión: Sincronización exacta de saldo por rol con detención de bucles de re-renderizado, redundancia en tiempo real vía Firestore, timeout HTTP a 5s y resiliencia transaccional mediante walletService.
 * Ajuste V24.2: Modificación del bloque catch en obtenerSaldoDesdeBackend para conservar el último saldo conocido en lugar de sobreescribirlo a cero durante parpadeos o latencia de red.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { doc, onSnapshot, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import api from '@/config/api';
import walletService from '@/services/walletService';

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
        const saldoInicial = Number(user?.saldoWallet ?? user?.saldo ?? user?.balance ?? user?.billetera?.saldo ?? 0);
        return isNaN(saldoInicial) ? 0 : saldoInicial;
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
     * 🌐 Consulta SSOT directa a la API REST consumiendo el servicio walletService
     * Resiliente con timeout de 5000ms y preservación del saldo previo ante latencia o fallos de red.
     */
    const obtenerSaldoDesdeBackend = useCallback(async () => {
        if (!idDocumentoUnificado) return 0;

        try {
            // Consumo centralizado del servicio walletService
            const respuestaBackend = await walletService.getSaldo();
            const datosBackend = respuestaBackend?.conductor || respuestaBackend?.pasajero || respuestaBackend?.usuario || respuestaBackend?.user || respuestaBackend;
            
            const saldoBackend = datosBackend?.saldoWallet ?? datosBackend?.saldo ?? datosBackend?.balance ?? datosBackend?.billetera?.saldo ?? respuestaBackend?.saldo;

            if (saldoBackend !== undefined && saldoBackend !== null) {
                const saldoNumerico = Number(saldoBackend);
                const saldoValido = isNaN(saldoNumerico) ? 0 : saldoNumerico;
                setSaldo(saldoValido);

                if (typeof actualizarEstadoLocalRef.current === 'function') {
                    try {
                        actualizarEstadoLocalRef.current({ saldo: saldoValido, saldoWallet: saldoValido, balance: saldoValido });
                    } catch (authErr) {
                        console.warn("⚠️ [CIMCO-WALLET] No se pudo sincronizar estado con AuthProvider:", authErr?.message);
                    }
                }
                return saldoValido;
            }
        } catch (apiErr) {
            console.warn("⚠️ [CIMCO-WALLET] Error/Timeout consultando Backend REST. Conservando saldo local previo:", apiErr?.message);
            // NO ejecutar setSaldo(0) ni actualizarEstadoLocalRef con 0 para evitar borrado visual durante parpadeos de red
            return null;
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
            // 1. Carga prioritaria inmediata desde MongoDB (SSOT) con timeout a 5s
            await obtenerSaldoDesdeBackend();

            // 2. Suscripción en tiempo real vía Firestore
            try {
                const referenciaBilletera = doc(db, coleccionDestino, idDocumentoUnificado);
                
                unsubscribeFirestore = onSnapshot(referenciaBilletera, (snapshot) => {
                    if (snapshot.exists()) {
                        const datosEnVivo = snapshot.data();
                        const saldoDetectado = datosEnVivo?.saldo ?? datosEnVivo?.saldoWallet ?? datosEnVivo?.balance;

                        if (saldoDetectado !== undefined && saldoDetectado !== null) {
                            const nuevoSaldo = Number(saldoDetectado);
                            const saldoFinal = isNaN(nuevoSaldo) ? 0 : nuevoSaldo;
                            setSaldo(saldoFinal);
                            
                            if (typeof actualizarEstadoLocalRef.current === 'function') {
                                try {
                                    actualizarEstadoLocalRef.current({ saldo: saldoFinal, saldoWallet: saldoFinal, balance: saldoFinal });
                                } catch (authErr) {
                                    console.warn("⚠️ [CIMCO-WALLET] Error aislado al actualizar AuthProvider desde Firestore:", authErr?.message);
                                }
                            }
                        }
                    }
                    setLoading(false);
                }, (err) => {
                    console.error('🚨 [CIMCO-WALLET-FATAL] Fallo en el socket Firestore:', err?.message);
                    setError(err?.message || "Error de sincronización en tiempo real");
                    setLoading(false);
                });

            } catch (err) {
                console.error('🚨 [CIMCO-WALLET-FATAL] Fallo al ensamblar listener:', err?.message);
                setError(err?.message || "Error al conectar boveda de saldo");
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
        if (!montoDebito || montoDebito <= 0) throw new Error("El monto a debitar debe ser mayor a cero.");

        setIsMutating(true);

        try {
            // STEP 1: Transacción primaria en MongoDB vía API REST
            const respuestaBackend = await api.post('/wallet/debit', {
                usuarioId: idDocumentoUnificado,
                monto: montoDebito,
                concepto: motivo,
                rol: rolNormalizado
            }, { timeout: 10000 });

            const nuevoSaldoApi = respuestaBackend?.data?.nuevoSaldo ?? respuestaBackend?.data?.saldo;
            
            if (nuevoSaldoApi !== undefined && nuevoSaldoApi !== null) {
                const saldoCalculado = Number(nuevoSaldoApi);
                setSaldo(isNaN(saldoCalculado) ? 0 : saldoCalculado);
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
                        const saldoActual = Number(datosActuales?.saldo ?? datosActuales?.saldoWallet ?? datosActuales?.balance ?? 0);
                        const nuevoSaldoCalculado = Math.max(0, (isNaN(saldoActual) ? 0 : saldoActual) - montoDebito);

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
                console.warn("⚠️ [CIMCO-WALLET] Sync en Firestore falló o documento no existe:", fsErr?.message);
            }

            setIsMutating(false);
            return true;
        } catch (err) {
            console.error("❌ [CIMCO-WALLET-MUTATION-ERROR] Error en el débito:", err?.message);
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