// Versión Arquitectura: V16.7 - Controlador de Pasajeros
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\pasajeros\pasajero.controller.js
 * Misión: Gestión integral de perfiles de pasajeros, direcciones favoritas e historial de trayectos.
 */

import mongoose from 'mongoose';
import Pasajero from '../../models/Pasajero.js';
import Viaje from '../../models/Viaje.js';

export const obtenerPasajeros = async (req, res) => {
    try {
        const pasajeros = await Pasajero.find().select('-password').lean();
        return res.status(200).json({ success: true, contador: pasajeros.length, data: pasajeros });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerPerfilPasajero = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid;
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

        return res.status(200).json({ success: true, data: pasajero });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const actualizarPerfilPasajero = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid;
        const updateData = { ...req.body };
        delete updateData.password;

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

        return res.status(200).json({ success: true, message: 'Perfil actualizado con éxito', data: pasajero });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const agregarDireccionFavorita = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid;
        const { alias, direccion, latitud, longitud } = req.body;

        if (!alias || !direccion || latitud === undefined || longitud === undefined) {
            return res.status(400).json({ success: false, message: "⚠️ Todos los campos de la dirección son requeridos." });
        }

        const nuevaDireccion = {
            alias,
            direccion,
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

        return res.status(200).json({ success: true, message: 'Dirección guardada correctamente', data: pasajero });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const obtenerHistorialViajesPasajero = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid;

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