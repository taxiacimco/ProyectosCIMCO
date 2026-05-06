// Versión Arquitectura: V1.1 - Implementación de Geohashing para Radar 5km
/**
 * functions/src/modules/driver/services/gps-sentinel.service.js
 * PROYECTO: TAXIA CIMCO
 * MISIÓN: Actualización de ubicación con codificación geohash para optimización de consultas.
 */

import geohash from 'ngeohash';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Actualiza la ubicación y genera un hash de precisión nivel 6 (~1.2km) para el radar.
 */
export const updateLocationWithHash = async (uid, lat, lng) => {
    const db = getFirestore();
    
    // Generamos un hash de 6 caracteres para un balance óptimo entre precisión y área de búsqueda
    const hash = geohash.encode(lat, lng, 6); 

    const userRef = db.collection('artifacts/taxiacimco-app/public/data/usuarios').doc(uid);

    await userRef.update({
        'lastLocation.lat': lat,
        'lastLocation.lng': lng,
        'lastLocation.geohash': hash,
        'lastLocation.updatedAt': new Date().toISOString(),
        'lastActive': new Date()
    });

    return { success: true, hash };
};

export const checkGpsHealth = async () => {
    // ... (Se mantiene lógica de monitoreo existente de la V12.2)
};