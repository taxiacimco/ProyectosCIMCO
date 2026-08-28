/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\services\telemetria.service.js
 * Misión: Servicio de Telemetría GPS y actualización de Radar de Ubicación (2DSphere).
 */

import Conductor from '../models/Conductor.js';
import { dbFirestore, FIRESTORE_PATHS } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Actualiza las coordenadas GPS del conductor en MongoDB Atlas y sincroniza en Firestore.
 * 
 * @param {string} conductorId - Identificador único del conductor (Mongo ID, UID o conductorId)
 * @param {number} lat - Latitud GPS
 * @param {number} lng - Longitud GPS
 * @returns {Promise<boolean>} true si la actualización fue exitosa, false de lo contrario.
 */
export const actualizarRadarUbicacion = async (conductorId, lat, lng) => {
    try {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        if (isNaN(latNum) || isNaN(lngNum)) {
            console.warn("⚠️ [TELEMETRIA-WARN] Coordenadas inválidas para el conductor:", conductorId);
            return false;
        }

        // 1. Actualización en MongoDB (GeoJSON 2DSphere)
        const conductor = await Conductor.findOneAndUpdate(
            {
                $or: [
                    { _id: conductorId },
                    { uid: conductorId },
                    { conductorId: conductorId }
                ],
                isActive: true
            },
            {
                $set: {
                    ubicacion: {
                        type: 'Point',
                        coordinates: [lngNum, latNum]
                    },
                    ultimaUbicacion: new Date()
                }
            },
            { new: true }
        );

        if (!conductor) {
            console.warn("⚠️ [TELEMETRIA-WARN] Conductor no encontrado o inactivo:", conductorId);
            return false;
        }

        // 2. Réplica hacia Firestore (Radar en tiempo real)
        if (dbFirestore) {
            const docFirestoreId = conductor.uid || conductor._id.toString();
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';

            await dbFirestore.collection(coleccionConductores).doc(docFirestoreId).set({
                ubicacion: {
                    latitude: latNum,
                    longitude: lngNum
                },
                ultimaActualizacionGPS: FieldValue.serverTimestamp()
            }, { merge: true });
        }

        return true;
    } catch (error) {
        console.error("🚨 [TELEMETRIA-ERROR] Fallo al actualizar radar de ubicación:", error.message);
        return false;
    }
};

export default {
    actualizarRadarUbicacion
};