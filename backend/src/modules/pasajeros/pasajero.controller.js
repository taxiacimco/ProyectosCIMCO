// Versión Arquitectura: V16.9 - Réplica Síncrona en Firestore y Manejo de Direcciones Favoritas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\pasajeros\pasajero.controller.js
 * Misión: Gestión integral de perfiles de pasajeros, direcciones favoritas e historial de trayectos.
 * Ajuste V16.9: Verificación defensiva e integridad de datos preservada.
 */

import mongoose from 'mongoose';
import Pasajero from '../../models/Pasajero.js';
import Viaje from '../../models/Viaje.js';
import { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js';

/**
 * 📋 Obtener listado de pasajeros (Uso administrativo)
 */
export const obtenerPasajeros = async (req, res) => {
    try {
        const pasajeros = await Pasajero.find().select('-password').lean();
        return res.status(200).json({ success: true, contador: pasajeros.length, data: pasajeros });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 👤 Consulta de Perfil de Pasajero por ID o Token de Sesión
 */
export const obtenerPerfilPasajero = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de pasajero ausente." });
        }

        const pasajero = await Pasajero.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        }).select('-password').lean();

        if (!pasajero) {
            return res.status(404).json({ success: false, message: 'Pasajero no encontrado' });
        }

        return res.status(200).json({ success: true, data: pasajero, pasajero });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🔄 Actualización de Perfil con Sincronización a Firestore
 */
export const actualizarPerfilPasajero = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de pasajero ausente para la actualización." });
        }

        const updateData = { ...req.body };
        delete updateData.password; // Evitar la sobreescritura accidental de la contraseña

        const pasajero = await Pasajero.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ]
            },
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password').lean();

        if (!pasajero) {
            return res.status(404).json({ success: false, message: 'Pasajero no encontrado' });
        }

        // Espejo en Firebase Firestore
        try {
            const docFirestoreId = pasajero.uid || pasajero._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';

            const payloadFs = {};
            if (pasajero.nombre) {
                payloadFs.nombre = pasajero.nombre;
                payloadFs.fullName = pasajero.nombre;
            }
            if (pasajero.telefonoMovil) {
                payloadFs.telefono = pasajero.telefonoMovil;
                payloadFs.telefonoMovil = pasajero.telefonoMovil;
            }

            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set(payloadFs, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ [CIMCO-PASAJERO-SYNC-WARN] Error al replicar actualización en Firestore:", fsErr.message);
        }

        return res.status(200).json({ success: true, message: 'Perfil actualizado con éxito', data: pasajero, pasajero });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 📍 Guardar Dirección Favorita con Replicación a Firestore
 */
export const agregarDireccionFavorita = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        const { alias, direccion, latitud, longitud } = req.body;

        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de pasajero ausente." });
        }

        if (!alias || !direccion || latitud === undefined || longitud === undefined) {
            return res.status(400).json({ success: false, message: "⚠️ Todos los campos de la dirección son requeridos." });
        }

        const nuevaDireccion = {
            alias: String(alias).trim(),
            direccion: String(direccion).trim(),
            coordenadas: { latitud: Number(latitud), longitud: Number(longitud) }
        };

        const pasajero = await Pasajero.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ]
            },
            { $push: { direccionesFavoritas: nuevaDireccion } },
            { new: true }
        ).select('-password').lean();

        if (!pasajero) {
            return res.status(404).json({ success: false, message: 'Pasajero no encontrado' });
        }

        // Espejo del arreglo de direcciones en Firestore
        try {
            const docFirestoreId = pasajero.uid || pasajero._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';

            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set({
                direccionesFavoritas: pasajero.direccionesFavoritas || []
            }, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ Error replicando dirección favorita a Firestore:", fsErr.message);
        }

        return res.status(200).json({ success: true, message: 'Dirección guardada correctamente', data: pasajero });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🗑️ Eliminar Dirección Favorita
 */
export const eliminarDireccionFavorita = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        const { direccionId } = req.params;

        if (!targetId || !direccionId) {
            return res.status(400).json({ success: false, message: "⚠️ Parámetros insuficientes para eliminar la dirección." });
        }

        const pasajero = await Pasajero.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ]
            },
            { $pull: { direccionesFavoritas: { _id: direccionId } } },
            { new: true }
        ).select('-password').lean();

        if (!pasajero) {
            return res.status(404).json({ success: false, message: 'Pasajero no encontrado' });
        }

        // Sincronización del arreglo actualizado en Firestore
        try {
            const docFirestoreId = pasajero.uid || pasajero._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';

            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set({
                direccionesFavoritas: pasajero.direccionesFavoritas || []
            }, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ Error al sincronizar eliminación en Firestore:", fsErr.message);
        }

        return res.status(200).json({ success: true, message: 'Dirección eliminada correctamente', data: pasajero });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 📜 Historial de Viajes del Pasajero
 */
export const obtenerHistorialViajesPasajero = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;

        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de pasajero ausente." });
        }

        const pasajero = await Pasajero.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        });

        const queryId = pasajero ? pasajero._id : targetId;

        const viajes = await Viaje.find({
            $or: [{ pasajeroId: queryId }, { pasajero: queryId }]
        }).sort({ createdAt: -1 }).lean();

        return res.status(200).json({ success: true, contador: viajes.length, data: viajes });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};