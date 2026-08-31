// Versión Arquitectura: V25.0 - Integración de Flag de Operatividad, Validación Previa canAcceptService y Cabecera X-Idempotency-Key
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useWallet.js
 * Misión: Hook centralizado para la gobernanza del saldo de la billetera.
 * Ajustes V25.0:
 *  1. Flag de Operatividad:
 *     - Pasajero / Intermunicipal: estaHabilitadoParaOperar = true
 *     - Mototaxi, Motoparrillero, Motocarga, Despachador: estaHabilitadoParaOperar = (saldoWallet >= 2000)
 *  2. Método canAcceptService(valorCarrera):
 *     - Comprueba si el saldo remanente tras descontar la comisión del rol (10% o $500 COP) mantendrá el saldo >= $2.000 COP.
 *  3. Garantizar la cabecera X-Idempotency-Key en todas las peticiones de actualización/débito de saldo.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    const rolNormalizado = String(user?.rol || user?.role || user?.tipo || 'usuario').toLowerCase().trim();

    // 1. Flag de Operatividad Computado
    const estaHabilitadoParaOperar = useMemo(() => {
        if (['pasajero', 'intermunicipal', 'usuario'].includes(rolNormalizado)) {
            return true;
        }
        if (['mototaxi', 'motoparrillero', 'motocarga', 'despachador', 'conductor'].includes(rolNormalizado)) {
            return Number(saldo) >= 2000;
        }
        return true;
    }, [rolNormalizado, saldo]);

    // Determinación dinámica de la colección de Firestore basada en el rol
    const coleccionDestino = (() => {
        if (['conductor', 'mototaxi', 'motoparrillero', 'motocarga', 'despachador'].includes(rolNormalizado) && FIRESTORE_PATHS?.conductores) {
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
            // 1. Carga prioritaria inmediata desde MongoDB (SSOT)
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
     * 2. Método canAcceptService:
     * Calcula en tiempo real si el saldo remanente tras aplicar la comisión del servicio mantendrá al operador >= $2.000 COP.
     */
    const canAcceptService = useCallback((valorCarrera = 0) => {
        if (['pasajero', 'intermunicipal', 'usuario'].includes(rolNormalizado)) {
            return true;
        }

        const saldoActualNumerico = Number(saldo) || 0;
        const valorCarreraNumerico = Number(valorCarrera) || 0;
        let comisionCalculada = 0;

        // Reglas de comisión por rol
        if (rolNormalizado === 'mototaxi' || rolNormalizado === 'motoparrillero') {
            comisionCalculada = valorCarreraNumerico * 0.10;
        } else if (rolNormalizado === 'motocarga' || rolNormalizado === 'despachador') {
            comisionCalculada = 500;
        } else if (rolNormalizado === 'conductor') {
            comisionCalculada = valorCarreraNumerico * 0.10;
        }

        const saldoRemanente = saldoActualNumerico - comisionCalculada;
        return saldoRemanente >= 2000;
    }, [saldo, rolNormalizado]);

    /**
     * ⚡ MUTACIÓN TRANSACCIONAL DUAL (MongoDB REST Primario + Firestore Backup)
     * 3. Incluye X-Idempotency-Key obligatoria para evitar duplicados en cobros de red.
     */
    const procesarDebitoTransaccional = async (montoDebito, motivo = "DEBITO_OPERATIVO") => {
        if (!idDocumentoUnificado) throw new Error("No hay un identificador de usuario válido para la transacción.");
        if (!montoDebito || montoDebito <= 0) throw new Error("El monto a debitar debe ser mayor a cero.");

        setIsMutating(true);

        // Generación de Clave de Idempotencia Única por Solicitud
        const idempotencyKey = `tx-deb-${idDocumentoUnificado}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        try {
            // STEP 1: Transacción primaria en MongoDB vía API REST con X-Idempotency-Key
            const respuestaBackend = await api.post('/wallet/debit', {
                usuarioId: idDocumentoUnificado,
                monto: montoDebito,
                concepto: motivo,
                rol: rolNormalizado
            }, { 
                headers: {
                    'X-Idempotency-Key': idempotencyKey
                },
                timeout: 10000 
            });

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
                            idempotencyKey,
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

    /**
     * 3. Método para recargas/créditos con X-Idempotency-Key obligatoria
     */
    const procesarRecargaTransaccional = async (montoRecarga, motivo = "RECARGA_MANUAL_CEO") => {
        if (!idDocumentoUnificado) throw new Error("No hay un identificador de usuario válido para la transacción.");
        if (!montoRecarga || montoRecarga <= 0) throw new Error("El monto a recargar debe ser mayor a cero.");

        setIsMutating(true);

        const idempotencyKey = `tx-rec-${idDocumentoUnificado}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        try {
            const respuestaBackend = await api.post('/wallet/recharge', {
                usuarioId: idDocumentoUnificado,
                monto: montoRecarga,
                concepto: motivo,
                rol: rolNormalizado
            }, {
                headers: {
                    'X-Idempotency-Key': idempotencyKey
                },
                timeout: 10000
            });

            const nuevoSaldoApi = respuestaBackend?.data?.nuevoSaldo ?? respuestaBackend?.data?.saldo;

            if (nuevoSaldoApi !== undefined && nuevoSaldoApi !== null) {
                const saldoCalculado = Number(nuevoSaldoApi);
                setSaldo(isNaN(saldoCalculado) ? 0 : saldoCalculado);
            }

            setIsMutating(false);
            return true;
        } catch (err) {
            console.error("❌ [CIMCO-WALLET-MUTATION-ERROR] Error en la recarga:", err?.message);
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
        estaHabilitadoParaOperar,
        canAcceptService,
        refetchSaldo: obtenerSaldoDesdeBackend,
        procesarDebitoTransaccional,
        procesarRecargaTransaccional
    };
};

export default useWallet;