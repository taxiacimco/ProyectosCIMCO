// Versión Arquitectura: V2.3 - Resiliencia de Malla CEO, Fallback de Índices Firestore y Telemetría Contable
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useAdminMonitor.js
 * Misión: Abstraer suscripciones en tiempo real a los nodos críticos de Firestore con tolerancia a fallos por falta de índices.
 * Ajuste V2.3: Implementación de Fallback Atómico contra errores FAILED_PRECONDITION / missing index. Ordenación local en JS en caso de quiebre.
 */

import { useState, useEffect } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
// 🛡️ IMPORTANTE: Importación del helper de deduplicación de entidades
import { deduplicarEntidades } from '../utils/deduplicar';

export const useAdminMonitor = () => {
    const [conductores, setConductores] = useState([]);
    const [viajes, setViajes] = useState([]);
    const [transacciones, setTransacciones] = useState([]); // ⚡ NODO: Stream financiero unificado
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let unsubCond = () => {};
        let unsubViajes = () => {};
        let unsubTrans = () => {};

        try {
            // 🛡️ Guardas de Seguridad: Validar existencia del mapa de rutas inmutable
            if (!FIRESTORE_PATHS) {
                throw new Error("Gobernanza de Rutas Violada: FIRESTORE_PATHS no está definido en el archivo de configuración.");
            }

            // 1. 🛡️ Suscripción a Conductores (Flota completa activa con filtrado de deduplicación)
            const pathConductores = FIRESTORE_PATHS.conductores || 'conductores';
            
            const iniciarEscuchaConductores = (conOrdenamiento = true) => {
                const colRef = collection(db, pathConductores);
                const q = conOrdenamiento 
                    ? query(colRef, orderBy('createdAt', 'desc'))
                    : query(colRef, limit(100));

                return onSnapshot(q, (snap) => {
                    let listaRaw = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    if (!conOrdenamiento) {
                        listaRaw.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
                    }

                    // 🧹 APLICAMOS DEDUPLICACIÓN TÁCTICA SOBRE LA LISTA ACUMULADA
                    const listaDepurada = typeof deduplicarEntidades === 'function' 
                        ? deduplicarEntidades(listaRaw) 
                        : listaRaw;

                    setConductores(listaDepurada);
                }, (err) => {
                    if (conOrdenamiento && (err.code === 'failed-precondition' || err.message?.includes('index'))) {
                        console.warn("⚠️ [CIMCO-MONITOR-FALLBACK] Índice inexistente en 'conductores'. Conmutando a consulta sin ordenamiento.");
                        unsubCond = iniciarEscuchaConductores(false);
                    } else {
                        console.error("🚨 [CIMCO-MONITOR-ERR] Falla en Malla de Operadores:", err);
                        setError(err.message);
                    }
                });
            };

            unsubCond = iniciarEscuchaConductores(true);

            // 2. 🛡️ Suscripción a Viajes Activos (Límite Atómico de 50 documentos con Fallback)
            const pathViajes = FIRESTORE_PATHS.viajes || 'viajes';

            const iniciarEscuchaViajes = (conOrdenamiento = true) => {
                const colRef = collection(db, pathViajes);
                const q = conOrdenamiento 
                    ? query(colRef, orderBy('timestamp', 'desc'), limit(50))
                    : query(colRef, limit(50));

                return onSnapshot(q, (snap) => {
                    let lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    if (!conOrdenamiento) {
                        lista.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
                    }

                    setViajes(lista);
                }, (err) => {
                    if (conOrdenamiento && (err.code === 'failed-precondition' || err.message?.includes('index'))) {
                        console.warn("⚠️ [CIMCO-MONITOR-FALLBACK] Índice inexistente en 'viajes'. Conmutando a consulta sin ordenamiento.");
                        unsubViajes = iniciarEscuchaViajes(false);
                    } else {
                        console.error("🚨 [CIMCO-MONITOR-ERR] Falla en Radar de Viajes:", err);
                        setError(err.message);
                    }
                });
            };

            unsubViajes = iniciarEscuchaViajes(true);

            // 3. ⚡ Suscripción al Flujo de Bóveda Contable (Transacciones con Fallback)
            const pathTransacciones = FIRESTORE_PATHS.transacciones || 'transacciones';

            const iniciarEscuchaTransacciones = (conOrdenamiento = true) => {
                const colRef = collection(db, pathTransacciones);
                const q = conOrdenamiento 
                    ? query(colRef, orderBy('timestamp', 'desc'), limit(50))
                    : query(colRef, limit(50));

                return onSnapshot(q, (snap) => {
                    let lista = snap.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            conductorId: data?.conductorId || 'N/A',
                            monto: data?.monto || 0,
                            tipo: data?.tipo || 'RECARGA',
                            referencia: data?.referencia || 'INTERNA_ADMIN',
                            timestamp: data?.timestamp || null,
                            ...data
                        };
                    });

                    if (!conOrdenamiento) {
                        lista.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
                    }

                    setTransacciones(lista);
                    setLoading(false);
                }, (err) => {
                    if (conOrdenamiento && (err.code === 'failed-precondition' || err.message?.includes('index'))) {
                        console.warn("⚠️ [CIMCO-MONITOR-FALLBACK] Índice inexistente en 'transacciones'. Conmutando a consulta sin ordenamiento.");
                        unsubTrans = iniciarEscuchaTransacciones(false);
                    } else {
                        console.error("🚨 [CIMCO-MONITOR-ERR] Falla en Stream contable:", err);
                        setError(err.message);
                        setLoading(false);
                    }
                });
            };

            unsubTrans = iniciarEscuchaTransacciones(true);

        } catch (err) {
            console.error("⚠️ ALERTA DE ARQUITECTURA: Error crítico al inicializar escuchas indexadas:", err);
            setError(err.message);
            setLoading(false);
        }

        // Desacoplamiento limpio de los listeners para mitigar fugas de memoria (Memory Leaks)
        return () => {
            if (typeof unsubCond === 'function') unsubCond();
            if (typeof unsubViajes === 'function') unsubViajes();
            if (typeof unsubTrans === 'function') unsubTrans();
        };
    }, []);

    return { conductores, viajes, transacciones, loading, error };
};