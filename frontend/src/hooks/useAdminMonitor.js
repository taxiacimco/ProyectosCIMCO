// Versión Arquitectura: V24.1 - Integración Quirúrgica con Servicios Centralizados (userService, viajeService)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useAdminMonitor.js
 * Misión: Abstraer suscripciones en tiempo real a los nodos críticos de Firestore con tolerancia a fallos por falta de índices e integración centralizada a userService y viajeService.
 */

import { useState, useEffect, useCallback } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { deduplicarEntidades } from '@/utils/deduplicar';
import userService from '@/services/userService';
import viajeService from '@/services/viajeService';

export const useAdminMonitor = () => {
    const [conductores, setConductores] = useState([]);
    const [viajes, setViajes] = useState([]);
    const [transacciones, setTransacciones] = useState([]); // ⚡ NODO: Stream financiero unificado
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * 🌐 Consulta SSOT de Respaldo/Sincronización Inicial desde Servicios Centralizados
     */
    const cargarDatosServiciosCentrales = useCallback(async () => {
        try {
            // Carga paralela defensiva desde servicios centralizados
            const [respuestaConductores, respuestaViajes] = await Promise.allSettled([
                userService?.getConductores ? userService.getConductores() : Promise.resolve(null),
                viajeService?.getViajesActivos ? viajeService.getViajesActivos() : (viajeService?.getViajes ? viajeService.getViajes() : Promise.resolve(null))
            ]);

            if (respuestaConductores.status === 'fulfilled' && respuestaConductores.value) {
                const listaCondsRaw = respuestaConductores.value?.conductores || respuestaConductores.value?.data || (Array.isArray(respuestaConductores.value) ? respuestaConductores.value : []);
                if (Array.isArray(listaCondsRaw) && listaCondsRaw.length > 0) {
                    const depurada = typeof deduplicarEntidades === 'function' ? deduplicarEntidades(listaCondsRaw) : listaCondsRaw;
                    setConductores(prev => prev.length === 0 ? depurada : prev);
                }
            }

            if (respuestaViajes.status === 'fulfilled' && respuestaViajes.value) {
                const listaViajesRaw = respuestaViajes.value?.viajes || respuestaViajes.value?.data || (Array.isArray(respuestaViajes.value) ? respuestaViajes.value : []);
                if (Array.isArray(listaViajesRaw) && listaViajesRaw.length > 0) {
                    setViajes(prev => prev.length === 0 ? listaViajesRaw : prev);
                }
            }
        } catch (errCentral) {
            console.warn("⚠️ [CIMCO-MONITOR] Sincronización secundaria vía servicios falló o no está disponible:", errCentral?.message);
        }
    }, []);

    useEffect(() => {
        let unsubCond = () => {};
        let unsubViajes = () => {};
        let unsubTrans = () => {};

        try {
            // 🛡️ Guardas de Seguridad: Validar existencia del mapa de rutas inmutable
            if (!FIRESTORE_PATHS) {
                throw new Error("Gobernanza de Rutas Violada: FIRESTORE_PATHS no está definido en el archivo de configuración.");
            }

            // Ejecución preventiva de carga de respaldo desde la API Centralizada
            cargarDatosServiciosCentrales();

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
    }, [cargarDatosServiciosCentrales]);

    return { 
        conductores, 
        viajes, 
        transacciones, 
        loading, 
        error,
        refetchMetricas: cargarDatosServiciosCentrales
    };
};

export default useAdminMonitor;