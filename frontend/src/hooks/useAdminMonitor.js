// Versión Arquitectura: V2.1 - Expansión de Telemetría Financiera y Malla CEO Blindada con Límite Atómico
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useAdminMonitor.js
 * Misión: Abstraer suscripciones en tiempo real a los nodos críticos de Firestore, añadiendo el flujo contable.
 * Integridad: Fusión Atómica. Preserva suscripciones previas e inyecta limit(50) en consultas de viajes y transacciones para proteger RAM.
 */

import { useState, useEffect } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

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

            // 1. 🛡️ Suscripción a Conductores (Flota completa activa)
            const pathConductores = FIRESTORE_PATHS.conductores || 'conductores';
            const qConductores = query(collection(db, pathConductores), orderBy('createdAt', 'desc'));
            unsubCond = onSnapshot(qConductores, (snap) => {
                setConductores(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (err) => {
                console.error("🚨 [CIMCO-MONITOR-ERR] Falla en Malla de Operadores:", err);
                setError(err.message);
            });

            // 2. 🛡️ Suscripción a Viajes Activos (Límite Atómico de 50 documentos para evitar desbordamiento de RAM)
            const pathViajes = FIRESTORE_PATHS.viajes || 'viajes';
            const qViajes = query(collection(db, pathViajes), orderBy('timestamp', 'desc'), limit(50));
            unsubViajes = onSnapshot(qViajes, (snap) => {
                setViajes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (err) => {
                console.error("🚨 [CIMCO-MONITOR-ERR] Falla en Radar de Viajes:", err);
                setError(err.message);
            });

            // 3. ⚡ Suscripción al Flujo de Bóveda Contable (Transacciones con Límite Atómico de 50 documentos)
            const pathTransacciones = FIRESTORE_PATHS.transacciones || 'transacciones';
            const qTransacciones = query(collection(db, pathTransacciones), orderBy('timestamp', 'desc'), limit(50));
            unsubTrans = onSnapshot(qTransacciones, (snap) => {
                // Inyección segura con protección Anti-Undefined en el mapeo de documentos de Firebase
                setTransacciones(snap.docs.map(doc => {
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
                }));
                setLoading(false);
            }, (err) => {
                console.error("🚨 [CIMCO-MONITOR-ERR] Falla en Stream contable:", err);
                setError(err.message);
            });

        } catch (err) {
            console.error("⚠️ ALERTA DE ARQUITECTURA: Error crítico al inicializar escuchas indexadas:", err);
            setError(err.message);
            setLoading(false);
        }

        // Desacoplamiento limpio de los listeners para mitigar fugas de memoria (Memory Leaks)
        return () => {
            unsubCond();
            unsubViajes();
            unsubTrans();
        };
    }, []);

    return { conductores, viajes, transacciones, loading, error };
};